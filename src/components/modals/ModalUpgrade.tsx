"use client";

import ModalOverlay, { ModalClose, BtnPrimary, BtnOutline } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
  feature?: string; // nome funzione bloccata (es. "Documenti", "Analisi contratto")
}

const PRO_FEATURES = [
  "Query illimitate ogni giorno",
  "Archivio documenti completo",
  "Estrazione automatica scadenze",
  "Analisi contratti e sentenze",
  "Notifiche email scadenze",
  "Tutto il piano Free incluso",
];

export default function ModalUpgrade({ open, onClose, feature }: Props) {
  async function handleUpgrade() {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "cittadino_pro" }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Errore nel caricamento del pagamento. Riprova.");
    }
  }

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="p-7">
        <ModalClose onClose={onClose} />

        {/* Badge PRO */}
        <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1 rounded-full text-[11px] font-semibold mb-4">
          ⚡ Funzione PRO
        </div>

        <div className="font-serif text-[22px] text-[#1a1a1a] mb-1">
          {feature ? `"${feature}" è riservato a NormaAI PRO` : "Passa a NormaAI PRO"}
        </div>
        <div className="text-[12.5px] text-[#6B6763] mb-5">
          Sblocca tutte le funzionalità avanzate con un abbonamento mensile.
        </div>

        {/* Pricing card */}
        <div className="bg-[#FFFAF8] border border-[#F5D5C8] rounded-xl p-5 mb-5">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="font-serif text-[36px] text-[#1a1a1a]">€9</span>
            <span className="text-[13px] text-[#6B6763]">/mese</span>
          </div>
          <div className="text-[11.5px] text-[#9A9690] mb-4">
            Nessun trial — accesso immediato. Cancella quando vuoi.
          </div>
          <div className="flex flex-col gap-[8px]">
            {PRO_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-[12.5px] text-[#4A4642]">
                <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] stroke-accent fill-none stroke-[2.5] shrink-0">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>

        <BtnPrimary onClick={handleUpgrade}>
          Attiva NormaAI PRO — €9/mese
        </BtnPrimary>
        <BtnOutline onClick={onClose}>
          Continua con il piano gratuito
        </BtnOutline>

        <p className="text-[10.5px] text-[#9A9690] text-center mt-3">
          Pagamento sicuro via Stripe &middot; Cancella in qualsiasi momento
        </p>
      </div>
    </ModalOverlay>
  );
}
