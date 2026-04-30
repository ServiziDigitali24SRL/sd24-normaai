"use client";

// Test page — record voice in browser, send to Voxtral, see transcript + latency.

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "recording" | "uploading" | "transcribing" | "done" | "error";

interface Result {
  text: string;
  latencyMs: number;
  durationSec?: number;
  modelUsed: string;
  language?: string | null;
}

export default function TestAsrPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function startRecording() {
    setError(null); setResult(null); setAudioUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = handleStop;
      mr.start();
      mediaRecorderRef.current = mr;
      setPhase("recording");
      startedRef.current = Date.now();
      setElapsedSec(0);
      tickRef.current = setInterval(() =>
        setElapsedSec(Math.floor((Date.now() - startedRef.current) / 1000)),
      300);
    } catch (e) {
      setError(`mic_denied: ${e instanceof Error ? e.message : "unknown"}`);
      setPhase("error");
    }
  }

  function stopRecording() {
    if (tickRef.current) clearInterval(tickRef.current);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
  }

  async function handleStop() {
    setPhase("uploading");
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    setAudioUrl(URL.createObjectURL(blob));

    try {
      const fd = new FormData();
      fd.append("file", blob, "rec.webm");
      fd.append("language", "it");
      setPhase("transcribing");
      const r = await fetch("/api/voice/transcribe", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `http_${r.status}`);
      setResult(j);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setPhase("error");
    }
  }

  const isBusy = phase === "uploading" || phase === "transcribing";

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
          Test · Voxtral ASR
        </div>
        <h1 style={{
          fontFamily: "var(--serif)", fontSize: 28, color: "var(--ink-1)",
          margin: "6px 0 0", fontWeight: 500,
        }}>
          Trascrizione vocale italiana
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>
          Premi <strong>Registra</strong>, parla in italiano, premi <strong>Stop</strong>.
          Il modello <code style={{ background: "var(--paper-tint, #F8F4ED)", padding: "1px 5px", borderRadius: 3 }}>
            voxtral-mini-transcribe-2507
          </code> trascrive in ~4s su 9s di audio.
        </p>
      </header>

      <section style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
        {phase !== "recording" ? (
          <button
            onClick={startRecording}
            disabled={isBusy}
            style={{
              padding: "12px 22px", borderRadius: 8,
              background: "var(--vermiglio, #C93924)", color: "white",
              border: "none", fontSize: 14, fontWeight: 600,
              cursor: isBusy ? "wait" : "pointer", opacity: isBusy ? 0.6 : 1,
            }}
          >
            {isBusy ? "Elaborazione…" : "● Registra"}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            style={{
              padding: "12px 22px", borderRadius: 8,
              background: "var(--ink-1, #1a1a1a)", color: "white",
              border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            ■ Stop · {elapsedSec}s
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

      {audioUrl && (
        <section style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
            textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6,
          }}>
            Audio registrato
          </div>
          <audio src={audioUrl} controls style={{ width: "100%" }} />
        </section>
      )}

      {phase === "transcribing" && (
        <p style={{ color: "var(--ink-3)", fontSize: 13 }}>
          Trascrizione in corso (Voxtral Mini)…
        </p>
      )}

      {result && (
        <section style={{
          background: "white",
          border: "1px solid var(--paper-line, #E8E0D2)",
          borderRadius: 8, padding: 20, marginBottom: 16,
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
            textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8,
          }}>
            Trascrizione
          </div>
          <p style={{
            fontSize: 16, color: "var(--ink-1)", lineHeight: 1.5,
            fontFamily: "var(--serif)",
          }}>
            {result.text}
          </p>
          <div style={{
            display: "flex", gap: 16, marginTop: 16, paddingTop: 12,
            borderTop: "1px solid var(--paper-line, #E8E0D2)",
            fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)",
            letterSpacing: "0.05em",
          }}>
            <span>Latenza: <strong style={{ color: "var(--ink-1)" }}>{result.latencyMs}ms</strong></span>
            {result.durationSec != null && (
              <span>Audio: <strong style={{ color: "var(--ink-1)" }}>{result.durationSec}s</strong></span>
            )}
            <span>Modello: {result.modelUsed}</span>
          </div>
        </section>
      )}

      {error && (
        <p style={{ color: "var(--red-error, #B43B25)", fontSize: 13 }}>
          Errore: {error}
        </p>
      )}
    </main>
  );
}
