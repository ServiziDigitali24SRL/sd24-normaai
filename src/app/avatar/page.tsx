'use client';

/**
 * /avatar — Surface 2 desktop only.
 *
 * Mobile UA viene rediretto dal middleware a /voice (più adatta).
 * Desktop arriva qui via CTA dalla landing.
 *
 * Riusa il componente AvatarLive esistente (LiveKit + ElevenLabs Conversational
 * Agent backend Tab 4). Hero brand cream/serif + bottone "Inizia videochiamata"
 * + LiveAvatar player + local preview piccolo bottom-right.
 */

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// AvatarLive bundles livekit-client (~200 KB). Lazy chunk solo quando l'utente
// clicca "Inizia videochiamata" → no impact su LCP della pagina.
const AvatarLive = dynamic(() => import('@/components/AvatarLive').then((m) => m.AvatarLive), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-video w-full max-w-3xl items-center justify-center rounded border border-[#D8CFBC] bg-[#FBF8F1]">
      <p
        className="text-[12px] uppercase tracking-[0.18em] text-[#9A8E83] motion-safe:animate-pulse"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        carico videochiamata…
      </p>
    </div>
  ),
});

export default function AvatarPage() {
  const [started, setStarted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Auto-stop tracks su unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
    };
  }, [localStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setStarted(true);
    } catch (err) {
      // Fallback: avvia comunque (ASR via mic browser SDK gestisce)
      setStarted(true);
      console.error('[/avatar] getUserMedia failed:', err);
    }
  };

  const stop = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setStarted(false);
  };

  return (
    <main
      className="min-h-screen bg-[#F6F2EA] text-[#13110F]"
      style={{ fontFamily: 'var(--font-inter-tight), system-ui, sans-serif' }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-[#D8CFBC] px-8 py-4">
        <a href="/" className="text-[20px] leading-none" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
          <span className="text-[oklch(0.58_0.18_35)]">§ </span>
          <span className="italic">NormaAI</span>
        </a>
        <nav className="flex items-center gap-5 text-[13px] text-[#756C5E]">
          <a href="/voice" className="hover:text-[#13110F]">↗ versione voce (mobile)</a>
          <a href="/come_ho_costruito_norma" className="hover:text-[#13110F]">diario</a>
        </nav>
      </header>

      {/* Hero */}
      {!started ? (
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col items-center justify-center px-8 text-center">
          <p
            className="mb-6 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.42_0.20_35)]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            surface 2 · avatar
          </p>
          <h1
            className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.01em]"
            style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
          >
            Sofia, in video.
            <br />
            <em className="italic text-[oklch(0.58_0.18_35)]">Come una vera consulenza.</em>
          </h1>
          <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
            Una videochiamata reale con Sofia, l&apos;assistente AI di NormaAI. Per consulti
            più articolati, in cui vuoi vedere la persona in faccia. Otto minuti gratuiti,
            niente registrazione.
          </p>

          <button
            type="button"
            onClick={start}
            className="mt-12 rounded bg-[oklch(0.42_0.20_35)] px-8 py-4 text-[14px] uppercase tracking-[0.18em] text-[#FBF8F1] transition hover:bg-[oklch(0.42_0.20_35)]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            inizia videochiamata →
          </button>

          <p className="mt-8 text-[12px] italic text-[#9A8E83]">
            All&apos;avvio: il browser ti chiede accesso a camera e microfono.
            La trascrizione resta sul tuo dispositivo.
          </p>
        </section>
      ) : (
        <section className="mx-auto max-w-5xl px-8 py-12">
          <div className="flex items-baseline justify-between">
            <p
              className="text-[12px] uppercase tracking-[0.18em] text-[#13110F]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              videochiamata in corso
            </p>
            <button
              type="button"
              onClick={stop}
              className="rounded border border-[#B43B25] bg-[#FBE8E4] px-4 py-2 text-[12px] uppercase tracking-[0.18em] text-[#B43B25] transition hover:bg-[#F8D9D2]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              aria-label="Termina videochiamata"
            >
              termina chiamata
            </button>
          </div>

          {/* Player Sofia LiveAvatar (lazy import, full-size) */}
          <div className="relative mt-6 aspect-video w-full overflow-hidden rounded border border-[#D8CFBC] bg-[#FBF8F1]">
            <AvatarLive avatar="sofia" autoStart={true} showSelector={false} />

            {/* Local preview piccolo bottom-right */}
            {localStream && (
              <div className="absolute bottom-3 right-3 h-32 w-24 overflow-hidden rounded border-2 border-[#FBF8F1] shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>

          <p className="mt-6 text-[13px] italic text-[#756C5E]">
            Latency target: meno di 1.5 secondi prima del primo frame Sofia. Per casi
            complessi, Sofia ti suggerirà un avvocato umano verificato.
          </p>
        </section>
      )}
    </main>
  );
}
