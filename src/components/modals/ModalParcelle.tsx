"use client";

import { useState, useRef } from "react";
import ModalOverlay, { ModalClose } from "../ModalOverlay";
import ReactMarkdown from "react-markdown";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TIPI = [
  "Civile (cognizione)",
  "Penale",
  "Lavoro e previdenziale",
  "Tributario",
  "Amministrativo",
  "Esecutivo / fallimentare",
];

const FASI_CIVILE = [
  "Stragiudiziale",
  "Primo grado",
  "Appello",
  "Cassazione",
];

const SCAGLIONI = [
  "Valore indeterminabile",
  "Fino a €1.100",
  "Da €1.101 a €5.200",
  "Da €5.201 a €26.000",
  "Da €26.001 a €52.000",
  "Da €52.001 a €260.000",
  "Da €260.001 a €520.000",
  "Da €520.001 a €1.500.000",
  "Oltre €1.500.000",
];

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="text-[#1a1a1a] font-semibold">{children}</strong>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-[#1a1a1a] text-[14px] font-semibold mb-2 mt-4 first:mt-0">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-[#3D3A37] text-[13px] font-semibold mb-1 mt-3">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-[#3D3A37]">{children}</li>,
  table: ({ children }: { children?: React.ReactNode }) => <div className="overflow-x-auto mb-3"><table className="w-full text-[12.5px] border-collapse">{children}</table></div>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="text-left text-[#6B6763] font-medium px-3 py-2 border-b border-[#D5D0C8]">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="text-[#3D3A37] px-3 py-2 border-b border-[#E5E1D8]">{children}</td>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-accent pl-3 text-[#6B6763] italic my-3">{children}</blockquote>,
};

export default function ModalParcelle({ open, onClose }: Props) {
  const [tipo, setTipo] = useState(TIPI[0]);
  const [fase, setFase] = useState(FASI_CIVILE[1]);
  const [scaglione, setScaglione] = useState(SCAGLIONI[4]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  async function calcola() {
    setLoading(true);
    setResult("");
    try {
      const prompt = `Calcola la parcella forense per:
- Tipo pratica: ${tipo}
- Fase: ${fase}
- Scaglione di valore: ${scaglione}

Fornisci il calcolo completo con la tabella degli onorari per ogni fase, gli accessori (CPA + IVA + contributo unificato) e la base normativa (DM 55/2014 come modificato dal DM 147/2022).`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          vertical: "Parcelle Forensi",
          userId: null,
          conversationHistory: [],
          turnNumber: 0,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Errore server");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text") {
              setResult((prev) => prev + event.text);
              setTimeout(() => {
                resultRef.current?.scrollTo({ top: resultRef.current.scrollHeight, behavior: "smooth" });
              }, 50);
            }
          } catch { }
        }
      }
    } catch {
      setResult("Errore nel calcolo. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setTipo(TIPI[0]);
    setFase(FASI_CIVILE[1]);
    setScaglione(SCAGLIONI[4]);
    setResult("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  const selectClass = "w-full bg-white border border-[#E5E1D8] text-[#1a1a1a] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#C8C2BA] transition-colors duration-150 appearance-none cursor-pointer";
  const labelClass = "block text-[11px] text-[#6B6763] font-medium mb-1 uppercase tracking-wide";

  return (
    <ModalOverlay open={open} onClose={handleClose} maxWidth="max-w-[640px]">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-[18px]">⚖️</div>
            <div>
              <h2 className="text-[#1a1a1a] text-[15px] font-semibold leading-tight">Calcolatore Parcelle Forensi</h2>
              <p className="text-[11.5px] text-[#6B6763] mt-0.5">DM 55/2014 · DM 147/2022</p>
            </div>
          </div>
          <ModalClose onClose={handleClose} />
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 gap-4 mb-5">
          <div>
            <label className={labelClass}>Tipo di pratica</label>
            <div className="relative">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectClass}>
                {TIPI.map((t) => <option key={t}>{t}</option>)}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 stroke-[#555] fill-none stroke-[2] pointer-events-none" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9" /></svg>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fase procedurale</label>
              <div className="relative">
                <select value={fase} onChange={(e) => setFase(e.target.value)} className={selectClass}>
                  {FASI_CIVILE.map((f) => <option key={f}>{f}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 stroke-[#555] fill-none stroke-[2] pointer-events-none" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9" /></svg>
              </div>
            </div>
            <div>
              <label className={labelClass}>Scaglione valore</label>
              <div className="relative">
                <select value={scaglione} onChange={(e) => setScaglione(e.target.value)} className={selectClass}>
                  {SCAGLIONI.map((s) => <option key={s}>{s}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 stroke-[#555] fill-none stroke-[2] pointer-events-none" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9" /></svg>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={calcola}
          disabled={loading}
          className="w-full bg-accent text-white rounded-lg py-[11px] text-[13.5px] font-semibold hover:bg-accent-hover transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Calcolo in corso…</>
            : "Calcola parcella →"}
        </button>

        {/* Result */}
        {(result || loading) && (
          <div ref={resultRef} className="mt-5 bg-white border border-[#E5E1D8] rounded-xl p-4 max-h-[380px] overflow-y-auto">
            {loading && !result && (
              <div className="flex items-center gap-3 text-[#6B6763]">
                <span className="flex gap-[3px]">
                  <span className="w-[5px] h-[5px] rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-[5px] h-[5px] rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-[5px] h-[5px] rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span className="text-[13px]">Calcolo in corso…</span>
              </div>
            )}
            {result && (
              <>
                <div className="text-[13px] text-[#3D3A37] leading-[1.75]">
                  <ReactMarkdown components={mdComponents as any}>{result}</ReactMarkdown>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E5E1D8] flex gap-2">
                  <button
                    onClick={() => navigator.clipboard?.writeText(result)}
                    className="flex-1 text-[12px] text-[#6B6763] hover:text-[#1a1a1a] border border-[#E5E1D8] hover:border-[#D5D0C8] rounded-lg py-2 transition-colors"
                  >
                    Copia risultato
                  </button>
                  <button
                    onClick={reset}
                    className="flex-1 text-[12px] text-[#6B6763] hover:text-[#1a1a1a] border border-[#E5E1D8] hover:border-[#D5D0C8] rounded-lg py-2 transition-colors"
                  >
                    Nuovo calcolo
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <p className="text-center text-[11px] text-[#7A766F] mt-4">
          Calcolo orientativo basato su DM 55/2014 e DM 147/2022. Il giudice può liquidare discrezionalmente.
        </p>
      </div>
    </ModalOverlay>
  );
}
