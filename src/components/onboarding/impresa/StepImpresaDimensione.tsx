'use client';
// /components/onboarding/steps/StepImpresaDimensione.tsx
// Step 2 Impresa — Selezione dimensione + piano (MICRO €29 / PICCOLA €79 / MEDIA €199)

import { useState } from 'react';

interface Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
}

const PIANI = [
  {
    id: 'impresa_micro',
    dimensione: 'micro',
    label: 'MICRO',
    range: '1 – 9 dipendenti',
    prezzo: 29,
    seats: '1 seat',
    features: [
      'Chat normativa illimitata',
      'Compliance Score base',
      '1 utente',
      'Alert scadenze essenziali',
      'Export report mensile',
    ],
  },
  {
    id: 'impresa_piccola',
    dimensione: 'piccola',
    label: 'PICCOLA',
    range: '10 – 49 dipendenti',
    prezzo: 79,
    seats: '5 seats',
    recommended: true,
    features: [
      'Tutto MICRO',
      'Compliance Score 24 rami',
      'Fino a 5 utenti',
      'Workflow task + assegnazioni',
      'Integrazioni Gmail / Drive',
      'Whistleblowing canale base',
    ],
  },
  {
    id: 'impresa_media',
    dimensione: 'media',
    label: 'MEDIA',
    range: '50 – 249 dipendenti',
    prezzo: 199,
    seats: '15 seats',
    features: [
      'Tutto PICCOLA',
      'Team legale multi-ruolo',
      'Fino a 15 utenti',
      '231 / MOG workflow',
      'DORA / NIS2 cockpit',
      'CSRD starter kit',
      'Supporto dedicato',
    ],
  },
];

export function StepImpresaDimensione({ data, updateData, onNext, onPrev }: Props) {
  const [selected, setSelected] = useState(data.piano || '');

  function next() {
    if (!selected) return;
    const piano = PIANI.find(p => p.id === selected)!;
    updateData({
      piano: piano.id,
      dimensione: piano.dimensione,
    });
    onNext();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <div className="section-label justify-center mb-3">§ Dimensione · Step 2 di 6</div>
        <h2 className="font-serif text-[36px] tracking-[-0.5px] text-[var(--ink)] mb-2">
          Quanti dipendenti ha la tua impresa?
        </h2>
        <p className="text-[14px] text-[var(--ink-4)] leading-relaxed">
          La dimensione determina il piano e i rami compliance attivati.
          Potrai sempre cambiare piano successivamente.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {PIANI.map(p => {
          const on = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`relative text-left p-6 rounded-[6px] border-2 transition-all ${
                on
                  ? 'bg-[var(--paper-tint)] border-[var(--vermiglio)] shadow-[var(--shadow-2)]'
                  : 'bg-[var(--paper)] border-[var(--paper-line)] hover:border-[var(--ink-5)]'
              }`}
            >
              {p.recommended && (
                <span className="absolute -top-3 left-6 px-2 py-0.5 bg-[var(--vermiglio)] text-white text-[10px] caps rounded-[2px]">
                  Consigliato
                </span>
              )}
              <div className="caps text-[var(--ink-4)] mb-1">{p.label}</div>
              <div className="text-[11.5px] text-[var(--ink-5)] mb-5">{p.range}</div>

              <div className="mb-5">
                <div className="font-serif text-[44px] text-[var(--ink)] leading-none">
                  <sup className="text-[18px] font-sans">€</sup>{p.prezzo}
                </div>
                <div className="text-[11px] text-[var(--ink-5)] mt-1">al mese · {p.seats}</div>
              </div>

              <ul className="space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex gap-2 text-[11.5px] text-[var(--ink-3)]">
                    <span className="text-[var(--alloro)] font-bold">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {on && (
                <div className="mt-5 pt-4 border-t border-[var(--paper-line)]">
                  <div className="caps text-[var(--vermiglio-ink)] text-center">✓ Selezionato</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-center text-[11.5px] text-[var(--ink-5)] mb-6">
        14 giorni di trial gratuito · Nessuna carta richiesta · Disdetta libera
      </div>

      <div className="flex justify-between items-center">
        <button onClick={onPrev} className="btn btn-ghost">← Indietro</button>
        <button onClick={next} disabled={!selected} className="btn btn-primary disabled:opacity-40">
          Continua →
        </button>
      </div>
    </div>
  );
}
