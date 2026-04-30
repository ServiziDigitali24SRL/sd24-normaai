// Voxtral ASR — Italian speech-to-text via Mistral AI cloud.
// Pre-GEX44: hits Mistral's hosted Voxtral Mini Transcribe (batch, ~4s on 9s audio, WER ~0%).
// Post-GEX44: swap MISTRAL_BASE_URL to point at self-host Voxtral Mini 3B container.
//
// For realtime streaming (<200ms), use `voxtral-mini-realtime-latest` over WebSocket — TBD.

const API_KEY = process.env.MISTRAL_API_KEY ?? "";
const BASE = process.env.MISTRAL_BASE_URL ?? "https://api.mistral.ai";
const MODEL = process.env.VOXTRAL_MODEL ?? "voxtral-mini-transcribe-2507";

export interface TranscribeOptions {
  language?: string;            // ISO 639-1, e.g. "it"
  diarize?: boolean;            // identify speakers
  timestampGranularity?: "segment" | "word";
  contextBias?: string[];       // domain terms to bias decoding (e.g. legal jargon)
}

export interface TranscribeResult {
  text: string;
  language?: string | null;
  durationSec?: number;
  segments?: unknown[];
  modelUsed: string;
  latencyMs: number;
}

/**
 * Transcribe an audio buffer with Voxtral.
 * @param audio  Buffer/Uint8Array/File — accepts mp3, wav, ogg, m4a, flac, webm
 * @param filename Used as form field filename (mime inferred by Mistral from extension)
 */
export async function transcribe(
  audio: Buffer | Uint8Array | Blob,
  filename = "audio.mp3",
  opts: TranscribeOptions = {},
): Promise<TranscribeResult> {
  if (!API_KEY) throw new Error("voxtral_no_api_key");

  const form = new FormData();
  let blob: Blob;
  if (audio instanceof Blob) {
    blob = audio;
  } else {
    // Copy the Buffer/Uint8Array into a fresh ArrayBuffer for cross-runtime BlobPart compat
    const ab = new ArrayBuffer(audio.byteLength);
    new Uint8Array(ab).set(audio);
    blob = new Blob([ab]);
  }
  form.append("file", blob, filename);
  form.append("model", MODEL);
  if (opts.language) form.append("language", opts.language);
  if (opts.diarize) form.append("diarize", "true");
  if (opts.timestampGranularity) {
    form.append("timestamp_granularities[]", opts.timestampGranularity);
  }
  if (opts.contextBias?.length) {
    for (const t of opts.contextBias) form.append("context_bias[]", t);
  }

  const t0 = Date.now();
  const r = await fetch(`${BASE}/v1/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form,
  });
  const latencyMs = Date.now() - t0;

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`voxtral_${r.status}_${body.slice(0, 200)}`);
  }
  const j = await r.json() as {
    text: string;
    language?: string | null;
    segments?: unknown[];
    usage?: { prompt_audio_seconds?: number };
    model?: string;
  };

  return {
    text: j.text,
    language: j.language ?? null,
    durationSec: j.usage?.prompt_audio_seconds,
    segments: j.segments,
    modelUsed: j.model ?? MODEL,
    latencyMs,
  };
}
