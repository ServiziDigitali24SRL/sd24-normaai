"use client";

import { useState, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  categoria?: string;      // preselezionata dalla sidebar
  sottocategoria?: string; // preselezionata dalla sidebar
  isPro: boolean;
  onUpgradeRequired: () => void;
}

const CATEGORIE: Record<string, string[]> = {
  "Personali e legali": ["Contratti", "Contratto di assunzione", "Verbali", "Sentenze e atti giudiziari", "Atti notarili", "Diffide e messe in mora"],
  "Lavoro e reddito": ["Buste paga", "Dichiarazione dei redditi (730)", "Modello Redditi", "CU (Certificazione Unica)", "TFR"],
  "Fiscale e tributario": ["Avvisi bonari", "Cartelle esattoriali", "F24", "Visure catastali", "Visure camerali"],
  "Immigrazione": ["Permessi di soggiorno", "Documenti questura"],
  "Utenze e bollette": ["Bollette", "Contratti utenze"],
};

export default function ModalCaricaDocumento({ open, onClose, userId, categoria: initCategoria, sottocategoria: initSottocategoria, isPro, onUpgradeRequired }: Props) {
  const [categoria, setCategoria] = useState(initCategoria ?? "");
  const [sottocategoria, setSottocategoria] = useState(initSottocategoria ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [scadenze, setScadenze] = useState<Array<{ tipo: string; data: string; descrizione: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  if (!isPro) {
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-[16px] border border-[#E5E1D8] p-6 max-w-[380px] w-full shadow-[0_4px_32px_rgba(0,0,0,0.12)]">
          <button onClick={onClose} className="absolute top-3 right-3 text-[#9A9690] hover:text-[#1a1a1a] text-[20px] bg-transparent border-none cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0EDE8] transition-colors">×</button>
          <div className="text-[22px] font-serif text-[#1a1a1a] mb-2">Funzione PRO</div>
          <div className="text-[12.5px] text-[#6B6763] mb-5">Il caricamento e l'analisi dei documenti è disponibile con NormaAI PRO a €9/mese.</div>
          <button onClick={onUpgradeRequired} className="w-full py-[11px] rounded-[9px] text-[13.5px] font-medium bg-accent text-white border-none cursor-pointer hover:bg-[#c82d08] transition-colors shadow-[0_2px_8px_rgba(232,52,10,0.20)]">
            Attiva PRO — €9/mese
          </button>
          <button onClick={onClose} className="w-full py-[10px] rounded-[9px] text-[13px] text-[#6B6763] bg-transparent border border-[#D5D0C8] cursor-pointer hover:bg-[#F7F5F2] transition-colors mt-2">
            Non ora
          </button>
        </div>
      </div>
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("File troppo grande (max 10MB)."); return; }
    setFile(f);
    setError("");
  }

  async function handleUpload() {
    if (!file) { setError("Seleziona un file."); return; }
    if (!categoria) { setError("Seleziona la categoria."); return; }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      formData.append("categoria", categoria);
      formData.append("sottocategoria", sottocategoria);

      const res = await fetch("/api/scadenze/extract", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Errore upload"); }
      const data = await res.json();
      setScadenze(data.scadenze ?? []);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nel caricamento.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFile(null);
    setCategoria(initCategoria ?? "");
    setSottocategoria(initSottocategoria ?? "");
    setDone(false);
    setScadenze([]);
    setError("");
    onClose();
  }

  const sottoOpzioni = categoria ? (CATEGORIE[categoria] ?? []) : [];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-[16px] border border-[#E5E1D8] p-6 max-w-[440px] w-full shadow-[0_4px_32px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute top-3 right-3 text-[#9A9690] hover:text-[#1a1a1a] text-[20px] bg-transparent border-none cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0EDE8] transition-colors">×</button>

        {!done ? (
          <>
            <div className="font-serif text-[22px] text-[#1a1a1a] mb-1">Carica documento</div>
            <div className="text-[12.5px] text-[#6B6763] mb-5">L'AI analizzerà il documento ed estrarrà automaticamente le scadenze.</div>

            {/* Categoria */}
            <label className="block text-[11px] text-[#6B6763] mb-[5px] uppercase tracking-[0.5px]">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => { setCategoria(e.target.value); setSottocategoria(""); }}
              className="w-full py-[11px] px-[13px] bg-[#F0EDE8] border border-[#D5D0C8] rounded-[9px] text-[#1a1a1a] text-[14px] outline-none focus:border-accent mb-3 cursor-pointer"
            >
              <option value="">Seleziona categoria...</option>
              {Object.keys(CATEGORIE).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Sottocategoria */}
            {sottoOpzioni.length > 0 && (
              <>
                <label className="block text-[11px] text-[#6B6763] mb-[5px] uppercase tracking-[0.5px]">Tipo documento</label>
                <select
                  value={sottocategoria}
                  onChange={(e) => setSottocategoria(e.target.value)}
                  className="w-full py-[11px] px-[13px] bg-[#F0EDE8] border border-[#D5D0C8] rounded-[9px] text-[#1a1a1a] text-[14px] outline-none focus:border-accent mb-3 cursor-pointer"
                >
                  <option value="">Seleziona tipo...</option>
                  {sottoOpzioni.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </>
            )}

            {/* File drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-[9px] p-6 text-center cursor-pointer transition-colors ${file ? "border-accent bg-[#FFF5F2]" : "border-[#D5D0C8] bg-[#F7F5F2] hover:border-accent hover:bg-[#FFF5F2]"}`}
            >
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div>
                  <div className="text-[13px] font-medium text-[#1a1a1a]">{file.name}</div>
                  <div className="text-[11px] text-[#6B6763] mt-1">{(file.size / 1024).toFixed(0)} KB · Clicca per cambiare</div>
                </div>
              ) : (
                <div>
                  <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-[#9A9690] fill-none stroke-[1.5] mx-auto mb-2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <div className="text-[13px] text-[#6B6763]">Clicca per selezionare o trascina qui</div>
                  <div className="text-[11px] text-[#9A9690] mt-1">PDF, Word, immagini · max 10MB</div>
                </div>
              )}
            </div>

            {error && <div className="text-accent text-[12px] mt-2">{error}</div>}

            <button
              onClick={handleUpload}
              disabled={loading || !file || !categoria}
              className="w-full py-[11px] rounded-[9px] text-[13.5px] font-medium mt-4 bg-accent text-white border-none cursor-pointer hover:bg-[#c82d08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Analisi in corso...
                </span>
              ) : "Carica e analizza"}
            </button>
          </>
        ) : (
          /* Risultato */
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#F0FBF0] border border-[#C3E6C3] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#2E7D32] fill-none stroke-[2.5]"><polyline points="20,6 9,17 4,12"/></svg>
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[#1a1a1a]">Documento salvato</div>
                <div className="text-[11.5px] text-[#6B6763]">{file?.name}</div>
              </div>
            </div>

            {scadenze.length > 0 ? (
              <>
                <div className="text-[12.5px] font-medium text-[#1a1a1a] mb-3">
                  Scadenze estratte ({scadenze.length})
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {scadenze.map((s, i) => (
                    <div key={i} className="bg-[#FFFBF0] border border-[#FFE08A] rounded-[8px] px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-[#1a1a1a]">{s.tipo}</span>
                        <span className="text-[11px] text-[#9B6B00] font-mono">{s.data}</span>
                      </div>
                      {s.descrizione && <div className="text-[11px] text-[#6B6763] mt-0.5">{s.descrizione}</div>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-[12.5px] text-[#6B6763] mb-4">Nessuna scadenza rilevata in questo documento.</div>
            )}

            <button onClick={handleClose} className="w-full py-[10px] rounded-[9px] text-[13px] font-medium bg-accent text-white border-none cursor-pointer hover:bg-[#c82d08] transition-colors">
              Chiudi
            </button>
          </>
        )}
      </div>
    </div>
  );
}
