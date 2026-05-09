interface Milestone {
  /** Formato gg/mm/aaaa per display. */
  date: string;
  /** ISO date per ordering eventuale. */
  iso: string;
  paragraph: string;
}

const MILESTONES: Milestone[] = [
  {
    date: '09/05/2026',
    iso: '2026-05-09',
    paragraph:
      'Discovery diventa un reparto. Sei agenti dedicati a cercare fonti normative non ancora indicizzate, a scrivere skill nuove, a metterle in produzione senza chiedere il permesso.',
  },
  {
    date: '07/05/2026',
    iso: '2026-05-07',
    paragraph:
      'Sentinel impara a riavviare gli agenti caduti da solo. Il tempo medio di recupero scende da dodici a tre secondi. Niente più paging notturni.',
  },
  {
    date: '02/05/2026',
    iso: '2026-05-02',
    paragraph:
      'Il corpus cresce di 2,9 GB in due giorni. La copertura totale passa dal 75 % all’88 %. Per la prima volta tutta la Cassazione è in pgvector.',
  },
  {
    date: '15/04/2026',
    iso: '2026-04-15',
    paragraph:
      'Arriva GEX44, la GPU dedicata in Italia. Il costo LLM cloud passa da 84 dollari al giorno a zero. Da quel momento niente più API a pagamento per il cuore del sistema.',
  },
  {
    date: '30/03/2026',
    iso: '2026-03-30',
    paragraph:
      'Audit struttura completo. Quattro duplicati eliminati, naming conventions applicate ovunque, root pulita. La premessa per tutto quello che è venuto dopo.',
  },
  {
    date: '20/01/2026',
    iso: '2026-01-20',
    paragraph: 'NormaAI v1 va online. Una chat libera, un PDF gratis, un avvocato pagato solo se serve.',
  },
  {
    date: '01/12/2025',
    iso: '2025-12-01',
    paragraph:
      'Primo agente: CORPUS-01. Una funzione Python che scarica un PDF dalla Gazzetta Ufficiale. Niente di più.',
  },
];

export function MilestoneTimeline() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.48_0.20_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        11 · la storia
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Da un agente solo
        <br />
        a centoquattordici,
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">in cinque mesi.</em>
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Senza fasi grandi, senza relaunch, senza marketing. Un agente per volta,
        un reparto per volta, una decisione per volta.
      </p>

      <ol className="mt-16 space-y-12">
        {MILESTONES.map((m) => (
          <li key={m.iso}>
            <p
              className="text-[12px] uppercase tracking-[0.18em] text-[oklch(0.48_0.20_35)]"
              style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
            >
              <time dateTime={m.iso}>{m.date}</time>
            </p>
            <p className="mt-3 text-[17px] leading-relaxed text-[#13110F]">
              {m.paragraph}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
