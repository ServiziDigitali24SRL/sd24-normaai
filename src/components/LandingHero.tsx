/**
 * Hero della homepage NormaAI — brand cream/serif legal-warm.
 * Headline + 3 CTA (3 surface: voce mobile, avatar desktop, reel marketing) +
 * sezione "3 modi di parlare con Norma".
 *
 * Server component puro, no JS interattivo. Le CTA sono link normali a route
 * dedicate o ancore di pagina.
 */

interface CTACard {
  surface: '01' | '02' | '03';
  label: string;
  description: string;
  cta: string;
  href: string;
  /** Vibe della superficie (mobile, desktop, reel). */
  vibe: string;
  accent: string;
}

const CTAS: CTACard[] = [
  {
    surface: '01',
    label: 'Voce',
    description:
      'Chiama Sofia dal telefono. Risponde in italiano, cita il riferimento normativo, ti manda il PDF via mail.',
    cta: 'parla con Sofia →',
    href: '/voce',
    vibe: 'mobile · 3 minuti',
    accent: 'oklch(0.58 0.18 35)',
  },
  {
    surface: '02',
    label: 'Avatar',
    description:
      'Videochiamata con Sofia avatar AI. Per consulti più articolati, in cui vuoi vedere la persona in faccia.',
    cta: 'videochiama Sofia →',
    href: '/avatar',
    vibe: 'desktop · 8 minuti',
    accent: 'oklch(0.50 0.16 250)',
  },
  {
    surface: '03',
    label: 'Reel',
    description:
      'Tre minuti di Sofia che spiega un argomento normativo specifico, montato come reel verticale per Instagram.',
    cta: 'guarda i reel →',
    href: '/reel',
    vibe: 'marketing · 60–90 secondi',
    accent: 'oklch(0.55 0.14 90)',
  },
];

interface ModoCard {
  id: '01' | '02' | '03';
  title: string;
  paragraph: string;
}

const MODI: ModoCard[] = [
  {
    id: '01',
    title: 'Quando hai un dubbio veloce — apri la chat libera.',
    paragraph:
      'Domanda diretta, risposta con riferimento normativo verificato. Niente registrazione, niente abbonamento, niente carta di credito.',
  },
  {
    id: '02',
    title: 'Quando vuoi un parere dettagliato — chiama Sofia.',
    paragraph:
      'Voce o videochiamata con avatar. Sofia raccoglie i fatti, ti dice cosa dice la legge, e se serve genera un PDF firmato. Otto minuti.',
  },
  {
    id: '03',
    title: 'Quando ti serve un avvocato umano — Sofia te lo trova.',
    paragraph:
      'Solo quando il caso lo richiede. Avvocato verificato per foro e materia, pratica già pre-istruita, prezzo trasparente. Paghi solo se decidi di prenderlo.',
  },
];

