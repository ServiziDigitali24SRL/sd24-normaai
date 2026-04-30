// ElevenLabs streaming TTS — yields MP3 chunks as they're produced.
// Uses the /text-to-speech/{voice_id}/stream endpoint with eleven_flash_v2_5 (~75ms TTFB).
//
// Usage:
//   for await (const chunk of streamSynthesize({ text })) { /* push to <audio>/MediaSource */ }

const API_KEY = process.env.ELEVENLABS_API_KEY ?? "";
const DEFAULT_VOICE = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_flash_v2_5";

export interface StreamSynthesizeOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export async function* streamSynthesize(opts: StreamSynthesizeOptions): AsyncGenerator<Uint8Array, void, unknown> {
  if (!API_KEY) throw new Error("elevenlabs_no_api_key");

  const voiceId = opts.voiceId ?? DEFAULT_VOICE;
  const model = opts.modelId ?? DEFAULT_MODEL;

  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
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
        // optimize_streaming_latency: 0..4 (higher = lower latency, lower quality)
        // 3 = aggressive streaming, ~75ms TTFB
        optimize_streaming_latency: 3,
      }),
    },
  );

  if (!r.ok || !r.body) {
    const err = !r.ok ? await r.text() : "no_body";
    throw new Error(`elevenlabs_stream_${r.status}_${err.slice(0, 200)}`);
  }

  const reader = r.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    if (value && value.byteLength > 0) yield value;
  }
}
