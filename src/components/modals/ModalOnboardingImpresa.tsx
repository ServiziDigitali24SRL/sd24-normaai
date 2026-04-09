"use client";

import { useState } from "react";
import ModalOverlay, { ModalClose } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  companyId: string;
}

const STEPS = [
  { id: 1, label: "Benvenuto", emoji: "👋" },
  { id: 2, label: "Dati aziendali", emoji: "🏢" },
  { id: 3, label: "Connettori", emoji: "🔗" },
  { id: 4, label: "Pronto!", emoji: "🚀" },
];

const CONNETTORI = [
  { id: "gdrive", label: "Google Drive", icon: "📂" },
  { id: "dropbox", label: "Dropbox", icon: "📦" },
  { id: "onedrive", label: "OneDrive", icon: "☁️" },
  { id: "gmail", label: "Gmail", icon: "📧" },
  { id: "outlook", label: "Outlook", icon: "📮" },
];

export default function ModalOnboardingImpresa({ open, onClose, userId, companyId }: Props) {
  const [step, setStep] = useState(1);
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [piva, setPiva] = useState("");
  const [settore, setSettore] = useState("");
  const [nDipendenti, setNDipendenti] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveStep2() {
    if (!ragioneSociale.trim()) return;
    setSaving(true);
    await fetch(`/api/impresa/members?company_id=${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ragione_sociale: ragioneSociale, p_iva: piva, settore, n_dipendenti: nDipendenti }),
    }).catch(() => {});
    setSaving(false);
    setStep(3);
  }

  const pct = Math.round(((step - 1) / (STEPS.length - 1)) * 100);

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="p-7 max-w-lg w-full">
        <ModalClose onClose={onClose} />

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${step >= s.id ? "bg-accent text-white" : "bg-[#F0EDE8] text-[#9A9690]"}`}>
                  {step > s.id ? "✓" : s.emoji}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-12 h-[2px] mx-1 transition-all ${step > s.id ? "bg-accent" : "bg-[#E5E1D8]"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="w-full bg-[#F0EDE8] rounded-full h-1 mt-2">
            <div className="bg-accent h-1 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[11px] text-[#9A9690] mt-1">Passo {step} di {STEPS.length}</div>
        </div>

        {/* Step 1: Benvenuto */}
        {step === 1 && (
          <div>
            <div className="text-[28px] font-serif text-[#1a1a1a] mb-2">Benvenuto su NormaAI Impresa!</div>
            <p className="text-[13.5px] text-[#6B6763] leading-relaxed mb-6">
              In pochi minuti configuriamo il tuo spazio aziendale. Avrai accesso a query normative AI,
              gestione team, fascicolo documenti e matching con professionisti.
            </p>
            <div className="bg-[#FAFAF8] border border-[#E5E1D8] rounded-xl p-5 mb-6 space-y-3">
              {[
                "7 giorni di trial gratuito — nessuna carta richiesta",
                "Modello Claude Opus 4.6 per analisi critiche",
                "Alert automatici su scadenze normative",
                "Matching con avvocati e consulenti su NormaAI",
              ].map(f => (
                <div key={f} className="flex items-start gap-2 text-[12.5px] text-[#6B6763]">
                  <span className="text-accent mt-0.5">✓</span>
                  {f}
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full bg-accent text-white py-3 rounded-xl font-semibold text-[14px] hover:bg-[#c82d08] transition-colors"
            >
              Inizia la configurazione →
            </button>
          </div>
        )}

        {/* Step 2: Dati aziendali */}
        {step === 2 && (
          <div>
            <div className="text-[22px] font-serif text-[#1a1a1a] mb-1">Dati aziendali</div>
            <p className="text-[13px] text-[#9A9690] mb-5">Per personalizzare le risposte normative alla tua azienda.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-[#6B6763] mb-1 font-medium">Ragione Sociale *</label>
                <input
                  value={ragioneSociale}
                  onChange={e => setRagioneSociale(e.target.value)}
                  placeholder="Azienda S.r.l."
                  className="w-full border border-[#E5E1D8] rounded-lg px-3 py-2.5 text-[13px] text-[#1a1a1a] focus:outline-none focus:border-[#C8C2BA] bg-white"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#6B6763] mb-1 font-medium">P.IVA</label>
                <input
                  value={piva}
                  onChange={e => setPiva(e.target.value)}
                  placeholder="IT00000000000"
                  className="w-full border border-[#E5E1D8] rounded-lg px-3 py-2.5 text-[13px] text-[#1a1a1a] focus:outline-none focus:border-[#C8C2BA] bg-white"
                />
              </div>
              <div>
                <label className="block text-[12px] text-[#6B6763] mb-1 font-medium">Settore</label>
                <select
                  value={settore}
                  onChange={e => setSettore(e.target.value)}
                  className="w-full border border-[#E5E1D8] rounded-lg px-3 py-2.5 text-[13px] text-[#1a1a1a] focus:outline-none focus:border-[#C8C2BA] bg-white"
                >
                  <option value="">Seleziona settore…</option>
                  {["Manifattura", "Commercio al dettaglio", "Servizi professionali", "Tecnologia", "Edilizia & Costruzioni", "Trasporto & Logistica", "Agroalimentare", "Turismo & Hospitality", "Sanità", "Altro"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-[#6B6763] mb-1 font-medium">N° dipendenti</label>
                <select
                  value={nDipendenti}
                  onChange={e => setNDipendenti(e.target.value)}
                  className="w-full border border-[#E5E1D8] rounded-lg px-3 py-2.5 text-[13px] text-[#1a1a1a] focus:outline-none focus:border-[#C8C2BA] bg-white"
                >
                  <option value="">Seleziona…</option>
                  {["1-5", "6-25", "26-100", "101-500", "500+"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 border border-[#E5E1D8] text-[#6B6763] py-3 rounded-xl text-[13px] hover:bg-[#F0EDE8] transition-colors">
                Indietro
              </button>
              <button
                onClick={saveStep2}
                disabled={saving || !ragioneSociale.trim()}
                className="flex-1 bg-accent text-white py-3 rounded-xl text-[13px] font-semibold hover:bg-[#c82d08] transition-colors disabled:opacity-40"
              >
                {saving ? "Salvo..." : "Avanti →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Connettori */}
        {step === 3 && (
          <div>
            <div className="text-[22px] font-serif text-[#1a1a1a] mb-1">Connettori</div>
            <p className="text-[13px] text-[#9A9690] mb-5">Collega i tuoi strumenti aziendali per analizzare documenti direttamente in NormaAI.</p>
            <div className="space-y-3 mb-6">
              {CONNETTORI.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white border border-[#E5E1D8] rounded-xl px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[22px]">{c.icon}</span>
                    <span className="text-[13px] font-medium text-[#1a1a1a]">{c.label}</span>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("norma-open-modal", { detail: c.id }))}
                    className="text-[12px] text-accent border border-accent/30 px-3 py-1.5 rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    Connetti
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border border-[#E5E1D8] text-[#6B6763] py-3 rounded-xl text-[13px] hover:bg-[#F0EDE8] transition-colors">
                Indietro
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-accent text-white py-3 rounded-xl text-[13px] font-semibold hover:bg-[#c82d08] transition-colors"
              >
                Salta per ora →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="text-center py-4">
            <div className="text-[60px] mb-4">🚀</div>
            <div className="text-[24px] font-serif text-[#1a1a1a] mb-3">Tutto pronto!</div>
            <p className="text-[13.5px] text-[#6B6763] leading-relaxed mb-8 max-w-sm mx-auto">
              Il tuo spazio NormaAI Impresa è configurato. Fai la tua prima domanda normativa o carica un documento nel fascicolo aziendale.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-accent text-white py-3 rounded-xl font-semibold text-[14px] hover:bg-[#c82d08] transition-colors"
            >
              Inizia a usare NormaAI →
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