export function LandingHero() {
  return (
    <div className="bg-[#F6F2EA] text-[#13110F]" style={{ fontFamily: 'var(--font-inter-tight), system-ui, sans-serif' }}>
      {/* Top bar minimale: logo + diario CTA */}
      <header className="sticky top-0 z-50 border-b border-[#D8CFBC] bg-[#F6F2EA]/95 backdrop-blur" role="banner">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a href="/" className="flex items-baseline gap-3" aria-label="NormaAI homepage">
            <span className="text-[22px] leading-none" style={{ fontFamily: 'var(--font-instrument-serif)' }}>
              <span className="text-[oklch(0.58_0.18_35)]">§ </span>
              <span className="italic">NormaAI</span>
            </span>
          </a>
          <nav className="flex items-center gap-6 text-[13px] text-[#756C5E]">
            <a href="/come_ho_costruito_norma" className="hover:text-[#13110F]">Diario di costruzione</a>
            <a href="/avvocato/login" className="hover:text-[#13110F]">Per avvocati</a>
            <a
              href="/voce"
              className="rounded bg-[oklch(0.48_0.20_35)] px-4 py-1.5 text-[12px] uppercase tracking-[0.18em] text-[#FBF8F1] transition hover:bg-[oklch(0.42_0.20_35)]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              parla con Sofia
            </a>
          </nav>
        </div>
      </header>

      {/* Hero principale */}
      <section className="mx-auto flex min-h-[80vh] max-w-5xl flex-col justify-center px-6 py-24">
        <p
          className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.48_0.20_35)]"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          NormaAI · 2026
        </p>

        <h1
          className="text-[clamp(2.25rem,7vw,5rem)] leading-[1.05] tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
        >
          La normativa italiana,
          <br />
          <em className="italic text-[oklch(0.58_0.18_35)]">finalmente parlante.</em>
        </h1>

        <p className="mt-10 max-w-3xl text-[18px] leading-relaxed text-[#756C5E]">
          Chiedi a Sofia, l&apos;assistente AI di NormaAI, qualunque cosa sulla
          legislazione italiana. Risponde in italiano, cita il riferimento
          normativo, e quando serve ti trova un avvocato umano verificato.
          Niente abbonamenti.
        </p>
      </section>

      {/* 3 CTA — le tre superfici */}
      <section
        className="mx-auto max-w-6xl px-6 pb-24"
        aria-labelledby="surfaces-heading"
      >
        <h2 id="surfaces-heading" className="sr-only">
          Tre superfici per parlare con Sofia
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CTAS.map((card) => (
            <a
              key={card.surface}
              href={card.href}
              className="group flex flex-col border border-[#D8CFBC] bg-[#FBF8F1] p-8 transition hover:border-[#756C5E]"
              style={{ borderRadius: 4 }}
            >
              <p
                className="text-[11px] uppercase tracking-[0.2em]"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono)',
                  color: card.accent,
                }}
              >
                {card.surface} · {card.vibe}
              </p>
              <h3
                className="mt-3 text-[clamp(1.5rem,3vw,2rem)] leading-tight"
                style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
              >
                {card.label}
              </h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#756C5E]">
                {card.description}
              </p>
              <p
                className="mt-6 text-[12px] uppercase tracking-[0.18em] transition group-hover:translate-x-1"
                style={{ fontFamily: 'var(--font-jetbrains-mono)', color: card.accent }}
              >
                {card.cta}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* "3 modi di parlare con Norma" — narrativa editoriale */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <p
          className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.48_0.20_35)]"
          style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
        >
          come funziona
        </p>

        <h2
          className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
        >
          Tre modi
          <br />
          <em className="italic text-[oklch(0.58_0.18_35)]">di parlare con Sofia.</em>
        </h2>

        <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
          A seconda di cosa stai facendo, di quanto tempo hai, di quanto è
          importante la decisione. Sofia ti incontra dove sei.
        </p>

        <ol className="mt-16 space-y-12">
          {MODI.map((m) => (
            <li key={m.id}>
              <p
                className="text-[12px] uppercase tracking-[0.18em] text-[oklch(0.48_0.20_35)]"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                {m.id} · modo
              </p>
              <h3
                className="mt-3 text-[clamp(1.25rem,3vw,1.75rem)] leading-snug"
                style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
              >
                {m.title}
              </h3>
              <p className="mt-3 text-[16px] leading-relaxed text-[#13110F]">
                {m.paragraph}
              </p>
            </li>
          ))}
        </ol>

        <p
          className="mt-16 text-[14px] italic text-[#756C5E]"
          style={{ fontFamily: 'var(--font-instrument-serif)' }}
        >
          Vuoi vedere come è costruita Sofia?{' '}
          <a
            href="/come_ho_costruito_norma"
            className="text-[oklch(0.48_0.20_35)] underline-offset-4 hover:underline not-italic"
          >
            Leggi il diario di costruzione →
          </a>
        </p>
      </section>
    </div>
  );
}
