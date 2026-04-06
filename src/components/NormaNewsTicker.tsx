"use client";

const items = [
  { text: "558K+ atti normativi indicizzati — legislazione italiana aggiornata al 2 aprile 2026" },
  { text: "Nuova copertura: 3.010 provvedimenti Garante Privacy disponibili nella banca dati" },
  { text: "EUR-Lex aggiornato: 307.830 atti UE tra regolamenti, decisioni e sentenze CGUE" },
  { text: "Corpus Corte Costituzionale: 17.000+ pronunce dal 1956 ad oggi" },
  { text: "CCNL 2024: 2.667 contratti collettivi nazionali di lavoro indicizzati e ricercabili" },
  { text: "Copertura legislazione regionale in arrivo — 43.500+ atti da 20 regioni" },
  { text: "NormaAI risponde in secondi su qualsiasi normativa italiana — gratuito, nessuna registrazione" },
];

const allItems = [...items, ...items];

export default function NormaNewsTicker() {
  return (
    <div
      className="overflow-hidden border-b border-[#E5E1D8] bg-[#FAFAF8]"
      style={{ height: 36 }}
    >
      <div className="animate-ticker flex items-center h-full" style={{ width: "max-content" }}>
        {allItems.map((item, i) => (
          <span key={i} className="inline-flex items-center h-full">
            <span className="text-[12px] text-[#3D3A37] whitespace-nowrap px-1 leading-none">
              {item.text}
            </span>
            <span className="text-[#C0BBB3] px-5 text-[14px]">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
