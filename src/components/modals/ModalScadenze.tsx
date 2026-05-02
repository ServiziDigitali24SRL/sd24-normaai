"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose } from "../ModalOverlay";

interface Scadenza {
  id: string;
  tipo: string;
  data: string; // ISO date string
  descrizione: string;
  stato: "in_arrivo" | "scaduta" | "gestita";
  document_id?: string;
  nome_documento?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  isPro: boolean;
  onUpgradeRequired: () => void;
}

const TIPO_ICONS: Record<string, string> = {
  "Pagamento": "💳",
  "Fiscale": "🧾",
  "Legale": "⚖️",
  "Permesso soggiorno": "🌍",
  "Contrattuale": "📋",
  "Garanzia": "🛡️",
  "Prescrizione": "⏰",
  "Altro": "📅",
};

const TIPI_SCADENZA = Object.keys(TIPO_ICONS);

const STATO_COLORS: Record<string, string> = {
  in_arrivo: "bg-[#FFFBF0] text-[#9B6B00] border-[#FFE08A]",
  scaduta: "bg-[#FFF0F0] text-[#C00] border-[#FFCCCC]",
  gestita: "bg-[#F0FBF0] text-[#2E7D32] border-[#C3E6C3]",
};

const STATO_LABEL: Record<string, string> = {
  in_arrivo: "In arrivo",
  scaduta: "Scaduta",
  gestita: "Gestita",
};

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default function ModalScadenze({ open, onClose, userId, isPro, onUpgradeRequired }: Props) {
  const [scadenze, setScadenze] = useState<Scadenza[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<"tutte" | "in_arrivo" | "scaduta" | "gestita">("tutte");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form nuova scadenza
  const [newTipo, setNewTipo] = useState("Pagamento");
  const [newData, setNewData] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && userId && isPro) loadScadenze();
  }, [open, userId, isPro]);

  async function loadScadenze() {
    setLoading(true);
    try {
      // Legge scadenze da tutti i documenti dell'utente
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/user_documents?user_id=eq.${userId}&select=id,nome_file,scadenze_estratte`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      if (!res.ok) throw new Error();
      const docs = await res.json();
      const all: Scadenza[] = [];
      for (const doc of docs) {
        const items: Array<{ tipo: string; data: string; descrizione: string; stato?: string }> = doc.scadenze_estratte ?? [];
        for (const item of items) {
          const days = daysUntil(item.data);
          const stato = item.stato as Scadenza["stato"] ?? (days < 0 ? "scaduta" : "in_arrivo");
          all.push({
            id: `${doc.id}-${item.data}-${item.tipo}`,
            tipo: item.tipo,
            data: item.data,
            descrizione: item.descrizione,
            stato,
            document_id: doc.id,
            nome_documento: doc.nome_file,
          });
        }
      }
      // Ordina per data
      all.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      setScadenze(all);
    } catch {
      setScadenze([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddScadenza() {
    if (!newData || !newDesc.trim()) return;
    setSaving(true);
    try {
      // Salva in un documento virtuale "Scadenze manuali" per l'utente
      // In produzione si salverebbe in una tabella dedicata
      const days = daysUntil(newData);
      const newS: Scadenza = {
        id: `manual-${Date.now()}`,
        tipo: newTipo,
        data: newData,
        descrizione: newDesc,
        stato: days < 0 ? "scaduta" : "in_arrivo",
      };
      setScadenze((prev) => [...prev, newS].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()));
      setAdding(false);
      setNewTipo("Pagamento");
      setNewData("");
      setNewDesc("");
    } finally {
      setSaving(false);
    }
  }

  async function markGestita(id: string) {
    setScadenze((prev) => prev.map((s) => s.id === id ? { ...s, stato: "gestita" } : s));
  }

  async function deleteScadenza(id: string) {
    setScadenze((prev) => prev.filter((s) => s.id !== id));
  }

  const filtered = scadenze.filter((s) => filtro === "tutte" || s.stato === filtro);
  const urgenti = scadenze.filter((s) => s.stato === "in_arrivo" && daysUntil(s.data) <= 7).length;

  return (
    <ModalOverlay open={open} onClose={onClose} wide maxWidth="sm:max-w-[580px]">
      <div className="p-6">
        <ModalClose onClose={onClose} />

        {!isPro ? (
          <>
            <div className="font-serif text-[22px] text-[#1a1a1a] mb-2">Scadenze</div>
            <div className="text-[12.5px] text-[#6B6763] mb-5">La dashboard scadenze è disponibile con NormaAI PRO.</div>
            <button onClick={onUpgradeRequired} className="w-full py-[11px] rounded-[9px] text-[13.5px] font-medium bg-accent text-white border-none cursor-pointer hover:bg-[#c82d08] transition-colors">
              Attiva PRO — €9/mese
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <div className="font-serif text-[22px] text-[#1a1a1a]">Scadenze</div>
              {urgenti > 0 && (
                <div className="bg-[#FFF0F0] border border-[#FFCCCC] text-[#C00] text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  ⚠️ {urgenti} urgent{urgenti > 1 ? "i" : "e"}
                </div>
              )}
            </div>
            <div className="text-[12px] text-[#6B6763] mb-4">
              Estratte automaticamente dai tuoi documenti + aggiunte manualmente.
            </div>

            {/* Filtri */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {(["tutte", "in_arrivo", "scaduta", "gestita"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] border cursor-pointer transition-colors ${filtro === f ? "bg-accent text-white border-accent" : "bg-[#F7F5F2] text-[#6B6763] border-[#D5D0C8] hover:border-accent"}`}
                >
                  {f === "tutte" ? "Tutte" : STATO_LABEL[f]}
                  {f !== "tutte" && (
                    <span className="ml-1 opacity-70">({scadenze.filter((s) => s.stato === f).length})</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => setAdding(true)}
                className="ml-auto px-3 py-1.5 rounded-full text-[11.5px] border border-[#D5D0C8] bg-[#F7F5F2] text-[#6B6763] cursor-pointer hover:border-accent hover:text-accent transition-colors flex items-center gap-1"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2.5]"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Aggiungi
              </button>
            </div>

            {/* Form nuova scadenza */}
            {adding && (
              <div className="bg-[#F7F5F2] rounded-[9px] p-4 mb-4 border border-[#D5D0C8]">
                <div className="text-[12px] font-medium text-[#1a1a1a] mb-3">Nuova scadenza</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] text-[#6B6763] mb-1 uppercase tracking-wide">Tipo</label>
                    <select value={newTipo} onChange={(e) => setNewTipo(e.target.value)} className="w-full py-2 px-3 bg-white border border-[#D5D0C8] rounded-[7px] text-[13px] text-[#1a1a1a] outline-none">
                      {TIPI_SCADENZA.map((t) => <option key={t} value={t}>{TIPO_ICONS[t]} {t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#6B6763] mb-1 uppercase tracking-wide">Data</label>
                    <input type="date" value={newData} onChange={(e) => setNewData(e.target.value)} className="w-full py-2 px-3 bg-white border border-[#D5D0C8] rounded-[7px] text-[13px] text-[#1a1a1a] outline-none" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] text-[#6B6763] mb-1 uppercase tracking-wide">Descrizione</label>
                  <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="es. Pagamento bolletta gas" className="w-full py-2 px-3 bg-white border border-[#D5D0C8] rounded-[7px] text-[13px] text-[#1a1a1a] outline-none placeholder:text-[#A09B93]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddScadenza} disabled={saving || !newData || !newDesc.trim()} className="flex-1 py-2 rounded-[7px] text-[12.5px] font-medium bg-accent text-white border-none cursor-pointer hover:bg-[#c82d08] transition-colors disabled:opacity-50">
                    {saving ? "Salvataggio..." : "Salva"}
                  </button>
                  <button onClick={() => setAdding(false)} className="flex-1 py-2 rounded-[7px] text-[12.5px] bg-transparent border border-[#D5D0C8] text-[#6B6763] cursor-pointer hover:bg-white transition-colors">
                    Annulla
                  </button>
                </div>
              </div>
            )}

            {/* Lista scadenze */}
            {loading ? (
              <div className="text-center py-8 text-[12px] text-[#9A9690]">Caricamento...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-[12.5px] text-[#9A9690]">
                {filtro === "tutte" ? "Nessuna scadenza. Carica un documento per estrarle automaticamente." : `Nessuna scadenza "${STATO_LABEL[filtro]}".`}
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                {filtered.map((s) => {
                  const days = daysUntil(s.data);
                  const isUrgent = s.stato === "in_arrivo" && days <= 7;
                  return (
                    <div key={s.id} className={`border rounded-[9px] px-4 py-3 ${isUrgent ? "border-[#FFCCCC] bg-[#FFF8F8]" : "border-[#E5E1D8] bg-white"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="text-[16px] shrink-0 mt-0.5">{TIPO_ICONS[s.tipo] ?? "📅"}</span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-[#1a1a1a] truncate">{s.descrizione}</div>
                            <div className="text-[11px] text-[#6B6763] mt-0.5">
                              {s.tipo} · {formatDate(s.data)}
                              {s.stato === "in_arrivo" && (
                                <span className={`ml-2 font-medium ${days <= 3 ? "text-accent" : days <= 7 ? "text-[#9B6B00]" : "text-[#6B6763]"}`}>
                                  {days === 0 ? "Oggi" : days < 0 ? `${Math.abs(days)}g fa` : `tra ${days}g`}
                                </span>
                              )}
                            </div>
                            {s.nome_documento && (
                              <div className="text-[10.5px] text-[#9A9690] mt-0.5 truncate">📄 {s.nome_documento}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATO_COLORS[s.stato]}`}>
                            {STATO_LABEL[s.stato]}
                          </span>
                          <div className="flex gap-1">
                            {s.stato !== "gestita" && (
                              <button onClick={() => markGestita(s.id)} title="Segna come gestita" className="w-6 h-6 flex items-center justify-center text-[#2E7D32] hover:bg-[#F0FBF0] rounded cursor-pointer bg-transparent border-none transition-colors">
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5]"><polyline points="20,6 9,17 4,12"/></svg>
                              </button>
                            )}
                            <button onClick={() => deleteScadenza(s.id)} title="Elimina" className="w-6 h-6 flex items-center justify-center text-[#9A9690] hover:text-accent hover:bg-[#FFF0F0] rounded cursor-pointer bg-transparent border-none transition-colors">
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,01-2,2H7a2,2,0,01-2-2V6m3,0V4a2,2,0,012-2h4a2,2,0,012,2v2"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </ModalOverlay>
  );
}
