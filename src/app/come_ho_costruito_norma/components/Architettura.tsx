interface BoxRow {
  id: string;
  italianLabel: string;
  stack: string;
}

const TOP_ROW: BoxRow[] = [
  { id: 'CORPUS',    italianLabel: 'raccolta',          stack: 'Python · Playwright' },
  { id: 'CHUNKING',  italianLabel: 'segmentazione',     stack: 'LangChain · custom' },
  { id: 'EMBEDDING', italianLabel: 'vettorializzazione', stack: 'Ollama · gemma2' },
  { id: 'RAG',       italianLabel: 'recupero',          stack: 'pgvector + FTS' },
];

const BOTTOM_ROW: BoxRow[] = [
  { id: 'AGENTS',    italianLabel: 'conversazione', stack: 'Vapi · ElevenLabs' },
  { id: 'OPS',       italianLabel: 'operazioni',    stack: 'Backups · metrics' },
  { id: 'SENTINEL',  italianLabel: 'guardiano',     stack: 'Auto-heal · MTTR 3s' },
  { id: 'DISCOVERY', italianLabel: 'esploratore',   stack: 'Scout · skill new' },
];

function Box({ box }: { box: BoxRow }) {
  return (
    <div className="border border-[#D8CFBC] bg-[#FBF8F1] p-4">
      <p
        className="text-[11px] uppercase tracking-[0.18em] text-[#13110F]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {box.id}
      </p>
      <p className="mt-1 text-[12px] text-[#756C5E]">{box.italianLabel}</p>
      <p
        className="mt-3 text-[11px] text-[#756C5E]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        {box.stack}
      </p>
    </div>
  );
}

export function Architettura() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.48_0.20_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        12 · come è fatta
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Otto reparti, un database,
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">
          zero servizi cloud a pagamento
        </em>
        <br />
        per il cuore del sistema.
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Ogni reparto è un processo dedicato. Comunicano tra loro solo attraverso
        un database condiviso. Niente service mesh, niente broker di messaggi,
        nessuna dipendenza esterna critica.
      </p>

      <div className="mt-16 space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {TOP_ROW.map((b) => (
            <Box key={b.id} box={b} />
          ))}
        </div>

        <div
          aria-hidden="true"
          className="flex justify-center text-[#756C5E]"
        >
          <span className="text-[18px] leading-none">↓</span>
        </div>

        <div className="border-2 border-[#D8CFBC] bg-[#FBF8F1] p-6 text-center">
          <p
            className="text-[11px] uppercase tracking-[0.18em] text-[#13110F]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            database centrale
          </p>
          <p
            className="mt-2 text-[clamp(1.25rem,3vw,1.75rem)] italic"
            style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
          >
            Supabase Postgres + pgvector + RLS
          </p>
          <p
            className="mt-2 text-[12px] text-[#756C5E]"
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            Frankfurt · EU only
          </p>
        </div>

        <div
          aria-hidden="true"
          className="flex justify-center text-[#756C5E]"
        >
          <span className="text-[18px] leading-none">↑</span>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {BOTTOM_ROW.map((b) => (
            <Box key={b.id} box={b} />
          ))}
        </div>
      </div>

      <p
        className="mt-12 text-[14px] italic text-[#756C5E]"
        style={{ fontFamily: 'var(--font-instrument-serif)' }}
      >
        Tutto open source. Tutto eseguito in Italia, su hardware dedicato.
        Nessun dato che esce dall’Unione Europea.
      </p>
    </section>
  );
}
