"use client";

const SOURCES = [
  "Normattiva",
  "Cassazione",
  "Corte Costituzionale",
  "Garante Privacy",
  "AGCM",
  "Gazzetta Ufficiale",
  "EUR-Lex",
];

export default function CorpusCard() {
  return (
    <div className="bg-[#12121A] border border-[#1E1E2E] rounded-2xl p-5">
      <p className="text-[11px] font-medium text-[#6B6B8A] uppercase tracking-wider mb-4">
        Corpus Normativo RAG
      </p>

      <div className="flex items-end gap-3 mb-5">
        <p className="text-[32px] font-bold text-[#00FF88] leading-none tracking-tight">
          8,057,078
        </p>
        <p className="text-[12px] text-[#4A4A6A] pb-1">chunks · pgvector 384d</p>
      </div>

      {/* Embedded progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[#4A4A6A]">Embedding completato</span>
          <span className="text-[11px] font-mono text-[#00FF88]">100%</span>
        </div>
        <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00FF88] rounded-full"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Sources */}
      <div className="flex flex-wrap gap-1.5">
        {SOURCES.map((s) => (
          <span
            key={s}
            className="text-[10px] text-[#6B6B8A] bg-[#1E1E2E] border border-[#2A2A3E] rounded-full px-2.5 py-0.5"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
