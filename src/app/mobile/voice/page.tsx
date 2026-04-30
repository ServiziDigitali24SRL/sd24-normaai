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
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const turnsRef = useRef<Turn[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { turnsRef.current = turns; }, [turns]);

  async function start() {
    setError(null);
    try {
      // Dynamic import — vad-web uses workers + onnxruntime, must be client-side
      const { MicVAD } = await import("@ricky0123/vad-web");

      const vad = await MicVAD.new({
        // Load worklet + Silero ONNX model from CDN (avoid Next.js bundle issues)
        baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/",
        onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/",
        // Sensitivity tuning for mobile mic + Italian speech
        positiveSpeechThreshold: 0.55,
        negativeSpeechThreshold: 0.35,
        minSpeechMs: 250,          // ≥250ms speech to consider real
        redemptionMs: 700,         // 700ms silence before speech end
        preSpeechPadMs: 100,       // 100ms padding before speech start
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
    vadRef.current?.destroy();
    vadRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
    }
    setMode("idle");
  }

  function onSpeechStart() {
    // User started talking — interrupt Sofia if she's speaking
    if (audioElRef.current && !audioElRef.current.paused) {
      audioElRef.current.pause();
    }
    abortRef.current?.abort();
    setMode("user-speaking");
    setPartialSofia("");
  }

  async function onSpeechEnd(audioFloat32: Float32Array) {
    setMode("thinking");
    setPartialUser("");
    // Encode Float32 PCM (16kHz mono from VAD) → WAV bytes
    const wavBuf = pcmToWav(audioFloat32, 16000);

    // Set up MediaSource for streamed audio playback
    const ms = new MediaSource();
    mediaSourceRef.current = ms;
    audioQueueRef.current = [];
    if (audioElRef.current) audioElRef.current.src = URL.createObjectURL(ms);

    ms.addEventListener("sourceopen", () => {
      try {
        const sb = ms.addSourceBuffer("audio/mpeg");
        sourceBufferRef.current = sb;
        sb.addEventListener("updateend", flushQueue);
        flushQueue();
      } catch (e) {
        setError(`mediasource_${e instanceof Error ? e.message : "unknown"}`);
      }
    });

    // POST to streaming SSE endpoint
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

        // Split SSE messages
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const ev = part.match(/^event:\s*(.+)$/m)?.[1];
          const data = part.match(/^data:\s*(.+)$/m)?.[1];
          if (!ev || !data) continue;
          let payload: Record<string, unknown>;
          try { payload = JSON.parse(data); } catch { continue; }

          if (ev === "user") {
            userText = String(payload.text ?? "");
            setPartialUser(userText);
          } else if (ev === "text") {
            sofiaText += String(payload.delta ?? "");
            setPartialSofia(sofiaText);
          } else if (ev === "audio") {
            const b64 = String(payload.b64 ?? "");
            const bin = atob(b64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            audioQueueRef.current.push(arr);
            flushQueue();
            if (!played && audioElRef.current) {
              played = true;
              setMode("sofia-speaking");
              audioElRef.current.play().catch(() => { /* user gesture? */ });
            }
          } else if (ev === "timing") {
            const phase = String(payload.phase);
            const ms = Number(payload.ms);
            if (phase === "asr") localLatency.asr = ms;
            if (phase === "llm_first_token_ms") localLatency.llmFirst = ms;
            if (phase === "first_audio_ms_from_request_start") localLatency.firstAudio = ms;
            setLatency({ ...localLatency });
          } else if (ev === "done") {
            // Mark MediaSource end of stream
            try {
              if (mediaSourceRef.current?.readyState === "open") {
                if (sourceBufferRef.current?.updating) {
                  sourceBufferRef.current.addEventListener("updateend",
                    () => mediaSourceRef.current?.endOfStream(), { once: true });
                } else {
                  mediaSourceRef.current.endOfStream();
                }
              }
            } catch { /* ignore */ }
          } else if (ev === "error") {
            throw new Error(String(payload.message ?? "stream_error"));
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "fetch_failed");
      setMode("listening");
    }

    // Save final transcript
    if (userText && sofiaText) {
      setTurns(t => [...t, { user: userText, sofia: sofiaText }]);
    }
    setPartialUser("");
    setPartialSofia("");

    // When audio finishes, return to listening
    audioElRef.current?.addEventListener("ended", () => setMode("listening"), { once: true });
    if (!played) setMode("listening");
  }

  function flushQueue() {
    const sb = sourceBufferRef.current;
    if (!sb || sb.updating) return;
    const next = audioQueueRef.current.shift();
    if (!next) return;
    try {
      sb.appendBuffer(new Uint8Array(next));
    } catch (e) {
      setError(`appendbuffer_${e instanceof Error ? e.message : "unknown"}`);
    }
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

      <audio ref={audioElRef} hidden />
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
