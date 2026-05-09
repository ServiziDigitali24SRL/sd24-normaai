import { mockSnapshot } from '../_lib/mock';
import type { SourceStatus } from '../_lib/types';

const fmt = new Intl.NumberFormat('it-IT');

const STATUS_GLYPH: Record<SourceStatus, string> = {
  complete: '✓',
  partial: '◐',
  missing: '⊘',
};

const STATUS_COLOR: Record<SourceStatus, string> = {
  complete: '#2E7D5B',
  partial: '#C9A14B',
  missing: '#B43B25',
};

const NUMBERS_IT: Record<number, string> = {
  0: 'zero', 1: 'una', 2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque',
  6: 'sei', 7: 'sette', 8: 'otto', 9: 'nove', 10: 'dieci',
};
function spell(n: number, fallbackPlural: string): string {
  return NUMBERS_IT[n] ?? `${n} ${fallbackPlural}`;
}

export function SourceCoverage() {
  const sources = mockSnapshot.sources;
  const completeCount = sources.filter((s) => s.status === 'complete').length;
  const partialCount = sources.filter((s) => s.status === 'partial').length;
  const missingCount = sources.filter((s) => s.status === 'missing').length;
  const totalCount = sources.length;

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.58_0.18_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        06 · le fonti
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        {capitalize(spell(totalCount, 'fonti'))} fonti ufficiali.
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">
          {spell(completeCount, 'complete')} complete, {spell(partialCount, 'in corso')} ancora in corso,{' '}
          {spell(missingCount, 'da raggiungere')} da raggiungere.
        </em>
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Le fonti complete sono in sincronia automatica. Quelle in corso vengono
        scaricate progressivamente. Quella mancante è sotto scouting da parte di
        un agente Discovery.
      </p>

      <ol className="mt-16 border-t border-[#D8CFBC]">
        {sources.map((s) => (
          <li key={s.shortName} className="border-b border-[#D8CFBC] py-6">
            <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4">
              <span
                aria-hidden="true"
                className="text-[20px] leading-none"
                style={{
                  color: STATUS_COLOR[s.status],
                  fontFamily: 'var(--font-instrument-serif)',
                }}
              >
                {STATUS_GLYPH[s.status]}
              </span>
              <h3
                className="text-[17px] text-[#13110F]"
                style={{ fontFamily: 'var(--font-inter-tight)', fontWeight: 500 }}
              >
                {s.name}
              </h3>
              <span
                className="text-[clamp(1.5rem,3vw,2rem)] leading-none text-[#13110F]"
                style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
              >
                {s.status === 'missing' ? (
                  <em className="italic text-[#756C5E]">nessuna</em>
                ) : (
                  `${s.coveragePct} %`
                )}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 text-[13px] text-[#756C5E]">
              <span aria-hidden="true" className="opacity-0">
                {STATUS_GLYPH[s.status]}
              </span>
              <p className="italic">{s.lastUpdateLabel}</p>
              <p>
                {s.documentCount > 0
                  ? `${fmt.format(s.documentCount)} documenti`
                  : '—'}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
