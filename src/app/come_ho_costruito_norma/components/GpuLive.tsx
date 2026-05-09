import { mockSnapshot } from '../_lib/mock';
import { Sparkline } from './Sparkline';

const fmtDecimal = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const fmtMoney = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const STATUS_LABEL: Record<'active' | 'idle' | 'unloaded', string> = {
  active: 'attivo',
  idle: 'in standby',
  unloaded: 'non caricato',
};

export function GpuLive() {
  const g = mockSnapshot.gpu;
  const vramPct = (g.vramUsedGb / g.vramTotalGb) * 100;

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.48_0.20_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        05 · la macchina
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Una scheda video
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">in un armadio in Italia.</em>
        <br />
        Costo cloud LLM: zero.
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        RTX 4000 Ada · 20&nbsp;GB di VRAM · server <span className="text-[#13110F]">GEX44</span>{' '}
        in Italia · accesso solo via Tailscale. Niente dati che escono dall’UE.
      </p>

      <hr className="my-14 border-t border-[#D8CFBC]" aria-hidden="true" />

      <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.18em] text-[#13110F]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            utilizzo GPU
          </p>
          <p
            className="mt-3 text-[clamp(2.25rem,5vw,3rem)] leading-none"
            style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
          >
            {g.utilPct} %
          </p>
          <div className="mt-3">
            <Sparkline data={g.utilSeries60s} width={160} height={36} endDot={false} />
          </div>
          <p className="mt-2 text-[12px] text-[#756C5E]">media ultimi 60 secondi</p>
        </div>

        <div>
          <p
            className="text-[11px] uppercase tracking-[0.18em] text-[#13110F]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            memoria video
          </p>
          <p
            className="mt-3 text-[clamp(2.25rem,5vw,3rem)] leading-none"
            style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
          >
            {fmtDecimal.format(g.vramUsedGb)} <span className="text-[#756C5E]">/ {g.vramTotalGb}</span>
          </p>
          <div
            className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[#D8CFBC]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(vramPct)}
            aria-label="Memoria video usata"
          >
            <div
              className="h-full rounded-full bg-[oklch(0.58_0.18_35)]"
              style={{ width: `${vramPct}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] text-[#756C5E]">
            {Math.round(vramPct)} % di {g.vramTotalGb}&nbsp;GB
          </p>
        </div>

        <div>
          <p
            className="text-[11px] uppercase tracking-[0.18em] text-[#13110F]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            costo LLM 24h
          </p>
          <p
            className="mt-3 text-[clamp(2.25rem,5vw,3rem)] leading-none"
            style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
          >
            $&nbsp;{fmtMoney.format(g.llmCost24hUsd)}
          </p>
          <p className="mt-4 text-[12px] text-[#756C5E]">
            stesso lavoro su Anthropic Claude:{' '}
            <span className="text-[#13110F]">$&nbsp;{fmtMoney.format(g.llmCostBaselineUsd)}</span>
          </p>
        </div>
      </div>

      <hr className="my-14 border-t border-[#D8CFBC]" aria-hidden="true" />

      <h3
        className="text-[12px] uppercase tracking-[0.18em] text-[#13110F]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        modelli residenti in VRAM
      </h3>

      <ul className="mt-6 divide-y divide-[#D8CFBC]">
        {g.models.map((m) => (
          <li key={m.name} className="flex items-baseline justify-between py-3">
            <span
              className="text-[14px] text-[#13110F]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              {m.name}
            </span>
            <span
              className={
                m.status === 'active'
                  ? 'text-[13px] text-[oklch(0.48_0.20_35)]'
                  : 'text-[13px] italic text-[#756C5E]'
              }
            >
              {STATUS_LABEL[m.status]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
