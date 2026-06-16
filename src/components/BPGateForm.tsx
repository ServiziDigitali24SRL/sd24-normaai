'use client';

/**
 * Form gated per il Business Plan: l'utente lascia i dati, poi riceve il link
 * al BP. POST a /api/invest-lead (salva il lead in `invest_leads`).
 * Brand cream/serif coerente con /pitch.
 */

import { useState } from 'react';

const VERM = 'oklch(0.42 0.20 35)';

export function BPGateForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [bpUrl, setBpUrl] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get('name'),
      email: fd.get('email'),
      organization: fd.get('organization'),
      role: fd.get('role'),
      message: fd.get('message'),
      website: fd.get('website'), // honeypot
    };
    try {
      const res = await fetch('/api/invest-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Qualcosa è andato storto.');
        setStatus('error');
        return;
      }
      setBpUrl(data.bpUrl);
      setStatus('done');
    } catch {
      setError('Connessione non riuscita. Riprova.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded border border-[#D8CFBC] bg-[#FDFBF7] p-8 text-center">
        <p className="text-[2rem]" style={{ color: VERM }}>✓</p>
        <h3 className="mt-2 text-[1.4rem]" style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}>
          Grazie. Il Business Plan è pronto.
        </h3>
        <p className="mt-2 text-[14px] text-[#6B5F55]">Buona lettura — per qualsiasi domanda, scrivimi su WhatsApp.</p>
        <a
          href={bpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block rounded px-6 py-3 text-[13px] font-semibold text-[#FBF8F1]"
          style={{ background: VERM }}
        >
          Scarica il Business Plan (PDF) →
        </a>
      </div>
    );
  }

  const inputCls =
    'w-full rounded border border-[#D8CFBC] bg-[#FDFBF7] px-4 py-3 text-[14px] text-[#1A1714] outline-none focus:border-[#756C5E]';

  return (
    <form onSubmit={onSubmit} className="rounded border border-[#D8CFBC] bg-[#FDFBF7] p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" required placeholder="Nome e cognome *" className={inputCls} autoComplete="name" />
        <input name="email" type="email" required placeholder="Email *" className={inputCls} autoComplete="email" />
        <input name="organization" placeholder="Fondo / incubatore / azienda" className={inputCls} autoComplete="organization" />
        <input name="role" placeholder="Ruolo (es. Partner, Analyst)" className={inputCls} />
      </div>
      <textarea name="message" rows={3} placeholder="Un messaggio (facoltativo)" className={`${inputCls} mt-4`} />
      {/* honeypot anti-bot: nascosto agli umani */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />
      {status === 'error' && <p className="mt-3 text-[13px] text-[#B43B25]">{error}</p>}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="mt-5 w-full rounded px-6 py-3 text-[14px] font-semibold text-[#FBF8F1] disabled:opacity-60 sm:w-auto"
        style={{ background: VERM }}
      >
        {status === 'loading' ? 'Invio…' : 'Ricevi il Business Plan →'}
      </button>
      <p className="mt-3 text-[11px] text-[#9A8E83]">
        Inserendo i dati accetti di essere ricontattato su NormaAI. Niente spam.
      </p>
    </form>
  );
}
