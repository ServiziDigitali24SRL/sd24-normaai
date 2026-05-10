'use client';

/**
 * /voice — Surface 1 mobile-first.
 *
 * Mobile UA detect nel middleware redirect / → /voice. Desktop può
 * raggiungere /voice direttamente ma è ottimizzato per 375px portrait.
 *
 * UX:
 * 1. Hero "Parla con Sofia"
 * 2. Bottone microfono grande centrato
 * 3. Tap → richiede mic permission (getUserMedia)
 * 4. Avvia loop: registra → POST /api/voice/chat-stream → riceve audio
 * 5. Visualizer onda audio canvas (Web Audio API analyser)
 * 6. Latency badge live, target <1500ms first chunk
 * 7. Stop bottone + transcript opzionale
 *
 * Brand cream/serif. Wiring backend usa endpoint pubblici esistenti
 * (/api/voice/chat-stream, /api/voice/transcribe, /api/voice/tts) +
 * /api/voice/sofia se Tab 4 lo espone (fallback al chat-stream).
 */

import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'requesting' | 'listening' | 'processing' | 'speaking' | 'error';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'tocca il microfono',
  requesting: 'in attesa permesso microfono…',
  listening: 'sto ascoltando…',
  processing: 'sto pensando…',
  speaking: 'sto rispondendo…',
  error: 'qualcosa non ha funzionato',
};

export default function VoicePage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMic = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  };

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.scale(dpr, dpr);
    const buffer = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(buffer);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'oklch(0.58 0.18 35)';
      ctx.beginPath();
      const slice = rect.width / buffer.length;
      let x = 0;
      for (let i = 0; i < buffer.length; i++) {
        const v = buffer[i] / 128.0;
        const y = (v * rect.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += slice;
      }
      ctx.stroke();
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const start = async () => {
    setError(null);
    setLatencyMs(null);
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new ctxClass();
      const src = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;
      drawVisualizer();
      setPhase('listening');

      // Stub: Tab 4 espone /api/voice/sofia (loop ASR+LLM+TTS) o usiamo
      // /api/voice/chat-stream esistente. Per ora simuliamo round-trip
      // con timing per la latency badge. Replace con vero stream binding
      // quando Tab 4 espone l'endpoint sofia loop.
      const t0 = performance.now();
      const r = await fetch('/api/voice/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '[live mic stream — stub turbo sprint]' }),
      });
      const firstChunkMs = Math.round(performance.now() - t0);
      setLatencyMs(firstChunkMs);
      setPhase('processing');
      if (r.ok) {
        // Lettura SSE/stream - per stub, leggiamo un evento e marchiamo speaking
        setPhase('speaking');
        setTranscript((prev) => [
          ...prev,
          `Sofia: risposta ricevuta in ${firstChunkMs}ms (stub Tab 4 wiring in arrivo)`,
        ]);
        // Auto torna a listening dopo 2s per UX continua (loop voce)
        setTimeout(() => {
          if (streamRef.current) setPhase('listening');
        }, 2000);
      } else {
        throw new Error(`HTTP ${r.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore microfono');
      setPhase('error');
      stopMic();
    }
  };

  const stop = () => {
    stopMic();
    setPhase('idle');
  };

  const isActive = phase === 'listening' || phase === 'processing' || phase === 'speaking';

  return (
    <main
      className="flex min-h-screen flex-col bg-[#F6F2EA] text-[#13110F]"
      style={{ fontFamily: 'var(--font-inter-tight), system-ui, sans-serif' }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-[#D8CFBC] px-5 py-4">
        <a href="/" className="text-[18px] leading-none" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
          <span className="text-[oklch(0.58_0.18_35)]">§ </span>
          <span className="italic">NormaAI</span>
        </a>
        {latencyMs != null && (
          <span
            className="text-[10px] uppercase tracking-[0.2em]"
            style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              color: latencyMs <= 1500 ? '#2E7D5B' : '#C9A14B',
            }}
            aria-live="polite"
          >
            latenza {latencyMs} ms
          </span>
        )}
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <p
          className="mb-6 text-[10px] uppercase tracking-[0.25em] text-[oklch(0.48_0.20_35)]"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          surface 1 · voice
        </p>
        <h1
          className="text-[clamp(2rem,8vw,3.25rem)] leading-[1.1] tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
        >
          Parla con Sofia.
          <br />
          <em className="italic text-[oklch(0.58_0.18_35)]">AI giurista italiana.</em>
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#756C5E]">
          Tocca il microfono, parlale in italiano, ricevi una risposta vocale che cita
          il riferimento normativo. Niente registrazione, niente login.
        </p>

        {/* Visualizer (canvas onda audio) */}
        <div className="mt-8 h-20 w-full max-w-sm">
          <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
        </div>

        {/* Bottone microfono grande */}
        <button
          type="button"
          onClick={isActive ? stop : start}
          disabled={phase === 'requesting'}
          className={
            'mt-6 flex h-32 w-32 items-center justify-center rounded-full border-4 transition disabled:opacity-60 ' +
            (isActive
              ? 'border-[oklch(0.48_0.20_35)] bg-[oklch(0.58_0.18_35)] text-[#FBF8F1] shadow-[0_0_0_8px_oklch(0.58_0.18_35_/_0.15)]'
              : 'border-[#D8CFBC] bg-[#FBF8F1] text-[#13110F] hover:border-[oklch(0.48_0.20_35)]')
          }
          aria-label={isActive ? 'Ferma sessione voce' : 'Avvia sessione voce'}
          aria-pressed={isActive}
        >
          {isActive ? (
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="6" width="12" height="12" rx="1.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          )}
        </button>

        <p
          className="mt-5 text-[14px] uppercase tracking-[0.18em]"
          style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            color: phase === 'error' ? '#B43B25' : '#756C5E',
          }}
          aria-live="polite"
        >
          {phase === 'error' && error ? `errore · ${error}` : PHASE_LABEL[phase]}
        </p>

        {/* Toggle transcript */}
        {transcript.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTranscript((s) => !s)}
            className="mt-6 text-[12px] underline-offset-4 text-[#756C5E] hover:text-[#13110F] hover:underline"
          >
            {showTranscript ? 'nascondi trascrizione' : `mostra trascrizione (${transcript.length})`}
          </button>
        )}

        {showTranscript && transcript.length > 0 && (
          <div
            className="mt-4 max-h-48 w-full max-w-sm overflow-y-auto rounded border border-[#D8CFBC] bg-[#FBF8F1] p-3 text-left text-[12px]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            role="log"
            aria-live="polite"
          >
            <ul className="space-y-2">
              {transcript.map((line, i) => (
                <li key={i} className="text-[#13110F]">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Footer minimo */}
      <footer className="border-t border-[#D8CFBC] px-5 py-4 text-center">
        <p className="text-[11px] italic text-[#756C5E]">
          Sofia AI di NormaAI · niente registrazione · sotto Reg. UE 2024/1689
        </p>
      </footer>
    </main>
  );
}
