import { mockSnapshot } from '../_lib/mock';
import type { ADREntry } from '../_lib/types';

const STATUS_COLOR: Record<ADREntry['status'], string> = {
  'in produzione': '#2E7D5B',
  'in osservazione': '#C9A14B',
  'rollback eseguito': '#B43B25',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

const NUMBERS_IT_LARGE: Record<number, string> = {
  10: 'Dieci',
  20: 'Venti',
  30: 'Trenta',
  40: 'Quaranta',
  50: 'Cinquanta',
  52: 'Cinquantadue',
  60: 'Sessanta',
  70: 'Settanta',
  80: 'Ottanta',
  90: 'Novanta',
  100: 'Cento',
};

function spellLarge(n: number): string {
  return NUMBERS_IT_LARGE[n] ?? String(n);
}

export function AutopilotADR() {
  const adr = mockSnapshot.adr;
  const total = mockSnapshot.adrTotal;

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.42_0.20_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        10 · decisioni automatiche
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        {spellLarge(total)} decisioni
        <br />
        prese senza chiedermi nulla.
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">Posso annullarle tutte.</em>
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Quando il sistema decide qualcosa di rilevante — switch di modello,
        cambio di parametro, deprecazione di un endpoint — scrive un ADR e me lo
        mostra qui. Posso revocarlo in qualsiasi momento, e il rollback è già pronto.
      </p>

      <ol className="mt-16 space-y-12">
        {adr.map((d) => (
          <li
            key={d.id}
            className="border-l-2 border-[#D8CFBC] pl-6"
          >
            <p
              className="text-[11px] uppercase tracking-[0.18em] text-[#756C5E]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              ADR&nbsp;{String(d.id).padStart(3, '0')} · {fmtDate(d.ts)}
            </p>

            <h3
              className="mt-2 text-[clamp(1.25rem,3vw,1.75rem)] leading-snug"
              style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
            >
              {d.title}
            </h3>

            <p className="mt-3 text-[13px] italic text-[#756C5E]">
              {d.attribution}
            </p>

            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#13110F]">
              {d.reason}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <span
                className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.18em]"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono)',
                  color: STATUS_COLOR[d.status],
                }}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLOR[d.status] }}
                />
                {d.status}
              </span>

              <button
                type="button"
                className="rounded border border-[oklch(0.42_0.20_35)] px-3 py-1 text-[12px] uppercase tracking-[0.18em] text-[oklch(0.42_0.20_35)] transition hover:bg-[oklch(0.42_0.20_35)] hover:text-[#FBF8F1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[oklch(0.42_0.20_35)]"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                aria-label={`Annulla ADR ${d.id}`}
              >
                annulla
              </button>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-12 text-[14px]">
        <a
          href="/adr"
          className="text-[oklch(0.42_0.20_35)] underline-offset-4 hover:underline"
        >
          vedi tutti i {total} ADR →
        </a>
      </p>
    </section>
  );
}
