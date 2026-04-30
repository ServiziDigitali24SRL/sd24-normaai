// /api/voice/chat-stream — voice loop with INCREMENTAL streaming.
//
// Multipart POST: { file (audio), history (json), tts (elevenlabs|voxtral) }
//
// Server side:
//   1. ASR (blocking, Voxtral)         → emits `event: user`
//   2. LLM streaming (Groq)            → buffers tokens; on full sentence (.!?) emits sentence to TTS
//   3. ElevenLabs streaming TTS        → yields MP3 chunks → emits `event: audio` (base64)
//   4. On LLM done                     → flushes remaining text → emits `event: done`
//
// SSE events:
//   user      { text }
//   text      { delta }            // streaming LLM tokens
//   audio     { b64 }              // base64-encoded MP3 chunk
//   timing    { phase, ms }
//   done      { fullText }
//   error     { message }

import { NextRequest } from "next/server";
import { transcribe } from "@/lib/asr/voxtral";
import { streamSynthesize } from "@/lib/tts/elevenlabs-stream";
import { getProvider } from "@/lib/llm/router";
import { SOFIA_VOICE_PROMPT } from "@/app/api/chat/system-prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface HistMsg { role: "user" | "assistant"; content: string }

// Split a token stream into "speakable" fragments. Yields fragments at sentence
// boundaries (.!?) or after a soft cap of 80 chars to keep TTS chunks short.
function* sentenceSplitter(): Generator<string, void, string | undefined> {
  let buf = "";
  while (true) {
    const tok = yield "";
    if (tok === undefined) {
      if (buf.trim()) yield buf;
      return;
    }
    buf += tok;
    // Look for sentence-end markers
    const m = buf.match(/^(.*?[.!?:;])\s+/);
    if (m && m[1].length > 12) {
      yield m[1];
      buf = buf.slice(m[0].length);
    } else if (buf.length > 100) {
      // soft flush at comma or space
      const cut = Math.max(buf.lastIndexOf(", "), buf.lastIndexOf(" "));
      if (cut > 30) {
        yield buf.slice(0, cut + 1);
        buf = buf.slice(cut + 1);
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const tStart = Date.now();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_multipart" }), { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return new Response(JSON.stringify({ error: "missing_file" }), { status: 400 });
  }

  let history: HistMsg[] = [];
  const histRaw = form.get("history") as string | null;
  if (histRaw) {
    try {
      const arr = JSON.parse(histRaw);
      if (Array.isArray(arr)) history = arr.slice(-6);
    } catch { /* ignore */ }
  }

  const audioBuffer = Buffer.from(await file.arrayBuffer());
  const filename = file instanceof File ? file.name || "rec.webm" : "rec.webm";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      try {
        // ── 1. ASR (blocking) ────────────────────────────────────────
        const tAsr = Date.now();
        const asr = await transcribe(audioBuffer, filename, { language: "it" });
        const userText = asr.text;
        send("timing", { phase: "asr", ms: Date.now() - tAsr });
        send("user", { text: userText });
        if (!userText || userText.trim().length < 2) {
          send("error", { message: "no_speech" });
          controller.close();
          return;
        }

        // ── 2+3. LLM streaming → TTS streaming pipeline ─────────────
        const tLlm = Date.now();
        const provider = getProvider("voice");
        const historyBlock = history
          .map((m) => `${m.role === "user" ? "Utente" : "Sofia"}: ${m.content}`)
          .join("\n");
        const userMessage = historyBlock
          ? `${historyBlock}\nUtente: ${userText}`
          : userText;

        // Sentence buffer: collect tokens, emit when boundary hit
        let textBuf = "";
        let fullText = "";
        let firstAudioMs: number | null = null;
        let firstTokenMs: number | null = null;

        // TTS task queue — process sentences serially to preserve audio order.
        // Each sentence pushes audio chunks into the SSE stream as they stream from ElevenLabs.
        let ttsQueue: Promise<void> = Promise.resolve();
        const enqueueTts = (sentence: string) => {
          if (!sentence.trim()) return;
          ttsQueue = ttsQueue.then(async () => {
            try {
              for await (const chunk of streamSynthesize({ text: sentence })) {
                if (firstAudioMs === null) {
                  firstAudioMs = Date.now() - tStart;
                  send("timing", { phase: "first_audio_ms_from_request_start", ms: firstAudioMs });
                }
                // Convert Uint8Array → base64 (Node Buffer)
                const b64 = Buffer.from(chunk).toString("base64");
                send("audio", { b64 });
              }
            } catch (err) {
              send("error", { message: err instanceof Error ? err.message : "tts_chunk_failed" });
            }
          });
        };

        await provider.streamTokens(
          {
            systemPrompt: SOFIA_VOICE_PROMPT,
            userMessage,
            maxTokens: 220,
            temperature: 0.5,
          },
          (tok) => {
            if (firstTokenMs === null) {
              firstTokenMs = Date.now() - tLlm;
              send("timing", { phase: "llm_first_token_ms", ms: firstTokenMs });
            }
            send("text", { delta: tok });
            textBuf += tok;
            fullText += tok;

            // Look for a complete sentence boundary
            const m = textBuf.match(/^(.*?[.!?:;])(\s+|$)/);
            if (m && m[1].length > 12) {
              enqueueTts(m[1]);
              textBuf = textBuf.slice(m[0].length);
            } else if (textBuf.length > 120) {
              // soft flush at comma to keep audio flowing on long unpunctuated text
              const cut = textBuf.lastIndexOf(", ");
              if (cut > 30) {
                enqueueTts(textBuf.slice(0, cut + 1));
                textBuf = textBuf.slice(cut + 1);
              }
            }
          },
        );

        // Flush remaining text after LLM done
        if (textBuf.trim()) enqueueTts(textBuf);
        send("timing", { phase: "llm_total_ms", ms: Date.now() - tLlm });

        // Wait for all TTS chunks to flush
        await ttsQueue;

        send("done", { fullText, totalMs: Date.now() - tStart });
        controller.close();
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "stream_failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
