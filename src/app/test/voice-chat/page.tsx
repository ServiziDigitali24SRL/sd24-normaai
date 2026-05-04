"use client";

// Voice chat loop demo — record → ASR → LLM → TTS → autoplay.
// Switchable TTS provider (Voxtral cloning vs ElevenLabs Flash).

import { useEffect, useRef, useState } from "react";

type TtsProvider = "elevenlabs" | "voxtral";
type Phase = "idle" | "recording" | "processing" | "playing" | "error";

interface Turn {
  user: string;
  assistant: string;
  timings: { asrMs: number; llmMs: number; ttsMs: number; totalMs: number };
  ttsProvider: TtsProvider;
  audioUrl: string;
}

export default function VoiceChatPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [recElapsed, setRecElapsed] = useState(0);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>("elevenlabs");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartedRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    mrRef.current?.stream.getTracks().forEach(t => t.stop());
  }, []);

  async function startRec() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = handleStop;
      mr.start();
      mrRef.current = mr;
      recStartedRef.current = Date.now();
      setRecElapsed(0);
      setPhase("recording");
      tickRef.current = setInterval(
        () => setRecElapsed(Math.floor((Date.now() - recStartedRef.current) / 1000)),
        300,
      );
    } catch (e) {
      setError(`mic_denied: ${e instanceof Error ? e.message : "unknown"}`);
      setPhase("error");
    }
  }

  function stopRec() {
    if (tickRef.current) clearInterval(tickRef.current);
    mrRef.current?.stop();
    mrRef.current?.stream.getTracks().forEach(t => t.stop());
  }

  async function handleStop() {
    setPhase("processing");
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });

    try {
      const fd = new FormData();
      fd.append("file", blob, "rec.webm");
      fd.append("tts", ttsProvider);
      fd.append("history", JSON.stringify(
        turns.flatMap(t => [
          { role: "user", content: t.user },
          { role: "assistant", content: t.assistant },
        ]),
      ));

      const r = await fetch("/api/voice/chat-turn", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `http_${r.status}`);

      // Decode base64 → Blob → URL
      const bin = atob(j.audioBase64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const audioBlob = new Blob([arr], { type: j.audioFormat ?? "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const turn: Turn = {
        user: j.userText,
        assistant: j.assistantText,
        timings: j.timings,
        ttsProvider: j.ttsProvider,
        audioUrl,
      };
      setTurns(t => [...t, turn]);
      setPhase("playing");
      // autoplay
      setTimeout(() => audioRef.current?.play().catch(() => { /* ignore */ }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setPhase("error");
    }
  }

  const lastTurn = turns[turns.length - 1];

  return (
    <main style={{
      minHeight: "100dvh", background: "var(--paper, #FDFBF7)",
      padding: "32px 24px", fontFamily: "var(--sans)", maxWidth: 760, margin: "0 auto",
    }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
          textTransform: "uppercase", color: "var(--ink-3)",
        }}>
          Test · Voice loop end-to-end
        </div>
        <h1 style={{
          fontFamily: "var(--serif)", fontSize: 28, color: "var(--ink-1)",
          margin: "6px 0 0", fontWeight: 500,
        }}>
          Conversa con Sofia
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>
          Voxtral ASR · Groq llama-3.3-70b · TTS selezionabile.
        </p>
      </header>

      <section style={{ marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
          TTS:
        </span>
        {(["elevenlabs", "voxtral"] as TtsProvider[]).map(p => (
          <button
            key={p}
            onClick={() => setTtsProvider(p)}
            disabled={phase === "recording" || phase === "processing"}
            style={{
              padding: "6px 12px", borderRadius: 999,
              border: "1px solid var(--paper-line, #E8E0D2)",
              background: ttsProvider === p ? "var(--vermiglio, #C93924)" : "white",
              color: ttsProvider === p ? "white" : "var(--ink-2)",
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
              letterSpacing: "0.13em", textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {p === "elevenlabs" ? "ElevenLabs" : "Voxtral"}
          </button>
        ))}
      </section>

      <section style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        {phase !== "recording" ? (
          <button
            onClick={startRec}
            disabled={phase === "processing"}
            style={{
              padding: "12px 22px", borderRadius: 8,
              background: "var(--vermiglio, #C93924)", color: "white",
              border: "none", fontSize: 14, fontWeight: 600,
              cursor: phase === "processing" ? "wait" : "pointer",
              opacity: phase === "processing" ? 0.6 : 1,
            }}
          >
            {phase === "processing" ? "Sofia sta pensando…" : "● Parla"}
          </button>
        ) : (
          <button
            onClick={stopRec}
            style={{
              padding: "12px 22px", borderRadius: 8,
              background: "var(--ink-1, #1a1a1a)", color: "white",
              border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            ■ Stop · {recElapsed}s
          </button>
        )}
        {phase === "recording" && (
          <span style={{
            display: "inline-block", width: 10, height: 10, borderRadius: "50%",
            background: "var(--vermiglio, #C93924)",
            animation: "pulse 1s ease-in-out infinite",
          }} />
        )}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </section>

      {error && (
        <p style={{ color: "var(--red-error, #B43B25)", fontSize: 13 }}>
          Errore: {error}
        </p>
      )}

      {lastTurn && (
        <section style={{ marginBottom: 24 }}>
          <audio ref={audioRef} src={lastTurn.audioUrl} controls
            style={{ width: "100%", marginBottom: 8 }} />
          <div style={{
            fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)",
            display: "flex", gap: 12, flexWrap: "wrap",
          }}>
            <span>ASR: <strong>{lastTurn.timings.asrMs}ms</strong></span>
            <span>LLM: <strong>{lastTurn.timings.llmMs}ms</strong></span>
            <span>TTS ({lastTurn.ttsProvider}): <strong>{lastTurn.timings.ttsMs}ms</strong></span>
            <span>Totale: <strong style={{ color: "var(--vermiglio, #C93924)" }}>
              {lastTurn.timings.totalMs}ms
            </strong></span>
          </div>
        </section>
      )}

      {turns.length > 0 && (
        <section style={{
          background: "white",
          border: "1px solid var(--paper-line, #E8E0D2)",
          borderRadius: 8, padding: 20,
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
            textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12,
          }}>
            Trascrizione conversazione
          </div>
          {turns.map((t, i) => (
            <div key={i} style={{ marginBottom: 16, paddingBottom: 16,
              borderBottom: i < turns.length - 1 ? "1px solid var(--paper-line, #E8E0D2)" : "none" }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>Tu</span>
                <p style={{ fontSize: 14, color: "var(--ink-1)", margin: "2px 0", lineHeight: 1.5 }}>
                  {t.user}
                </p>
              </div>
              <div>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10, color: "var(--vermiglio, #C93924)",
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>Sofia</span>
                <p style={{ fontSize: 14, color: "var(--ink-1)", margin: "2px 0",
                  lineHeight: 1.5, fontFamily: "var(--serif)" }}>
                  {t.assistant}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
