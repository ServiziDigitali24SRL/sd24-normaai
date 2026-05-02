// asr/router.ts — choose the right ASR backend per request.
//
// Priority:
//   1. Whisper-large-v3 on GEX44 (free, GDPR-internal)         → if configured
//   2. Voxtral Mistral cloud (fallback, paid, very high quality IT)
//
// The router itself has the same interface as `voxtral.transcribe()` so
// existing callers don't need to change.

import { transcribe as voxtralTranscribe } from "./voxtral";
import {
  transcribeWhisperLocal,
  whisperLocalEnabled,
} from "./whisper-local";
import type { TranscribeOptions, TranscribeResult } from "./voxtral";

export type AsrBackend = "whisper-local" | "voxtral";

export interface TranscribeRouted extends TranscribeResult {
  backend: AsrBackend;
}

export async function transcribe(
  audio: Buffer | Uint8Array | Blob,
  filename = "audio.webm",
  opts: TranscribeOptions = {},
): Promise<TranscribeRouted> {
  // Prefer local Whisper if configured. On any failure (model loading,
  // 5xx, timeout) we fall back to Voxtral cloud — never lose a request.
  if (whisperLocalEnabled()) {
    try {
      const out = await transcribeWhisperLocal(audio, filename, opts);
      return { ...out, backend: "whisper-local" };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[asr] whisper-local failed, falling back to Voxtral", err);
    }
  }

  const out = await voxtralTranscribe(audio, filename, opts);
  return { ...out, backend: "voxtral" };
}
