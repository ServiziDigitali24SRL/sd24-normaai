"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Professional {
  id: string;
  categoria: string;
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  pec?: string;
  note?: string;
}

const CATEGORIE = [
  { id: "avvocato",        label: "Avvocato",              icon: "⚖️" },
  { id: "commercialista",  label: "Commercialista",        icon: "📊" },
  { id: "lavoro",          label: "Consulente del Lavoro", icon: "👔" },
  { id: "tecnico",         label: "Geometra / Ingegnere",  icon: "📐" },
  { id: "finanziario",     label: "Consulente Finanziario",icon: "📈" },
];

const EMPTY_FORM = { categoria: "avvocato", nome: "", cognome: "", telefono: "", email: "", pec: "", note: "" };

export default function ModalProfessionisti({ open, onClose }: Props) {
  const [pros, setPros] = useState<Professional[]>([]);
  const [view, setView] = useState<"list" | "add" | "detail">("list");
  const [selected, setSelected] = useState<Professional | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase.from("user_professionals").select("*").order("categoria").order("cognome");
    if (data) setPros(data);
  }, [supabase]);

  useEffect(() => { if (open) load(); }, [open, load]);

  function handleClose() { setView("list"); setSelected(null); setForm(EMPTY_FORM); setError(""); onClose(); }

  async function handleSave() {
    if (!form.nome.trim() || !form.cognome.trim()) { setError("Nome e cognome obbligatori"); return; }
    setLoading(true); setError("");
    const { error } = await supabase.from("user_professionals").insert({
      ...form,
      telefono: form.telefono || null,
      email: form.email || null,
      pec: form.pec || null,
      note: form.note || null,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    await load();
    setView("list");
    setForm(EMPTY_FORM);
  }

  async function handleDelete(id: string) {
    await supabase.from("user_professionals").delete().eq("id", id);
    await load();
    setView("list");
    setSelected(null);
  }

  return (
    <ModalOverlay open={open} onClose={handleClose}>
      <div className="p-7 max-h-[85vh] overflow-y-auto">
        <ModalClose onClose={handleClose} />

        {/* DETAIL VIEW */}
        {view === "detail" && selected && (
          <div>
            <button onClick={() => { setView("list"); setSelected(null); }}
              className="flex items-center gap-2 text-[11px] text-[#6B6763] mb-5 hover:text-[#6B6763] transition-colors bg-transparent border-none cursor-pointer p-0">
              <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2]"><polyline points="15,18 9,12 15,6"/></svg>
              I tuoi professionisti
            </button>
            <div className="text-[10px] uppercase tracking-[0.08em] text-[#7A766F] mb-1">
              {CATEGORIE.find(c => c.id === selected.categoria)?.label}
            </div>
            <ModalTitle>{selected.nome} {selected.cognome}</ModalTitle>

            <div className="mt-5 flex flex-col gap-3">
              {selected.telefono && (
                <a href={`tel:${selected.telefono}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E1D8] hover:border-[#D5D0C8] transition-colors no-underline">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 stroke-[#555] fill-none stroke-[1.8]">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.81 19.79 19.79 0 01.96 2.18 2 2 0 012.94 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  <span className="text-[13px] text-[#6B6763]">{selected.telefono}</span>
                </a>
              )}
              {selected.email && (
                <a href={`mailto:${selected.email}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E1D8] hover:border-[#D5D0C8] transition-colors no-underline">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 stroke-[#555] fill-none stroke-[1.8]">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/>
                  </svg>
                  <span className="text-[13px] text-[#6B6763]">{selected.email}</span>
                </a>
              )}
              {selected.pec && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E1D8]">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 stroke-[#555] fill-none stroke-[1.8]">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/>
                  </svg>
                  <div>
                    <div className="text-[10px] text-[#7A766F] mb-[1px]">PEC</div>
                    <div className="text-[13px] text-[#6B6763]">{selected.pec}</div>
                  </div>
                </div>
              )}
              {selected.note && (
                <div className="px-4 py-3 rounded-xl border border-[#E5E1D8]">
                  <div className="text-[10px] text-[#7A766F] mb-1">Note</div>
                  <div className="text-[12px] text-[#6B6763] leading-[1.5]">{selected.note}</div>
                </div>
              )}
            </div>

            <button onClick={() => handleDelete(selected.id)}
              className="mt-6 text-[11px] text-[#7A766F] hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer p-0">
              Elimina contatto
            </button>
          </div>
        )}

        {/* ADD VIEW */}
        {view === "add" && (
          <div>
            <button onClick={() => { setView("list"); setForm(EMPTY_FORM); setError(""); }}
              className="flex items-center gap-2 text-[11px] text-[#6B6763] mb-5 hover:text-[#6B6763] transition-colors bg-transparent border-none cursor-pointer p-0">
              <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2]"><polyline points="15,18 9,12 15,6"/></svg>
              I tuoi professionisti
            </button>
            <ModalTitle>Nuovo professionista</ModalTitle>

            <div className="mt-5 flex flex-col gap-3">
              {/* Categoria */}
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIE.map(cat => (
                  <button key={cat.id} onClick={() => setForm(f => ({ ...f, categoria: cat.id }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-[12px] cursor-pointer transition-all ${
                      form.categoria === cat.id ? "border-accent/40 bg-accent/10 text-[#1a1a1a]" : "border-[#E5E1D8] text-[#6B6763] hover:border-[#D5D0C8] bg-transparent"
                    }`}>
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>

              {[
                { key: "nome",      label: "Nome *",     type: "text" },
                { key: "cognome",   label: "Cognome *",  type: "text" },
                { key: "telefono",  label: "Telefono",   type: "tel" },
                { key: "email",     label: "Email",      type: "email" },
                { key: "pec",       label: "PEC",        type: "email" },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-[5px]">{label}</div>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-white border border-[#222] rounded-lg px-3 py-2 text-[13px] text-[#3D3A37] outline-none focus:border-[#D5D0C8] placeholder:text-[#333]"
                  />
                </div>
              ))}

              <div>
                <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-[5px]">Note</div>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={2}
                  className="w-full bg-white border border-[#222] rounded-lg px-3 py-2 text-[13px] text-[#3D3A37] outline-none focus:border-[#D5D0C8] resize-none"
                />
              </div>

              {error && <div className="text-[12px] text-red-400">{error}</div>}

              <button onClick={handleSave} disabled={loading}
                className="mt-1 w-full bg-accent text-[#0D0D0D] font-semibold text-[13px] py-[10px] rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? "Salvataggio…" : "Salva professionista"}
              </button>
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view === "list" && (
          <>
            <div className="flex items-center justify-between mb-5">
              <ModalTitle>I tuoi professionisti</ModalTitle>
              <button onClick={() => setView("add")}
                className="flex items-center gap-1 text-[11px] text-accent hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer p-0">
                <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2.5]"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Aggiungi
              </button>
            </div>

            {pros.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-[13px] text-[#7A766F]">Nessun professionista salvato</div>
                <div className="text-[11px] text-[#333] mt-1">Aggiungi il tuo avvocato, commercialista o consulente</div>
                <button onClick={() => setView("add")}
                  className="mt-4 px-5 py-2 bg-accent text-[#0D0D0D] text-[12px] font-semibold rounded-xl border-none cursor-pointer hover:opacity-90">
                  + Aggiungi il primo
                </button>
              </div>
            ) : (
              CATEGORIE.map(cat => {
                const items = pros.filter(p => p.categoria === cat.id);
                if (!items.length) return null;
                return (
                  <div key={cat.id} className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[9px] uppercase tracking-[0.08em] text-[#7A766F] font-medium">
                        {cat.icon} {cat.label}
                      </div>
                      <button onClick={() => setView("add")}
                        className="text-[10px] text-[#7A766F] hover:text-accent transition-colors bg-transparent border-none cursor-pointer p-0">
                        + aggiungi
                      </button>
                    </div>
                    <div className="flex flex-col gap-[5px]">
                      {items.map(pro => (
                        <button key={pro.id} onClick={() => { setSelected(pro); setView("detail"); }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E1D8] hover:border-[#D5D0C8] hover:bg-white/[0.02] text-left cursor-pointer transition-all w-full bg-transparent">
                          <div className="w-8 h-8 rounded-full bg-[#F0EDE8] border border-[#222] flex items-center justify-center text-[11px] font-semibold text-[#6B6763] shrink-0">
                            {pro.nome[0]}{pro.cognome[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-[#6B6763] truncate">{pro.nome} {pro.cognome}</div>
                            <div className="text-[11px] text-[#7A766F] truncate">{pro.email || pro.pec || pro.telefono || "—"}</div>
                          </div>
                          <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0 stroke-[#333] fill-none stroke-[2]"><polyline points="9,6 15,12 9,18"/></svg>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </ModalOverlay>
  );
}
