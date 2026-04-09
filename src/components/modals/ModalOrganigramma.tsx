"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string;
}

interface Ruolo {
  id: string;
  nome: string;
  permesso: "admin" | "full" | "read";
  n_membri: number;
}

const PERMESSO_LABEL: Record<string, string> = {
  admin: "Admin",
  full: "Accesso completo",
  read: "Solo lettura",
};

const PERMESSO_COLOR: Record<string, string> = {
  admin: "text-accent bg-accent/10 border-accent/30",
  full: "text-green-700 bg-green-50 border-green-200",
  read: "text-[#6B6763] bg-[#F0EDE8] border-[#D8D3CC]",
};

export default function ModalOrganigramma({ open, onClose, companyId }: Props) {
  const [ruoli, setRuoli] = useState<Ruolo[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuovoRuolo, setNuovoRuolo] = useState("");
  const [nuovoPermesso, setNuovoPermesso] = useState<"admin" | "full" | "read">("full");
  const [adding, setAdding] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/impresa/members?company_id=${companyId}&type=ruoli`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setRuoli(Array.isArray(data) ? data : data.ruoli ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [open, companyId]);

  async function addRuolo() {
    if (!nuovoRuolo.trim()) return;
    setAdding(true);
    const newRuolo: Ruolo = { id: Date.now().toString(), nome: nuovoRuolo.trim(), permesso: nuovoPermesso, n_membri: 0 };
    await fetch(`/api/impresa/members?company_id=${companyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruolo: newRuolo }),
    }).catch(() => {});
    setRuoli(prev => [...prev, newRuolo]);
    setNuovoRuolo("");
    setAdding(false);
  }

  async function removeRuolo(id: string) {
    await fetch(`/api/impresa/members?company_id=${companyId}&ruolo_id=${id}`, { method: "DELETE" }).catch(() => {});
    setRuoli(prev => prev.filter(r => r.id !== id));
  }

  async function changePermesso(id: string, permesso: "admin" | "full" | "read") {
    setRuoli(prev => prev.map(r => r.id === id ? { ...r, permesso } : r));
    await fetch(`/api/impresa/members?company_id=${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruolo_id: id, permesso }),
    }).catch(() => {});
  }

  // Drag & drop reorder
  function onDragStart(i: number) { setDragIdx(i); }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const copy = [...ruoli];
    const [moved] = copy.splice(dragIdx, 1);
    copy.splice(i, 0, moved);
    setRuoli(copy);
    setDragIdx(i);
  }
  function onDragEnd() { setDragIdx(null); }

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="p-7 w-full max-w-lg">
        <ModalClose onClose={onClose} />
        <div className="text-[22px] font-serif text-[#1a1a1a] mb-1">Organigramma</div>
        <p className="text-[12.5px] text-[#9A9690] mb-5">Configura ruoli e permessi di accesso a NormaAI per il tuo team. Trascina per riordinare.</p>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {ruoli.length === 0 && (
              <div className="text-center py-8 text-[#9A9690] text-[13px]">Nessun ruolo configurato. Aggiungine uno.</div>
            )}
            <div className="space-y-2 mb-5">
              {ruoli.map((r, i) => (
                <div
                  key={r.id}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={e => onDragOver(e, i)}
                  onDragEnd={onDragEnd}
                  className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 transition-all cursor-grab ${dragIdx === i ? "opacity-50 border-accent" : "border-[#E5E1D8] hover:border-[#C8C2BA]"}`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#C8C2BA] fill-current shrink-0">
                    <circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/>
                    <circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>
                    <circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/>
                  </svg>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium text-[#1a1a1a]">{r.nome}</div>
                    <div className="text-[11px] text-[#9A9690]">{r.n_membri} {r.n_membri === 1 ? "membro" : "membri"}</div>
                  </div>
                  <select
                    value={r.permesso}
                    onChange={e => changePermesso(r.id, e.target.value as "admin" | "full" | "read")}
                    className={`text-[11px] border rounded-full px-3 py-1 focus:outline-none cursor-pointer ${PERMESSO_COLOR[r.permesso]}`}
                  >
                    <option value="admin">Admin</option>
                    <option value="full">Accesso completo</option>
                    <option value="read">Solo lettura</option>
                  </select>
                  <button
                    onClick={() => removeRuolo(r.id)}
                    className="w-6 h-6 flex items-center justify-center text-[#9A9690] hover:text-red-500 transition-colors rounded"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add ruolo */}
            <div className="flex gap-2 pt-4 border-t border-[#E5E1D8]">
              <input
                value={nuovoRuolo}
                onChange={e => setNuovoRuolo(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addRuolo(); }}
                placeholder="Nome ruolo…"
                className="flex-1 border border-[#E5E1D8] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#C8C2BA]"
              />
              <select
                value={nuovoPermesso}
                onChange={e => setNuovoPermesso(e.target.value as "admin" | "full" | "read")}
                className="border border-[#E5E1D8] rounded-lg px-3 py-2 text-[12px] focus:outline-none text-[#6B6763]"
              >
                <option value="admin">Admin</option>
                <option value="full">Completo</option>
                <option value="read">Lettura</option>
              </select>
              <button
                onClick={addRuolo}
                disabled={adding || !nuovoRuolo.trim()}
                className="bg-accent text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#c82d08] transition-colors disabled:opacity-40"
              >
                +
              </button>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 border border-[#E5E1D8] text-[#6B6763] py-2.5 rounded-xl text-[13px] hover:bg-[#F0EDE8] transition-colors"
        >
          Chiudi
        </button>
      </div>
    </ModalOverlay>
  );
}
