// ElevenLabs TTS — fast Italian (multilingual model).
// Uses eleven_flash_v2_5 (~75ms first byte) which speaks Italian with any voice.

const API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL"; // "Sarah"
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_flash_v2_5";

export interface ElevenSynthesizeOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: "mp3_44100_128" | "mp3_44100_64" | "pcm_16000" | "pcm_22050";
}

export interface ElevenSynthesizeResult {
  audio: Buffer;
  format: string;
  latencyMs: number;
}

export async function synthesize(opts: ElevenSynthesizeOptions): Promise<ElevenSynthesizeResult> {
  if (!API_KEY) throw new Error("elevenlabs_no_api_key");

  const voiceId = opts.voiceId ?? DEFAULT_VOICE;
  const model = opts.modelId ?? DEFAULT_MODEL;
  const format = opts.outputFormat ?? "mp3_44100_128";

  const t0 = Date.now();
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${format}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: opts.text,
        model_id: model,
      }),
    },
  );
  const latencyMs = Date.now() - t0;

  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`elevenlabs_${r.status}_${errText.slice(0, 200)}`);
  }
  const ab = await r.arrayBuffer();
  return { audio: Buffer.from(ab), format, latencyMs };
}
