"use client";

import { useState } from "react";
import ModalOverlay, {
  ModalClose,
  FormLabel,
  FormInput,
} from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = "landing" | "form" | "done";

export default function ModalInvesti({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>("landing");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setStep("landing");
    setName(""); setEmail(""); setPhone("");
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/invest-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
    } catch { /* silently fail — lead still noted */ }
    setLoading(false);
    setStep("done");
  }

  return (
    <ModalOverlay open={open} onClose={handleClose} wide>
      <ModalClose onClose={handleClose} />

      {step === "landing" && (
        <div className="p-7">
          {/* Header */}
          <div className="mb-6">
            <div className="text-[11px] text-gold uppercase tracking-[1px] mb-2">Opportunità early-stage</div>
            <h2 className="font-serif text-[28px] leading-[1.15] tracking-[-0.5px] text-cream mb-3">
              L&apos;AI normativa italiana<br />non ha ancora un leader.
            </h2>
            <p className="text-[13.5px] text-[#777] leading-[1.7]">
              787.000 professionisti del diritto in Italia pagano centinaia di euro al mese per accedere
              a banche dati normative. NormaAI li serve con AI, a un decimo del costo.
            </p>
          </div>

          {/* Pillars */}
          <div className="flex flex-col gap-3 mb-6">
            <Pillar
              icon="⚖️"
              title="Mercato da €105M SAM"
              body="Avvocati, commercialisti, consulenti del lavoro, ingegneri. Un mercato frammentato, senza un prodotto AI dedicato."
            />
            <Pillar
              icon="🧠"
              title="Corpus normativo proprietario"
              body="600K+ chunks di legislazione italiana indicizzata con RAG. 75% copertura oggi, target 95% entro fine 2026."
            />
            <Pillar
              icon="💶"
              title="Revenue da giorno 1"
              body="Modello subscription + wallet lead. Cittadino €9/mese, Impresa €29/mese, Professionista €29/mese + lead dal wallet (€75/€150, senza scadenza)."
            />
            <Pillar
              icon="🚀"
              title="Zero competitor diretti"
              body="Le banche dati esistenti (Giuffrè, Wolters Kluwer) costano €2.000+/anno e non hanno AI conversazionale nativa."
            />
          </div>

          {/* CTA */}
          <button
            onClick={() => setStep("form")}
            className="w-full py-[13px] rounded-[10px] text-[14px] font-semibold bg-gold text-black hover:brightness-110 transition-all border-none cursor-pointer"
          >
            Voglio saperne di più →
          </button>
          <p className="text-[11px] text-[#444] text-center mt-3">
            Nessun impegno. Ti contatteremo per spiegarti i dettagli.
          </p>
        </div>
      )}

      {step === "form" && (
        <div className="p-7">
          <button
            onClick={() => setStep("landing")}
            className="text-[12px] text-[#555] hover:text-cream transition-colors mb-5 inline-block bg-transparent border-none cursor-pointer p-0"
          >
            ← Torna all&apos;opportunità
          </button>
          <div className="text-[11px] text-gold uppercase tracking-[1px] mb-1">Early investor</div>
          <h2 className="font-serif text-[24px] tracking-[-0.5px] text-cream mb-1">Lascia i tuoi dati</h2>
          <p className="text-[12.5px] text-[#555] mb-6">
            Ti chiamiamo noi — spieghiamo tutto e rispondiamo alle tue domande.
          </p>

          <FormLabel>Nome e Cognome *</FormLabel>
          <FormInput placeholder="Mario Rossi" value={name} onChange={setName} />

          <FormLabel>Email *</FormLabel>
          <FormInput type="email" placeholder="mario@email.it" value={email} onChange={setEmail} />

          <FormLabel>Telefono *</FormLabel>
          <FormInput type="tel" placeholder="+39 333 000 0000" value={phone} onChange={setPhone} />

          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !email.trim() || !phone.trim()}
            className="w-full py-[12px] rounded-[10px] text-[13.5px] font-semibold mt-5 bg-gold text-black hover:brightness-110 transition-all border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Invio in corso..." : "Richiedi informazioni"}
          </button>
          <p className="text-[11px] text-[#444] text-center mt-3">
            I tuoi dati non vengono condivisi con terzi · Privacy Policy
          </p>
        </div>
      )}

      {step === "done" && (
        <div className="p-7 text-center py-14">
          <div className="text-[36px] mb-4">✦</div>
          <h2 className="font-serif text-[26px] text-gold mb-2">Perfetto, grazie!</h2>
          <p className="text-[13.5px] text-[#777] mb-6 leading-[1.7]">
            Ti contatteremo entro 24 ore al numero che hai indicato.<br />
            Nel frattempo puoi esplorare NormaAI liberamente.
          </p>
          <button
            onClick={handleClose}
            className="px-6 py-[10px] rounded-[9px] text-[13px] bg-[#1c1c1c] border border-[#333] text-cream hover:border-[#555] transition-colors cursor-pointer"
          >
            Esplora NormaAI
          </button>
        </div>
      )}
    </ModalOverlay>
  );
}

function Pillar({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex gap-3 bg-[#141414] border border-[#1e1e1e] rounded-xl p-[14px]">
      <div className="text-[20px] shrink-0 mt-[1px]">{icon}</div>
      <div>
        <div className="text-[13px] font-medium text-cream mb-[3px]">{title}</div>
        <div className="text-[12px] text-[#666] leading-[1.6]">{body}</div>
      </div>
    </div>
  );
}
