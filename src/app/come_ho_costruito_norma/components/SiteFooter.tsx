import { mockSnapshot } from '../_lib/mock';

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const COL_PRODOTTO = [
  { label: 'Chat', href: '/' },
  { label: 'API', href: '/api' },
  { label: 'Su Misura', href: '/su-misura' },
];

const COL_AVVOCATI = [
  { label: 'Iscriviti', href: '/avvocato/iscriviti' },
  { label: 'Login', href: '/avvocato/login' },
  { label: 'Come funziona', href: '/avvocato/come-funziona' },
];

const COL_RISORSE = [
  { label: 'Diario di costruzione', href: '/come_ho_costruito_norma' },
  { label: 'Stato corpus', href: '/come_ho_costruito_norma#chi-lavora' },
  { label: 'Manifesto', href: '/manifesto' },
];

const COL_LEGALE = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Termini', href: '/termini' },
  { label: 'Cookie', href: '/cookie' },
];

function ColLinks({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3
        className="text-[11px] uppercase tracking-[0.22em] text-[#9A8E83]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {title}
      </h3>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it.href}>
            <a
              href={it.href}
              className="text-[14px] text-[#F6F2EA]/85 transition hover:text-[#F6F2EA]"
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const lastUpdate = fmtTime(mockSnapshot.ts);
  return (
    <footer className="bg-[#13110F] text-[#F6F2EA]" role="contentinfo">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_auto_auto_auto_auto] md:gap-16">
          <div>
            <p
              className="text-[26px] leading-none"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              <span className="text-[oklch(0.65_0.18_35)]">§ </span>
              <span className="italic">NormaAI</span>
            </p>
            <p className="mt-3 max-w-xs text-[14px] text-[#F6F2EA]/70">
              L&apos;AI normativa italiana. Senza abbonamenti.
            </p>
            <a
              href="https://www.linkedin.com/company/servizi-digitali-24"
              aria-label="LinkedIn — Servizi Digitali 24"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-9 w-9 items-center justify-center rounded border border-[#F6F2EA]/20 text-[12px] uppercase tracking-[0.2em] text-[#F6F2EA] transition hover:border-[#F6F2EA]/60"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              in
            </a>
          </div>

          <ColLinks title="prodotto"     items={COL_PRODOTTO} />
          <ColLinks title="per avvocati" items={COL_AVVOCATI} />
          <ColLinks title="risorse"      items={COL_RISORSE} />
          <ColLinks title="legale"       items={COL_LEGALE} />
        </div>

        <hr className="my-10 border-t border-[#F6F2EA]/15" aria-hidden="true" />

        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <span
            className="inline-flex h-fit items-center self-start rounded border border-[#F6F2EA]/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[#F6F2EA]/80"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            R.11 · AI ACT UE
          </span>
          <p className="text-[13px] text-[#F6F2EA]/70 leading-relaxed">
            NormaAI è un servizio di intelligenza artificiale ai sensi del
            Reg. UE 2024/1689. Le risposte non sostituiscono il parere di un
            avvocato o consulente abilitato.
          </p>
        </div>

        <div className="mt-10 grid gap-2 text-[12px] text-[#F6F2EA]/55">
          <p
            className="uppercase tracking-[0.18em]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            Servizi Digitali 24 S.R.L. · D-U-N-S 302416196 · Sede legale: Roma · support@normaai.it
          </p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p
              className="uppercase tracking-[0.18em]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              © 2026 NormaAI. Tutti i diritti riservati.
            </p>
            <p
              className="uppercase tracking-[0.18em]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              aria-live="polite"
            >
              ultimo aggiornamento {lastUpdate}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {['Stripe', 'Visa', 'Mastercard', 'SEPA'].map((p) => (
              <span
                key={p}
                className="rounded border border-[#F6F2EA]/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em]"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
