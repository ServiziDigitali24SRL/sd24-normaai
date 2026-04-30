"use client";

// Mobile voice agent — conversational mode.
// One "Start" button; afterwards the conversation runs hands-free:
//   - Silero VAD listens continuously
//   - On speech end, audio is sent to /api/voice/chat-stream
//   - Sofia's audio streams back via MediaSource and starts playing within ~800ms
//   - If the user speaks while Sofia is talking, audio is paused (interruption)
//   - Loop until "End"

import { useEffect, useRef, useState } from "react";

type Mode = "idle" | "listening" | "user-speaking" | "thinking" | "sofia-speaking" | "error";

interface Turn { user: string; sofia: string }

export default function MobileVoicePage() {
  const [mode, setMode] = useState<Mode>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [partialUser, setPartialUser] = useState("");
  const [partialSofia, setPartialSofia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<{ asr?: number; firstAudio?: number; llmFirst?: number } | null>(null);

  const vadRef = useRef<{ destroy: () => void; pause: () => void; start: () => void } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);     // when to schedule next AudioBufferSourceNode
  const sampleRateRef = useRef<number>(22050);
  const scheduledNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { turnsRef.current = turns; }, [turns]);

  async function start() {
    setError(null);
    try {
      // Init AudioContext on user gesture (required by autoplay policy)
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      gain.connect(ctx.destination);
      audioGainRef.current = gain;

      // Dynamic import — vad-web uses workers + onnxruntime, must be client-side
      const { MicVAD } = await import("@ricky0123/vad-web");

      const vad = await MicVAD.new({
        // Self-host VAD worklet, Silero ONNX, and ORT wasm under /vad/
        baseAssetPath: "/vad/",
        onnxWASMBasePath: "/vad/",
        // Sensitivity tuning — tolerate 1.8s pause within a sentence
        positiveSpeechThreshold: 0.55,
        negativeSpeechThreshold: 0.35,
        minSpeechMs: 250,          // ≥250ms speech to consider real
        redemptionMs: 1800,        // 1.8s silence before considering speech ended
        preSpeechPadMs: 200,       // 200ms padding before speech start
        onSpeechStart: () => onSpeechStart(),
        onSpeechEnd: (audio) => onSpeechEnd(audio),
      });
      vadRef.current = vad;
      vad.start();
      setMode("listening");
    } catch (e) {
      setError(`vad_init_failed: ${e instanceof Error ? e.message : "unknown"}`);
      setMode("error");
    }
  }

  function stop() {
    abortRef.current?.abort();
    stopAllScheduledAudio();
    vadRef.current?.destroy();
    vadRef.current = null;
    audioCtxRef.current?.close().catch(() => { /* ignore */ });
    audioCtxRef.current = null;
    setMode("idle");
  }

  function stopAllScheduledAudio() {
    for (const n of scheduledNodesRef.current) {
      try { n.stop(); } catch { /* ignore */ }
    }
    scheduledNodesRef.current = [];
    nextStartTimeRef.current = 0;
  }

  function onSpeechStart() {
    // User started talking — interrupt Sofia if she's speaking
    stopAllScheduledAudio();
    abortRef.current?.abort();
    setMode("user-speaking");
    setPartialSofia("");
  }

  async function onSpeechEnd(audioFloat32: Float32Array) {
    setMode("thinking");
    setPartialUser("");

    // Reset audio scheduling for this turn
    nextStartTimeRef.current = 0;
    scheduledNodesRef.current = [];

    // Encode Float32 PCM (16kHz mono from VAD) → WAV bytes
    const wavBuf = pcmToWav(audioFloat32, 16000);

    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(wavBuf)], { type: "audio/wav" }), "rec.wav");
    fd.append("history", JSON.stringify(
      turnsRef.current.flatMap(t => [
        { role: "user", content: t.user },
        { role: "assistant", content: t.sofia },
      ]),
    ));

    const ac = new AbortController();
    abortRef.current = ac;
    let userText = "";
    let sofiaText = "";
    const localLatency: { asr?: number; firstAudio?: number; llmFirst?: number } = {};
    let played = false;

    try {
      const res = await fetch("/api/voice/chat-stream", {
        method: "POST",
        body: fd,
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(`http_${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const ev = part.match(/^event:\s*(.+)$/m)?.[1];
          const data = part.match(/^data:\s*(.+)$/m)?.[1];
          if (!ev || !data) continue;
          let payload: Record<string, unknown>;
          try { payload = JSON.parse(data); } catch { continue; }

          if (ev === "meta") {
            const sr = (payload.audio as { sampleRate?: number })?.sampleRate;
            if (sr) sampleRateRef.current = sr;
          } else if (ev === "user") {
            userText = String(payload.text ?? "");
            setPartialUser(userText);
          } else if (ev === "text") {
            sofiaText += String(payload.delta ?? "");
            setPartialSofia(sofiaText);
          } else if (ev === "audio") {
            const b64 = String(payload.b64 ?? "");
            schedulePcmChunk(b64);
            if (!played) {
              played = true;
              setMode("sofia-speaking");
            }
          } else if (ev === "timing") {
            const phase = String(payload.phase);
            const ms = Number(payload.ms);
            if (phase === "asr") localLatency.asr = ms;
            if (phase === "llm_first_token_ms") localLatency.llmFirst = ms;
            if (phase === "first_audio_ms_from_request_start") localLatency.firstAudio = ms;
            setLatency({ ...localLatency });
          } else if (ev === "error") {
            throw new Error(String(payload.message ?? "stream_error"));
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "fetch_failed");
      setMode("listening");
      return;
    }

    if (userText && sofiaText) {
      setTurns(t => [...t, { user: userText, sofia: sofiaText }]);
    }
    setPartialUser("");
    setPartialSofia("");

    // Schedule "back to listening" when last audio finishes
    const ctx = audioCtxRef.current;
    const lastEnd = nextStartTimeRef.current;
    if (ctx && played && lastEnd > ctx.currentTime) {
      const remainingMs = (lastEnd - ctx.currentTime) * 1000;
      setTimeout(() => setMode("listening"), Math.max(0, remainingMs));
    } else {
      setMode("listening");
    }
  }

  // Decode base64 → Int16 PCM → Float32 → schedule on the AudioContext timeline.
  // Each chunk is appended right after the previous so playback is gapless.
  function schedulePcmChunk(b64: string) {
    const ctx = audioCtxRef.current;
    const gain = audioGainRef.current;
    if (!ctx || !gain) return;

    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    if (u8.byteLength < 2) return;

    // Int16LE → Float32 in [-1, 1]
    const i16 = new Int16Array(u8.buffer, u8.byteOffset, u8.byteLength >> 1);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x8000;

    const sr = sampleRateRef.current;
    const buf = ctx.createBuffer(1, f32.length, sr);
    buf.getChannelData(0).set(f32);

    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.connect(gain);

    const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
    node.start(startAt);
    nextStartTimeRef.current = startAt + buf.duration;
    scheduledNodesRef.current.push(node);
    node.onended = () => {
      scheduledNodesRef.current = scheduledNodesRef.current.filter(n => n !== node);
    };
  }

  // ── UI ──
  const isOn = mode !== "idle" && mode !== "error";

  return (
    <main style={{
      minHeight: "100dvh",
      background: "var(--paper, #FDFBF7)",
      padding: "32px 20px",
      fontFamily: "var(--sans)",
      maxWidth: 480, margin: "0 auto",
      display: "flex", flexDirection: "column",
    }}>
      <header style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
          textTransform: "uppercase", color: "var(--ink-3)",
        }}>
          NormaAI · voce
        </div>
        <h1 style={{
          fontFamily: "var(--serif)", fontSize: 24, color: "var(--ink-1)",
          margin: "6px 0 0", fontWeight: 500,
        }}>
          Sofia
        </h1>
      </header>

      {/* Status orb */}
      <section style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        marginBottom: 32, height: 180,
      }}>
        <div style={{
          width: 140, height: 140, borderRadius: "50%",
          background: orbColor(mode),
          boxShadow: orbShadow(mode),
          transition: "all 0.3s ease",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          color: "white",
          fontFamily: "var(--mono)", fontSize: 11,
          letterSpacing: "0.15em", textTransform: "uppercase",
        }}>
          <span>{labelFor(mode)}</span>
        </div>
      </section>

      {/* Live partial transcripts */}
      {(partialUser || partialSofia) && (
        <section style={{
          background: "white", border: "1px solid var(--paper-line, #E8E0D2)",
          borderRadius: 8, padding: 16, marginBottom: 16, minHeight: 40,
        }}>
          {partialUser && (
            <p style={{ fontSize: 14, color: "var(--ink-1)", margin: 0 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)" }}>
                Tu:
              </span> {partialUser}
            </p>
          )}
          {partialSofia && (
            <p style={{ fontSize: 14, color: "var(--ink-1)", margin: "8px 0 0",
              fontFamily: "var(--serif)", lineHeight: 1.4 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--vermiglio, #C93924)" }}>
                Sofia:
              </span> {partialSofia}
            </p>
          )}
        </section>
      )}

      {/* History */}
      {turns.length > 0 && (
        <section style={{ marginBottom: 16, fontSize: 13, color: "var(--ink-2)" }}>
          {turns.slice(-3).map((t, i) => (
            <div key={i} style={{ marginBottom: 12, paddingBottom: 12,
              borderBottom: "1px solid var(--paper-line, #E8E0D2)" }}>
              <p style={{ margin: 0, opacity: 0.7 }}>Tu: {t.user}</p>
              <p style={{ margin: "4px 0 0", fontFamily: "var(--serif)" }}>Sofia: {t.sofia}</p>
            </div>
          ))}
        </section>
      )}

      {/* Latency badges */}
      {latency && (
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)",
          display: "flex", gap: 10, justifyContent: "center", marginBottom: 16,
        }}>
          {latency.asr != null && <span>ASR {latency.asr}ms</span>}
          {latency.llmFirst != null && <span>LLM·1st {latency.llmFirst}ms</span>}
          {latency.firstAudio != null && (
            <span>1° audio <strong style={{ color: "var(--vermiglio, #C93924)" }}>{latency.firstAudio}ms</strong></span>
          )}
        </div>
      )}

      {/* Single button */}
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "center" }}>
        {!isOn ? (
          <button
            onClick={start}
            style={{
              padding: "16px 32px", fontSize: 16, fontWeight: 600,
              borderRadius: 999, border: "none",
              background: "var(--vermiglio, #C93924)", color: "white",
              cursor: "pointer", minWidth: 240,
            }}
          >
            Inizia conversazione
          </button>
        ) : (
          <button
            onClick={stop}
            style={{
              padding: "12px 24px", fontSize: 14, fontWeight: 600,
              borderRadius: 999, border: "1px solid var(--paper-line, #E8E0D2)",
              background: "white", color: "var(--ink-2)",
              cursor: "pointer",
            }}
          >
            Termina
          </button>
        )}
      </div>

      {error && (
        <p style={{
          color: "var(--red-error, #B43B25)", fontSize: 12,
          marginTop: 16, textAlign: "center",
        }}>
          {error}
        </p>
      )}

    </main>
  );
}

function orbColor(mode: Mode): string {
  switch (mode) {
    case "idle":           return "#C9C2B5";
    case "listening":      return "linear-gradient(135deg, #2F5D3A, #4A8359)";
    case "user-speaking":  return "linear-gradient(135deg, #C93924, #E55538)";
    case "thinking":       return "linear-gradient(135deg, #B8860B, #D4A017)";
    case "sofia-speaking": return "linear-gradient(135deg, #1F3A6B, #3D5BA8)";
    case "error":          return "#8B3A2F";
  }
}
function orbShadow(mode: Mode): string {
  if (mode === "user-speaking") return "0 0 60px rgba(201,57,36,0.6), 0 8px 24px rgba(0,0,0,0.15)";
  if (mode === "sofia-speaking") return "0 0 60px rgba(61,91,168,0.6), 0 8px 24px rgba(0,0,0,0.15)";
  if (mode === "listening") return "0 0 30px rgba(74,131,89,0.4), 0 8px 24px rgba(0,0,0,0.1)";
  return "0 8px 24px rgba(0,0,0,0.1)";
}
function labelFor(mode: Mode): string {
  switch (mode) {
    case "idle":           return "Pronto";
    case "listening":      return "In ascolto";
    case "user-speaking":  return "Stai parlando";
    case "thinking":       return "Sofia pensa";
    case "sofia-speaking": return "Sofia parla";
    case "error":          return "Errore";
  }
}

// Encode mono float32 PCM → 16-bit WAV bytes (RIFF header + data)
function pcmToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const len = samples.length;
  const buffer = new ArrayBuffer(44 + len * 2);
  const view = new DataView(buffer);
  let off = 0;
  const writeStr = (s: string) => { for (const c of s) view.setUint8(off++, c.charCodeAt(0)); };
  writeStr("RIFF");
  view.setUint32(off, 36 + len * 2, true); off += 4;
  writeStr("WAVEfmt ");
  view.setUint32(off, 16, true); off += 4;
  view.setUint16(off, 1, true); off += 2;          // PCM
  view.setUint16(off, 1, true); off += 2;          // mono
  view.setUint32(off, sampleRate, true); off += 4;
  view.setUint32(off, sampleRate * 2, true); off += 4;
  view.setUint16(off, 2, true); off += 2;
  view.setUint16(off, 16, true); off += 2;
  writeStr("data");
  view.setUint32(off, len * 2, true); off += 4;
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return buffer;
}
