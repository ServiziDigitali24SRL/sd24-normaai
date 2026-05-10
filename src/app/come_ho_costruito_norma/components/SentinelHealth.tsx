import { mockSnapshot } from '../_lib/mock';
import type { IncidentEntry } from '../_lib/types';

const fmtPct = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtSec = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function fmtDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} · ${hh}:${min}`;
}

const STATUS_COLOR: Record<IncidentEntry['status'], string> = {
  resolved: '#2E7D5B',
  mitigated: '#C9A14B',
  open: '#B43B25',
};

const STATUS_LABEL: Record<IncidentEntry['status'], string> = {
  resolved: 'risolto',
  mitigated: 'mitigato',
  open: 'aperto',
};

export function SentinelHealth() {
  const s = mockSnapshot.sentinel;

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.42_0.20_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        08 · il guardiano
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Quando qualcosa cade,
        <br />
        si rialza da solo
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">in tre secondi.</em>
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Sentinel monitora ogni reparto, riavvia gli agenti caduti, traccia ogni
        incident. Niente paging notturni. Niente intervento manuale.
      </p>

      <hr className="my-14 border-t border-[#D8CFBC]" aria-hidden="true" />

      <div
        className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4"
        role="group"
        aria-label="Indicatori salute sistema"
      >
        <Kpi label="uptime" value={`${fmtPct.format(s.uptimePct)} %`} sub="ultimi 30 giorni" />
        <Kpi label="recovery medio" value={`${fmtSec.format(s.mttrSeconds)} s`} sub="MTTR" />
        <Kpi label="auto-fix 24h" value={String(s.autoFix24h)} sub="zero interventi manuali" />
        <Kpi
          label="incidenti aperti"
          value={String(s.openIncidents)}
          sub={s.openIncidents === 0 ? 'tutto sotto controllo' : 'in lavorazione'}
        />
      </div>

      <hr className="my-14 border-t border-[#D8CFBC]" aria-hidden="true" />

      <h3
        className="text-[12px] uppercase tracking-[0.18em] text-[#13110F]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        ultimi episodi (sette giorni)
      </h3>

      <ol className="mt-6 divide-y divide-[#D8CFBC]">
        {s.recentIncidents.map((inc, i) => (
          <li key={`${inc.ts}-${i}`} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 gap-y-1 py-5">
            <span
              aria-hidden="true"
              className="h-2 w-2 self-center rounded-full"
              style={{ backgroundColor: STATUS_COLOR[inc.status] }}
            />
            <div>
              <p className="text-[14px] text-[#13110F]">
                <span
                  className="text-[#756C5E]"
                  style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                >
                  {fmtDate(inc.ts)}
                </span>{' '}
                · <span className="font-medium">{inc.agentId}</span>{' '}
                <span className="text-[#756C5E]">— {inc.cause}</span>
              </p>
              <p className="mt-1 text-[13px] italic text-[#756C5E]">
                → {inc.resolution} in {inc.durationLabel}
              </p>
            </div>
            <span
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                color: STATUS_COLOR[inc.status],
              }}
            >
              {STATUS_LABEL[inc.status]}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p
        className="text-[11px] uppercase tracking-[0.18em] text-[#13110F]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-[clamp(2rem,4.5vw,2.75rem)] leading-none"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        {value}
      </p>
      <p className="mt-2 text-[12px] text-[#756C5E]">{sub}</p>
    </div>
  );
}
