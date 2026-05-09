import { mockSnapshot } from '../_lib/mock';

const fmt = new Intl.NumberFormat('it-IT');

interface Step {
  label: string;
  value: number;
  note?: string;
  branch?: { label: string; value: number };
}

export function FunnelCorpus() {
  const f = mockSnapshot.funnel;

  const steps: Step[] = [
    {
      label: 'Fonti pubbliche',
      value: f.fontiPubbliche,
      note: 'Gazzetta Ufficiale, Cassazione, ministeri, agenzie',
    },
    {
      label: 'Fonti regionali',
      value: f.fontiRegionali,
      note: 'regioni, comuni, ordini professionali',
    },
    {
      label: 'Scaricati',
      value: f.scaricati,
      note: 'dopo accessi rifiutati o non disponibili',
    },
    {
      label: 'Pulito',
      value: f.pulito,
      note: 'rimosso boilerplate, OCR, normalizzato',
      branch: { label: 'rifiutati in pulizia', value: f.rifiutati },
    },
    {
      label: 'Chunk pronti',
      value: f.chunkPronti,
      note: 'segmentazione semantica per il recupero',
      branch: { label: 'segmenti scartati', value: f.scarto },
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <p
        className="mb-10 text-[11px] uppercase tracking-[0.25em] text-[oklch(0.48_0.20_35)]"
        style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
      >
        04 · il viaggio del documento
      </p>

      <h2
        className="text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.1] tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
      >
        Da settecentomila pagine
        <br />
        <em className="italic text-[oklch(0.58_0.18_35)]">
          a otto milioni di chunk
        </em>
        <br />
        utilizzabili.
      </h2>

      <p className="mt-8 max-w-2xl text-[18px] leading-relaxed text-[#756C5E]">
        Un documento normativo non si usa intero. Si scarica, si pulisce, si
        spezza in segmenti semantici. Ogni segmento diventa un vettore.
      </p>

      <ol className="mt-16 border-t border-[#D8CFBC]">
        {steps.map((step, idx) => (
          <li key={step.label} className="border-b border-[#D8CFBC] py-8">
            <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1">
              <h3
                className="text-[12px] uppercase tracking-[0.18em] text-[#13110F]"
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
              >
                {String(idx + 1).padStart(2, '0')}
                <span
                  className="ml-3 normal-case tracking-normal text-[#13110F]"
                  style={{ fontFamily: 'var(--font-inter-tight)', fontWeight: 500 }}
                >
                  · {step.label}
                </span>
              </h3>
              <span
                className="text-[clamp(2rem,5vw,3rem)] leading-none text-[#13110F]"
                style={{ fontFamily: 'var(--font-instrument-serif)', fontWeight: 400 }}
              >
                {fmt.format(step.value)}
              </span>

              {step.note && (
                <p className="text-[13px] text-[#756C5E]">{step.note}</p>
              )}
              <span aria-hidden="true" />
            </div>

            {step.branch && (
              <div className="mt-4 flex items-baseline justify-between border-l-2 border-[#D8CFBC] pl-4 text-[13px] text-[#756C5E]">
                <span>
                  <span className="text-[oklch(0.48_0.20_35)]">↳</span> {step.branch.label}
                </span>
                <span
                  className="text-[#756C5E]"
                  style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: 22 }}
                >
                  {fmt.format(step.branch.value)}
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>

      <p
        className="mt-8 text-[14px] italic text-[#756C5E]"
        style={{ fontFamily: 'var(--font-instrument-serif)' }}
      >
        Stima completamento: {f.etaCompletamentoOre} ore al ritmo attuale di{' '}
        {fmt.format(f.velocityChunkPerMin)} chunk al minuto.
      </p>
    </section>
  );
}
