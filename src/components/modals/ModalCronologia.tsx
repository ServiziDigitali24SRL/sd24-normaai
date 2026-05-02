"use client";

import { useState } from "react";
import ModalOverlay, {
  ModalClose,
  ModalTitle,
  ModalSub,
  BtnPrimary,
  BtnOutline,
} from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenCittadino: () => void;
  onOpenImpresa: () => void;
}

export default function ModalCronologia({
  open,
  onClose,
  onOpenCittadino,
  onOpenImpresa,
}: Props) {
  const [step, setStep] = useState<"lock" | "scelta">("lock");

  function handleClose() {
    setStep("lock");
    onClose();
  }

  return (
    <ModalOverlay open={open} onClose={handleClose}>
      <div className="p-7">
        <ModalClose onClose={handleClose} />

        {step === "lock" ? (
          <>
            <ModalTitle>Cronologia</ModalTitle>
            <ModalSub>Accedi per salvare e ritrovare le tue conversazioni</ModalSub>

            <div className="text-center py-8 text-[#7A766F] text-[13px]">
              <svg
                viewBox="0 0 24 24"
                className="w-[38px] h-[38px] stroke-[#2a2a2a] fill-none stroke-[1.5] mx-auto mb-3 block"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Registrazione gratuita richiesta
            </div>

            <BtnPrimary onClick={() => setStep("scelta")}>
              Registrati gratis
            </BtnPrimary>
          </>
        ) : (
          <>
            <ModalTitle>Chi sei?</ModalTitle>
            <ModalSub>Scegli il tipo di account per continuare</ModalSub>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => { handleClose(); onOpenCittadino(); }}
                className="flex items-center gap-4 bg-card border border-card-border rounded-xl p-4 text-left hover:border-[#D5D0C8] transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center text-[18px] shrink-0 group-hover:bg-[#F0EDE8] transition-colors">
                  👤
                </div>
                <div>
                  <div className="text-[#1a1a1a] text-[13.5px] font-medium">Sono un cittadino</div>
                  <div className="text-[#6B6763] text-[12px] mt-[2px]">Multe, contratti, condominio, lavoro…</div>
                </div>
              </button>

              <button
                onClick={() => { handleClose(); onOpenImpresa(); }}
                className="flex items-center gap-4 bg-card border border-card-border rounded-xl p-4 text-left hover:border-[#D5D0C8] transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-[#F0EDE8] flex items-center justify-center text-[18px] shrink-0 group-hover:bg-[#F0EDE8] transition-colors">
                  🏢
                </div>
                <div>
                  <div className="text-[#1a1a1a] text-[13.5px] font-medium">Sono un&apos;impresa</div>
                  <div className="text-[#6B6763] text-[12px] mt-[2px]">Compliance, contratti commerciali, lavoro…</div>
                </div>
              </button>
            </div>

            <BtnOutline onClick={() => setStep("lock")} className="mt-4">
              ← Indietro
            </BtnOutline>
          </>
        )}
      </div>
    </ModalOverlay>
  );
}
