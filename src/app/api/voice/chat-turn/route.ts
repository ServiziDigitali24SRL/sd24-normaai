// /api/voice/chat-turn — voice loop orchestrator (ASR → LLM → TTS).
//
// POST multipart:
//   - file:     audio webm/mp3 of user speech
//   - history:  optional JSON array of previous {role, content}
//   - tts:      "voxtral" | "elevenlabs" (default: elevenlabs)
//
// Response: JSON
//   {
//     userText, assistantText,
//     audioBase64, audioFormat,
//     timings: { asrMs, llmMs, ttsMs, totalMs },
//     ttsProvider
//   }

import { NextRequest, NextResponse } from "next/server";
import { transcribe } from "@/lib/asr/voxtral";
import { synthesize as ttsVoxtral } from "@/lib/tts/voxtral";
import { synthesize as ttsEleven } from "@/lib/tts/elevenlabs";
import { getProvider } from "@/lib/llm/router";
import { SOFIA_VOICE_PROMPT } from "@/app/api/chat/system-prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface HistMsg { role: "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
  const tStart = Date.now();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_multipart" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const ttsProvider = (form.get("tts") as string) === "voxtral" ? "voxtral" : "elevenlabs";

  // Optional convo history from client
  let history: HistMsg[] = [];
  const histRaw = form.get("history") as string | null;
  if (histRaw) {
    try {
      const arr = JSON.parse(histRaw);
      if (Array.isArray(arr)) history = arr.slice(-6); // keep last 6 turns
    } catch { /* ignore */ }
  }

  try {
    // ── 1. ASR ────────────────────────────────────────────────────────
    const tAsr0 = Date.now();
    const buf = Buffer.from(await file.arrayBuffer());
    const filename = file instanceof File ? file.name || "rec.webm" : "rec.webm";
    const asr = await transcribe(buf, filename, { language: "it" });
    const asrMs = Date.now() - tAsr0;
    const userText = asr.text;

    if (!userText || userText.trim().length < 2) {
      return NextResponse.json({ error: "no_speech_detected", userText }, { status: 422 });
    }

    // ── 2. LLM ────────────────────────────────────────────────────────
    const tLlm0 = Date.now();
    const provider = getProvider("voice");
    const historyBlock = history
      .map((m) => `${m.role === "user" ? "Utente" : "Sofia"}: ${m.content}`)
      .join("\n");
    const userMessage = historyBlock
      ? `${historyBlock}\nUtente: ${userText}`
      : userText;
    const assistantText = await provider.complete({
      systemPrompt: SOFIA_VOICE_PROMPT,
      userMessage,
      maxTokens: 220,
      temperature: 0.5,
    });
    const llmMs = Date.now() - tLlm0;

    if (!assistantText || assistantText.trim().length < 1) {
      return NextResponse.json(
        { error: "llm_empty_response", userText },
        { status: 502 },
      );
    }

    // ── 3. TTS ────────────────────────────────────────────────────────
    const tTts0 = Date.now();
    let audioBuf: Buffer;
    let audioFormat = "audio/mpeg";
    if (ttsProvider === "voxtral") {
      const r = await ttsVoxtral({ text: assistantText, format: "mp3" });
      audioBuf = r.audio;
    } else {
      const r = await ttsEleven({ text: assistantText });
      audioBuf = r.audio;
    }
    const ttsMs = Date.now() - tTts0;

    return NextResponse.json({
      userText,
      assistantText,
      audioBase64: audioBuf.toString("base64"),
      audioFormat,
      ttsProvider,
      timings: {
        asrMs,
        llmMs,
        ttsMs,
        totalMs: Date.now() - tStart,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "chat_turn_failed" },
      { status: 500 },
    );
  }
}
