// /api/voice/transcribe — POST audio file → JSON {text, latencyMs, durationSec}
//
// Browser sends a recorded blob via multipart/form-data:
//   const fd = new FormData();
//   fd.append("file", audioBlob, "rec.webm");
//   await fetch("/api/voice/transcribe", { method: "POST", body: fd });
//
// Voxtral Mini Transcribe italiano: ~4s on 9s audio, WER ~0%.

import { NextRequest, NextResponse } from "next/server";
import { transcribe } from "@/lib/asr/voxtral";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel function timeout

export async function POST(req: NextRequest) {
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
  if (file.size > 25_000_000) {
    return NextResponse.json({ error: "file_too_large_25mb" }, { status: 413 });
  }

  const language = (form.get("language") as string | null) ?? "it";
  const diarize = form.get("diarize") === "true";

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const filename =
      file instanceof File ? file.name || "audio.webm" : "audio.webm";
    const result = await transcribe(buf, filename, { language, diarize });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "transcribe_failed" },
      { status: 500 },
    );
  }
}
