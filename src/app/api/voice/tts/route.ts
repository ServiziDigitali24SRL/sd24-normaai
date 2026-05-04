// /api/voice/tts — POST {text} → audio/mp3 binary stream.
// Uses Voxtral with zero-shot Italian voice cloning if VOXTRAL_REF_AUDIO_URL is set.

import { NextRequest, NextResponse } from "next/server";
import { synthesize } from "@/lib/tts/voxtral";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { text?: string; voiceId?: string; refAudioBase64?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  if (!body.text || body.text.trim().length < 2) {
    return NextResponse.json({ error: "text_too_short" }, { status: 400 });
  }
  if (body.text.length > 5000) {
    return NextResponse.json({ error: "text_too_long_5000" }, { status: 413 });
  }

  try {
    const { audio, format, latencyMs } = await synthesize({
      text: body.text,
      voiceId: body.voiceId,
      refAudioBase64: body.refAudioBase64,
      format: "mp3",
    });
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": format === "mp3" ? "audio/mpeg" : `audio/${format}`,
        "X-Latency-Ms": String(latencyMs),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "tts_failed" },
      { status: 500 },
    );
  }
}
