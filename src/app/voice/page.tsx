"use client";

// Surface 1: /voice — pagina mobile-first per parlare con Sofia.
// Tap mic → getUserMedia → POST audio chunks a /api/voice/chat-stream (SSE).
// Visualizzatore onda con AnalyserNode + requestAnimationFrame.
// Latency badge: RTT primo chunk audio ricevuto.

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "requesting" | "recording" | "processing" | "error";

export default function VoicePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionStartRef = useRef<number>(0);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    let frameCount = 0;
    const MAX_FRAMES = 60;

    const tick = () => {
      analyser.getByteTimeDomainData(buffer);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#1A1A1A";
      ctx.beginPath();
      const slice = w / buffer.length;
      let x = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = buffer[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      frameCount++;
      if (frameCount < MAX_FRAMES * 60) {
        // cap di sicurezza: ~60s a 60fps
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopAll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const sendToSofia = useCallback(async (audioBlob: Blob) => {
    setStatus("processing");
    sessionStartRef.current = performance.now();
    try {
      const fd = new FormData();
      fd.append("file", audioBlob, "recording.webm");
      fd.append("history", JSON.stringify([]));
      fd.append("tts", "elevenlabs");

      const res = await fetch("/api/voice/chat-stream", {
        method: "POST",
        body: fd,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Sofia non raggiungibile (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let firstAudioSeen = false;
      let buf = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // Naive SSE parse: detect "event: audio"
        if (!firstAudioSeen && buf.includes("event: audio")) {
          firstAudioSeen = true;
          const rtt = Math.round(performance.now() - sessionStartRef.current);
          setLatencyMs(rtt);
        }
      }
      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      setErrorMsg(message);
      setStatus("error");
    }
  }, []);

  const startSession = useCallback(async () => {
    setErrorMsg(null);
    setLatencyMs(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawWaveform();

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        sendToSofia(blob);
      };
      mr.start();
      setStatus("recording");

      // Auto-stop dopo 8s come prima sessione safe
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 8000);
    } catch (err) {
      const e = err as DOMException;
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setErrorMsg("Per parlare con Sofia serve l'accesso al microfono. Controlla le impostazioni del browser.");
      } else {
        setErrorMsg("Impossibile attivare il microfono. Riprova tra un istante.");
      }
      setStatus("error");
    }
  }, [drawWaveform, sendToSofia]);

  const onMicTap = () => {
    if (status === "recording") {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (status === "idle" || status === "error") {
      startSession();
    }
  };

  const latencyOk = latencyMs !== null && latencyMs < 1500;

  return (
    <main
      className="min-h-screen w-full flex flex-col items-center justify-between px-6 py-10"
      style={{ backgroundColor: "#F5F0E6", color: "#1A1A1A" }}
    >
      {/* Latency badge */}
      <div className="w-full flex justify-end">
        {latencyMs !== null && (
          <span
            className="text-xs font-mono px-2 py-1 rounded-full"
            style={{
              backgroundColor: latencyOk ? "#1f7a3a" : "#a3261a",
              color: "#F5F0E6",
            }}
            aria-live="polite"
          >
            {latencyMs}ms
          </span>
        )}
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <h1
          className="text-5xl leading-tight mb-3"
          style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif" }}
        >
          Parla con Sofia.
        </h1>
        <p
          className="text-xl opacity-80"
          style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif", fontStyle: "italic" }}
        >
          AI giurista italiana.
        </p>

        {/* Visualizer */}
        <canvas
          ref={canvasRef}
          width={300}
          height={80}
          className="mt-8 rounded-lg"
          style={{ width: "300px", height: "80px", opacity: status === "recording" ? 1 : 0.25 }}
          aria-hidden="true"
        />
      </div>

      {/* Mic button */}
      <div className="w-full flex flex-col items-center gap-4 pb-6">
        <button
          type="button"
          onClick={onMicTap}
          disabled={status === "processing" || status === "requesting"}
          aria-label={status === "recording" ? "Ferma registrazione" : "Inizia a parlare con Sofia"}
          className="rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-60"
          style={{
            width: "128px",
            height: "128px",
            backgroundColor: "#1A1A1A",
            color: "#F5F0E6",
            boxShadow: status === "recording" ? "0 0 0 8px rgba(26,26,26,0.15)" : "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <line x1="12" y1="18" x2="12" y2="22" />
          </svg>
        </button>
        <p
          className="text-sm"
          style={{ fontFamily: "var(--font-instrument-serif), Georgia, serif", fontStyle: "italic" }}
        >
          {status === "idle" && "Tocca per parlare"}
          {status === "requesting" && "Attivo il microfono…"}
          {status === "recording" && "Ti ascolto. Tocca per fermare."}
          {status === "processing" && "Sofia sta pensando…"}
          {status === "error" && "Riprova"}
        </p>

        {errorMsg && (
          <div
            role="alert"
            className="text-sm text-center max-w-xs px-4 py-3 rounded-lg"
            style={{ backgroundColor: "#a3261a", color: "#F5F0E6" }}
          >
            {errorMsg}
          </div>
        )}
      </div>
    </main>
  );
}
