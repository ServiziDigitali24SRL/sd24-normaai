import { mockSnapshot } from '../_lib/mock';
import type { SkillEntry } from '../_lib/types';

const fmt = new Intl.NumberFormat('it-IT');

function fmtShortDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STATUS_COLOR: Record<SkillEntry['status'], string> = {
  'in test': '#C9A14B',
  'eval superato': '#2E7D5B',
  'in produzione': '#13110F',
};

export function SkillsAndDiscovery() {
  const d = mockSnapshot.discovery;

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.48_0.20_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        09 · caccia e apprendimento
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Mentre lavora, impara.
        <br />
        Mentre impara,
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">scopre fonti nuove.</em>
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Discovery è il reparto più curioso. Quando trova un sito normativo non
        ancora indicizzato, lo studia, scrive una nuova skill, la testa, e se
        funziona la mette in produzione. Senza chiedere il permesso.
      </p>

      <hr className="my-14 border-t border-[#D8CFBC]" aria-hidden="true" />

      <h3
        className="text-[12px] uppercase tracking-[0.18em] text-[#13110F]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        skill acquisite (sette giorni)
      </h3>

      <ol className="mt-6 divide-y divide-[#D8CFBC]">
        {d.skills.map((sk) => (
          <li key={sk.name} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 py-4">
            <span
              className="text-[12px] text-[#756C5E]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {fmtShortDate(sk.date)}
            </span>
            <div>
              <p
                className="text-[14px] text-[#13110F]"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                {sk.name}
              </p>
              <p
                className="mt-0.5 text-[12px] text-[#756C5E]"
                style={{ fontFamily: 'var(--font-inter-tight)' }}
              >
                acquisita da {sk.ownerAgentId}
              </p>
            </div>
            <span
              className="text-[12px] italic"
              style={{ color: STATUS_COLOR[sk.status] }}
            >
              {sk.status}
            </span>
          </li>
        ))}
      </ol>

      <hr className="my-14 border-t border-[#D8CFBC]" aria-hidden="true" />

      <h3
        className="text-[12px] uppercase tracking-[0.18em] text-[#13110F]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        in caccia adesso ({d.scouts.length} fonti sotto scout)
      </h3>

      <ol className="mt-6 divide-y divide-[#D8CFBC]">
        {d.scouts.map((sc) => (
          <li key={sc.url} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 py-4">
            <span
              aria-hidden="true"
              className="text-[18px] motion-safe:animate-spin motion-reduce:animate-none"
              style={{ animationDuration: '4s', color: '#8A9A5B' }}
            >
              ◔
            </span>
            <p
              className="text-[14px] text-[#13110F]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {sc.url}
            </p>
            <p className="text-[13px] italic text-[#756C5E]">
              {fmt.format(sc.candidatesFound)} candidati
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
