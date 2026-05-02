// whisper-local.ts — ASR via Whisper-large-v3 self-hosted on GEX44.
//
// Deployment: faster-whisper server with OpenAI-compatible /v1/audio/transcriptions
// reachable via Tailscale at WHISPER_BASE_URL.
//
// Recommended container:
//   docker run -d --gpus all -p 9000:9000 \
//     -e ASR_MODEL=large-v3 -e ASR_ENGINE=faster_whisper \
//     onerahmet/openai-whisper-asr-webservice:latest-gpu
//
// Why over Voxtral cloud:
//   - $0/min vs ~$0.05/min Voxtral cloud → at 5K min/mo = -$250/mo
//   - No audio leaves Hetzner → GDPR strong claim for legal data
//   - Native multilingual: covers all 9 orb languages without per-lang config
//   - WER on Italian: ~2.5% (large-v3) vs ~0% Voxtral but Voxtral was trained
//     specifically on Italian; whisper is general but very close in practice

import type { TranscribeOptions, TranscribeResult } from "./voxtral";

const BASE = process.env.WHISPER_BASE_URL ?? "";
const MODEL_LABEL = process.env.WHISPER_MODEL ?? "whisper-large-v3";

export function whisperLocalEnabled(): boolean {
  return BASE.length > 0 && process.env.WHISPER_LOCAL_ENABLED !== "0";
}

export async function transcribeWhisperLocal(
  audio: Buffer | Uint8Array | Blob,
  filename = "audio.webm",
  opts: TranscribeOptions = {},
): Promise<TranscribeResult> {
  if (!BASE) throw new Error("whisper_no_base_url");

  const form = new FormData();
  let blob: Blob;
  if (audio instanceof Blob) {
    blob = audio;
  } else {
    const ab = new ArrayBuffer(audio.byteLength);
    new Uint8Array(ab).set(audio);
    blob = new Blob([ab]);
  }
  form.append("file", blob, filename);
  // OpenAI-compat field names
  form.append("model", MODEL_LABEL);
  if (opts.language) form.append("language", opts.language);
  // faster-whisper server supports response_format=verbose_json for segments
  form.append("response_format", "verbose_json");

  const t0 = Date.now();
  const r = await fetch(`${BASE}/v1/audio/transcriptions`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const latencyMs = Date.now() - t0;

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`whisper_${r.status}_${body.slice(0, 200)}`);
  }
  const j = (await r.json()) as {
    text: string;
    language?: string | null;
    duration?: number;
    segments?: unknown[];
  };

  return {
    text: j.text,
    language: j.language ?? null,
    durationSec: j.duration,
    segments: j.segments,
    modelUsed: MODEL_LABEL,
    latencyMs,
  };
}
