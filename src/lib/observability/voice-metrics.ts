// Single-line structured log of voice request latencies.
// Parsed by orchestrator/squadrons/agents/latency/voice.py (megabuild) to
// compute rolling P50/P95 and alert when P50 > 800ms (target SER-163).

export interface VoiceLatencyRecord {
  request_id: string;
  ts: number;
  asr_ms: number;
  llm_first_token_ms: number;
  first_audio_ms: number | null;
  total_ms: number;
  user_text_len: number;
  full_text_len: number;
  fast_chunk_mode: boolean;
}

export function recordVoiceLatency(r: VoiceLatencyRecord): void {
  console.log(JSON.stringify({ tag: "voice-latency", ...r }));
}
