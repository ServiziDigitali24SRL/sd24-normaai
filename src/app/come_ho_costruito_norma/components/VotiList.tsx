import { mockSnapshot } from '../_lib/mock';
import { Sparkline } from './Sparkline';

const fmtDelta = (n: number) => {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1).replace('.', ',')} %`;
};

const trendGlyph = (t: 'up' | 'flat' | 'down') => (t === 'up' ? '↑' : t === 'down' ? '↓' : '→');

export function VotiList() {
  const { voti } = mockSnapshot;
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.58_0.18_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        02 · stato
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Lo stato di salute
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">si misura da solo.</em>
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Cinque voti core, aggiornati ogni cinque secondi. Niente dashboard interna a
        cui guardare — la pagina è la dashboard.
      </p>

      <ol className="mt-16 border-t border-[#D8CFBC]">
        {voti.map((v) => (
          <li key={v.squadron} className="border-b border-[#D8CFBC] py-8">
            <h3 className="text-[12px] uppercase tracking-[0.18em] text-[#13110F]">
              {v.squadron}
              <span
                className="ml-3 normal-case tracking-normal text-[#756C5E]"
                style={{ fontFamily: 'var(--font-inter-tight)' }}
              >
                · {v.italianLabel}
              </span>
            </h3>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-5">
                <span
                  className="text-[clamp(2.5rem,6vw,3.75rem)] leading-[0.9]"
                  style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
                  aria-label={`Voto ${v.voto} su 100`}
                >
                  {v.voto}
                </span>
                <Sparkline data={v.trend7d} width={96} height={30} />
              </div>

              <div className="flex flex-col items-start gap-1 sm:items-end">
                <span className="text-[13px] text-[#756C5E]">target {v.target}</span>
                <span className="text-[13px] text-[oklch(0.58_0.18_35)]">
                  {trendGlyph(v.trend)} {fmtDelta(v.deltaPct)}
                  <span className="ml-1 text-[#756C5E]">vs ieri</span>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
