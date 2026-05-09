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
import { recordVoiceLatency } from "@/lib/observability/voice-metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// VOICE_FAST_FIRST_CHUNK=1 enables aggressive sentence-boundary cutoffs:
// - emit on `[.!?:;]` after >=8 chars (default 12)
// - soft-flush at 80 chars on comma/space (default 120)
// Trade-off: shorter first audio chunk vs slightly more chopped prosody.
// Disable (=0 or unset) to fall back to original behaviour with no redeploy.
const FAST_FIRST_CHUNK = process.env.VOICE_FAST_FIRST_CHUNK === "1";
const SENTENCE_MIN_LEN = FAST_FIRST_CHUNK ? 8 : 12;
const SOFT_FLUSH_AT = FAST_FIRST_CHUNK ? 80 : 120;
const SOFT_FLUSH_MIN = FAST_FIRST_CHUNK ? 20 : 30;

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

      const requestId = (globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

      try {
        // Tell client what audio format to expect (PCM int16 LE @ 22050Hz mono)
        send("meta", {
          audio: { format: "pcm_int16le", sampleRate: 22050, channels: 1 },
          requestId,
          fastChunkMode: FAST_FIRST_CHUNK,
        });

        // ── 1. ASR (blocking) ────────────────────────────────────────
        const tAsr = Date.now();
        const asr = await transcribe(audioBuffer, filename, {
          language: "it",
          // Bias the decoder toward common Italian legal/everyday vocabulary.
          // Helps Voxtral resist auto-detecting English on short or noisy clips.
          contextBias: [
            "Sofia", "NormaAI", "avvocato", "consulenza", "contratto",
            "multa", "locazione", "caparra", "sentenza", "cassazione",
            "decreto", "articolo", "ricorso", "denuncia", "buongiorno",
            "ciao", "grazie", "per favore", "dimmi", "scusa",
          ],
        });
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
        // Each sentence pushes PCM int16-LE chunks into the SSE stream.
        // We buffer any odd byte across chunks so each emitted base64 payload
        // contains an integer number of Int16 samples (avoid client misalignment).
        let pcmResidue: Uint8Array = new Uint8Array(0);
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
                // Combine residue + new chunk
                const combined = new Uint8Array(pcmResidue.byteLength + chunk.byteLength);
                combined.set(pcmResidue, 0);
                combined.set(chunk, pcmResidue.byteLength);
                // Emit only the even-byte portion; carry odd byte forward
                const evenLen = combined.byteLength & ~1;
                if (evenLen > 0) {
                  const b64 = Buffer.from(combined.buffer, combined.byteOffset, evenLen).toString("base64");
                  send("audio", { b64 });
                }
                pcmResidue = combined.byteLength > evenLen
                  ? combined.subarray(evenLen)
                  : new Uint8Array(0);
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
            if (m && m[1].length > SENTENCE_MIN_LEN) {
              enqueueTts(m[1]);
              textBuf = textBuf.slice(m[0].length);
            } else if (textBuf.length > SOFT_FLUSH_AT) {
              // soft flush at comma to keep audio flowing on long unpunctuated text
              const cut = textBuf.lastIndexOf(", ");
              if (cut > SOFT_FLUSH_MIN) {
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

        const totalMs = Date.now() - tStart;
        send("done", { fullText, totalMs });

        recordVoiceLatency({
          request_id: requestId,
          ts: Date.now(),
          asr_ms: tLlm - tStart,
          llm_first_token_ms: firstTokenMs ?? -1,
          first_audio_ms: firstAudioMs,
          total_ms: totalMs,
          user_text_len: userText.length,
          full_text_len: fullText.length,
          fast_chunk_mode: FAST_FIRST_CHUNK,
        });

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
