"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Professionista {
  id: string;
  nome: string;
  categoria: string;
  citta: string;
  valutazione: number;
  recensioni: number;
  avatar_initial: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  userEmail: string | null;
  conversationSummary: string; // riassunto della conversazione per il matching
  vertical: string | null;
  userCity?: string;
}

// Mock professionista — in produzione viene da un'API di matching
function getMockedProfessionista(categoria: string, citta: string): Professionista {
  const categorie: Record<string, string> = {
    avvocato: "Avvocato",
    commercialista: "Commercialista",
    lavoro: "Consulente del Lavoro",
    tecnico: "Ingegnere",
    finanziario: "Consulente Finanziario",
  };
  const nomi = ["Marco Ferretti", "Laura Bianchi", "Giulio Marini", "Alessia Conti", "Roberto Esposito"];
  const nome = nomi[Math.floor(Math.random() * nomi.length)];
  const cat = categorie[categoria] ?? "Professionista";
  return {
    id: `prof-${Date.now()}`,
    nome,
    categoria: cat,
    citta: citta || "Italia",
    valutazione: 4.6 + Math.random() * 0.4,
    recensioni: 20 + Math.floor(Math.random() * 80),
    avatar_initial: nome.charAt(0),
  };
}

type Phase = "match" | "otp_input" | "otp_success" | "otp_error";

