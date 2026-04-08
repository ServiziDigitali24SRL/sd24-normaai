"use client";

import { useState } from "react";
import ModalOverlay, {
  ModalClose,
  FormInput,
  BtnPrimary,
} from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ModalBug({ open, onClose }: Props) {
  const [desc, setDesc] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function handleClose() {
    setDesc(""); setEmail(""); setSent(false);
    onClose();
  }

  async function handleSubmit() {
    if (!desc.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desc, email, url: window.location.href, ua: navigator.userAgent }),
      });
    } catch { /* silent */ }
    setLoading(false);
    setSent(true);
  }

  return (
    <ModalOverlay open={open} onClose={handleClose}>
      <div className="p-6">
        <ModalClose onClose={handleClose} />
        <div className="font-serif text-[20px] mb-4 mt-1">Hai trovato un bug?</div>

        {sent ? (
          <div className="py-6">
            {/* Bot message */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-accent shrink-0 flex items-center justify-center mt-[2px]">
                <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="#fff" stroke="none">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <div className="bg-[#F0EDE8] border border-[#E5E1D8] rounded-2xl rounded-tl-sm px-4 py-3 text-[13.5px] text-[#3D3A37] leading-[1.7]">
                Ricevuto! 🙌<br />
                <span className="text-[#1a1a1a]">Lo aggiustiamo presto.</span> Grazie per la segnalazione — ci aiuti a migliorare NormaAI per tutti.
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-[10px] rounded-[9px] text-[13px] bg-[#F5F3F0] border border-[#E5E1D8] text-[#6B6763] hover:border-[#C8C2BA] hover:text-[#1a1a1a] transition-colors cursor-pointer mt-2"
            >
              Chiudi
            </button>
          </div>
        ) : (
          <div className="py-2">
            {/* Bot intro message */}
            <div className="flex items-start gap-3 mb-5">
              <div className="w-7 h-7 rounded-full bg-accent shrink-0 flex items-center justify-center mt-[2px]">
                <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="#fff" stroke="none">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <div className="bg-[#F0EDE8] border border-[#E5E1D8] rounded-2xl rounded-tl-sm px-4 py-3 text-[13.5px] text-[#3D3A37] leading-[1.7]">
                Ciao! Hai trovato qualcosa che non funziona?<br />
                <span className="text-[#1a1a1a]">Descrivimi cosa è successo</span> — lo sistemo il prima possibile.
              </div>
            </div>

            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              placeholder="Es. Ho scritto una domanda, premuto invio e non è successo nulla..."
              className="w-full py-[9px] px-[13px] bg-[#F5F3F0] border border-[#E5E1D8] rounded-[9px] text-[#1a1a1a] text-[13px] outline-none transition-colors duration-150 focus:border-[#C8C2BA] placeholder:text-[#9A9690] resize-none mb-3"
            />

            <FormInput type="email" placeholder="La tua email (opzionale — ti aggiorno quando è risolto)" value={email} onChange={setEmail} />

            <BtnPrimary
              onClick={handleSubmit}
              className={`mt-4 ${!desc.trim() ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {loading ? "Invio..." : "Invia segnalazione"}
            </BtnPrimary>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
