// Voxtral TTS — Italian text-to-speech via Mistral cloud.
//
// Important: Voxtral has no preset Italian voices (only en/fr). For Italian we use
// zero-shot voice cloning by passing a `ref_audio` sample. We persist a default
// reference audio file (Sofia voice) checked into the repo or fetched from a
// public URL — see VOXTRAL_REF_AUDIO_URL.
//
// Latency: ~1.5s for 6s of generated audio. Slower than ElevenLabs (200ms first byte)
// but free of per-minute cost; ideal for non-realtime use (e.g. parere video, async).

const API_KEY = process.env.MISTRAL_API_KEY ?? "";
const BASE = process.env.MISTRAL_BASE_URL ?? "https://api.mistral.ai";
const MODEL = process.env.VOXTRAL_TTS_MODEL ?? "voxtral-mini-tts-latest";
const REF_AUDIO_URL = process.env.VOXTRAL_REF_AUDIO_URL ?? ""; // optional Sofia voice ref

export type TtsFormat = "mp3" | "wav" | "pcm" | "flac" | "opus";

export interface SynthesizeOptions {
  text: string;
  voiceId?: string;          // preset voice id (en/fr only)
  refAudioBase64?: string;   // zero-shot voice cloning sample (mp3/wav)
  format?: TtsFormat;
}

export interface SynthesizeResult {
  audio: Buffer;
  format: TtsFormat;
  latencyMs: number;
}

/**
 * Generate speech from text. Returns raw audio buffer + latency.
 * - For Italian: pass a `refAudioBase64` of an Italian speaker (zero-shot clone).
 * - If neither voiceId nor refAudio is provided and VOXTRAL_REF_AUDIO_URL is set,
 *   the ref is fetched from that URL once per call (cache outside if needed).
 */
export async function synthesize({
  text,
  voiceId,
  refAudioBase64,
  format = "mp3",
}: SynthesizeOptions): Promise<SynthesizeResult> {
  if (!API_KEY) throw new Error("voxtral_no_api_key");

  let refAudio = refAudioBase64;
  if (!voiceId && !refAudio && REF_AUDIO_URL) {
    const r = await fetch(REF_AUDIO_URL);
    if (!r.ok) throw new Error(`voxtral_ref_fetch_${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    refAudio = buf.toString("base64");
  }
  if (!voiceId && !refAudio) {
    throw new Error("voxtral_tts_no_voice_or_ref");
  }

  const body: Record<string, unknown> = {
    input: text,
    model: MODEL,
    response_format: format,
  };
  if (voiceId) body.voice = voiceId;
  if (refAudio) body.ref_audio = refAudio;

  const t0 = Date.now();
  const r = await fetch(`${BASE}/v1/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const latencyMs = Date.now() - t0;

  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`voxtral_tts_${r.status}_${errText.slice(0, 200)}`);
  }
  const j = await r.json() as { audio_data?: string };
  if (!j.audio_data) throw new Error("voxtral_tts_no_audio_data");

  return {
    audio: Buffer.from(j.audio_data, "base64"),
    format,
    latencyMs,
  };
}