export default function ModalPopupProfessionista({ open, onClose, userId, userEmail, conversationSummary, vertical, userCity }: Props) {
  const [phase, setPhase] = useState<Phase>("match");
  const [professionista, setProfessionista] = useState<Professionista | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      const categoria = vertical?.toLowerCase().replace(/[\s/]+/g, "-") ?? "avvocato";
      setProfessionista(getMockedProfessionista(categoria, userCity ?? ""));
      setPhase("match");
      setOtp("");
      setError("");
    }
  }, [open, vertical, userCity]);

  async function handleConfirm() {
    if (!userId || !userEmail) {
      // Utente non loggato: apri modal cittadino
      window.dispatchEvent(new CustomEvent("norma-open-modal", { detail: "cittadino" }));
      onClose();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email: userEmail,
          leadContext: {
            summary: conversationSummary,
            vertical,
            professionistaId: professionista?.id,
            professionistaNome: professionista?.nome,
            professionistaCategoria: professionista?.categoria,
          },
        }),
      });
      if (!res.ok) throw new Error("Errore invio OTP");
      setPhase("otp_input");
    } catch {
      setError("Errore nell'invio del codice. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) { setError("Inserisci il codice a 6 cifre."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email: userEmail,
          otp,
          leadContext: {
            summary: conversationSummary,
            vertical,
            professionistaId: professionista?.id,
            professionistaNome: professionista?.nome,
            professionistaCategoria: professionista?.categoria,
            userCity,
          },
        }),
      });
      if (res.ok) {
        setPhase("otp_success");
      } else {
        const data = await res.json();
        setError(data.error || "Codice non valido o scaduto.");
        setPhase("otp_error");
      }
    } catch {
      setError("Errore di verifica. Riprova.");
      setPhase("otp_error");
    } finally {
      setLoading(false);
    }
  }

  if (!professionista) return null;

  const stars = Math.round(professionista.valutazione);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop leggero */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-[300]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Card — bottom right su desktop, bottom sheet su mobile */}
          <div className="fixed z-[301] inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:max-w-[360px] pointer-events-none">
            <motion.div
              className="bg-white border border-[#E5E1D8] rounded-t-[20px] sm:rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.15)] p-5 pointer-events-auto"
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Close */}
              <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-[#9A9690] hover:text-[#1a1a1a] text-[18px] bg-transparent border-none cursor-pointer rounded-lg hover:bg-[#F0EDE8] transition-colors">×</button>

              {/* ── MATCH PHASE ─────────────────────────────────── */}
              {phase === "match" && (
                <>
                  <div className="text-[10.5px] text-accent font-semibold uppercase tracking-wide mb-3">
                    ⚡ Professionista disponibile per te
                  </div>

                  {/* Professionista card */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white text-[18px] font-bold shrink-0">
                      {professionista.avatar_initial}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-[#1a1a1a]">{professionista.nome}</div>
                      <div className="text-[12px] text-[#6B6763]">{professionista.categoria} · {professionista.citta}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} viewBox="0 0 24 24" className={`w-3 h-3 ${i < stars ? "fill-[#F5A623]" : "fill-[#E5E1D8]"}`}>
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                          </svg>
                        ))}
                        <span className="text-[11px] text-[#9A9690] ml-0.5">{professionista.valutazione.toFixed(1)} ({professionista.recensioni})</span>
                      </div>
                    </div>
                  </div>

                  {/* Riassunto caso */}
                  {conversationSummary && (
                    <div className="bg-[#F7F5F2] rounded-[9px] p-3 mb-3 text-[12px] text-[#4A4642] line-clamp-2">
                      "{conversationSummary.slice(0, 120)}{conversationSummary.length > 120 ? "..." : ""}"
                    </div>
                  )}

                  {error && <div className="text-accent text-[11.5px] mb-2">{error}</div>}

                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full py-[10px] rounded-[9px] text-[13px] font-semibold bg-accent text-white cursor-pointer hover:bg-[#c82d08] transition-colors mb-2 disabled:opacity-70 border-none"
                  >
                    {loading ? "Invio codice..." : `Sì, voglio parlare con ${professionista.nome.split(" ")[0]}`}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-[8px] rounded-[9px] text-[12.5px] text-[#6B6763] bg-transparent border border-[#D5D0C8] cursor-pointer hover:bg-[#F7F5F2] transition-colors"
                  >
                    No, continuo da solo
                  </button>
                </>
              )}

              {/* ── OTP INPUT PHASE ─────────────────────────────── */}
              {phase === "otp_input" && (
                <>
                  <div className="text-[13px] font-semibold text-[#1a1a1a] mb-1">Verifica la tua email</div>
                  <div className="text-[12px] text-[#6B6763] mb-4">
                    Abbiamo inviato un codice a 6 cifre a <strong>{userEmail}</strong>. Inseriscilo per confermare il contatto.
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full py-3 px-4 text-center text-[22px] tracking-[0.4em] bg-[#F0EDE8] border border-[#D5D0C8] rounded-[9px] text-[#1a1a1a] outline-none focus:border-accent mb-3"
                    autoFocus
                  />
                  {error && <div className="text-accent text-[11.5px] mb-2">{error}</div>}
                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    className="w-full py-[10px] rounded-[9px] text-[13px] font-semibold bg-accent text-white cursor-pointer hover:bg-[#c82d08] transition-colors disabled:opacity-70 border-none mb-2"
                  >
                    {loading ? "Verifica..." : "Conferma"}
                  </button>
                  <div className="text-[11px] text-[#9A9690] text-center">Il codice scade in 10 minuti</div>
                </>
              )}

              {/* ── OTP SUCCESS ──────────────────────────────────── */}
              {phase === "otp_success" && (
                <>
                  <div className="text-center py-2">
                    <div className="w-12 h-12 rounded-full bg-[#F0FBF0] border border-[#C3E6C3] flex items-center justify-center mx-auto mb-3">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-[#2E7D32] fill-none stroke-[2.5]"><polyline points="20,6 9,17 4,12"/></svg>
                    </div>
                    <div className="text-[14px] font-semibold text-[#1a1a1a] mb-1">Richiesta inviata!</div>
                    <div className="text-[12px] text-[#6B6763] mb-4">
                      {professionista.nome} riceverà la tua richiesta. Sarai contattato entro 24 ore lavorative.
                    </div>
                    <button onClick={onClose} className="w-full py-[9px] rounded-[9px] text-[13px] text-white bg-accent border-none cursor-pointer hover:bg-[#c82d08] transition-colors">
                      Perfetto, grazie
                    </button>
                  </div>
                </>
              )}

              {/* ── OTP ERROR ────────────────────────────────────── */}
              {phase === "otp_error" && (
                <>
                  <div className="text-center py-2">
                    <div className="text-[14px] font-semibold text-[#1a1a1a] mb-2">Codice non valido</div>
                    <div className="text-[12px] text-[#6B6763] mb-4">{error}</div>
                    <button onClick={() => { setPhase("otp_input"); setError(""); setOtp(""); }} className="w-full py-[9px] rounded-[9px] text-[13px] bg-accent text-white border-none cursor-pointer hover:bg-[#c82d08] transition-colors mb-2">
                      Riprova
                    </button>
                    <button onClick={onClose} className="w-full py-[8px] rounded-[9px] text-[12.5px] text-[#6B6763] bg-transparent border border-[#D5D0C8] cursor-pointer hover:bg-[#F7F5F2] transition-colors">
                      Chiudi
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
