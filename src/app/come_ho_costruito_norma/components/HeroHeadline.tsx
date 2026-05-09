'use client';

import { useEffect, useRef, useState } from 'react';
import { mockSnapshot } from '../_lib/mock';

const fmtInt = new Intl.NumberFormat('it-IT');
const fmtDecimal = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const fmtMoney = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function CountUp({
  to,
  durationMs = 1800,
  format,
}: {
  to: number;
  durationMs?: number;
  format: (n: number) => string;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setValue(to);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setValue(to);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / durationMs);
              setValue(to * easeOutExpo(t));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, durationMs]);

  return <span ref={ref}>{format(value)}</span>;
}

export function HeroHeadline() {
  const { totals } = mockSnapshot;
  return (
    <section className="mx-auto flex min-h-[85vh] max-w-5xl flex-col justify-center px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.58_0.18_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        01 · diario
      </p>

      <h1
        className="text-[clamp(2.25rem,7vw,5rem)] leading-[1.05] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Stiamo costruendo
        <br />
        il corpus normativo italiano
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">più grande d&apos;Europa.</em>
      </h1>

      <p className="mt-10 max-w-3xl text-[18px] leading-relaxed text-[#756C5E]">
        612.847 documenti scaricati. 4,2 milioni di chunk. Zero LLM cloud a pagamento.
        Tutto in tempo reale, qui sotto.
      </p>

      <hr className="my-16 border-t border-[#D8CFBC]" aria-hidden="true" />

      <dl className="grid grid-cols-1 gap-10 sm:grid-cols-3">
        <div>
          <dt className="sr-only">Documenti scaricati</dt>
          <dd
            className="text-[clamp(2.5rem,9vw,3.5rem)] leading-none"
            style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
            aria-live="polite"
          >
            <CountUp to={totals.documents} format={(n) => fmtInt.format(Math.round(n))} />
          </dd>
          <p className="mt-3 text-[13px] uppercase tracking-wide text-[#756C5E]">
            documenti
          </p>
        </div>

        <div>
          <dt className="sr-only">Corpus pulito</dt>
          <dd
            className="text-[clamp(2.5rem,9vw,3.5rem)] leading-none"
            style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
            aria-live="polite"
          >
            <CountUp to={totals.corpusCleanPct} format={(n) => `${fmtDecimal.format(n)} %`} />
          </dd>
          <p className="mt-3 text-[13px] uppercase tracking-wide text-[#756C5E]">
            corpus pulito
          </p>
        </div>

        <div>
          <dt className="sr-only">Costo LLM ultime 24 ore</dt>
          <dd
            className="text-[clamp(2.5rem,9vw,3.5rem)] leading-none"
            style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
            aria-live="polite"
          >
            <CountUp to={totals.llmCost24hUsd} format={(n) => `$ ${fmtMoney.format(n)}`} />
          </dd>
          <p className="mt-3 text-[13px] uppercase tracking-wide text-[#756C5E]">
            costo LLM 24h
          </p>
        </div>
      </dl>
    </section>
  );
}
