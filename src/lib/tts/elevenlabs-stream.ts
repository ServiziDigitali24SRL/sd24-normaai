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
  /**
   * Output format. Defaults to PCM 22050Hz mono int16-LE for browser-friendly
   * streaming via Web Audio API (no MediaSource codec quirks).
   * Pass "mp3_44100_128" if you need a self-contained MP3 file instead.
   */
  outputFormat?: "pcm_22050" | "pcm_16000" | "pcm_44100" | "mp3_44100_128";
}

export async function* streamSynthesize(opts: StreamSynthesizeOptions): AsyncGenerator<Uint8Array, void, unknown> {
  if (!API_KEY) throw new Error("elevenlabs_no_api_key");

  const voiceId = opts.voiceId ?? DEFAULT_VOICE;
  const model = opts.modelId ?? DEFAULT_MODEL;
  const outputFormat = opts.outputFormat ?? "pcm_22050";
  const accept = outputFormat.startsWith("pcm") ? "audio/pcm" : "audio/mpeg";

  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${outputFormat}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: accept,
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
