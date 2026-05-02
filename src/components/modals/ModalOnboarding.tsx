"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import ModalOverlay, { ModalClose } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
}

// ── Struttura domande ─────────────────────────────────────────────────────────

type QuestionId =
  | "A1" | "A2" | "A3"
  | "B1" | "B2" | "B3"
  | "C1" | "C2" | "C3"
  | "D1" | "D2" | "D3" | "D4"
  | "E1" | "E2" | "E3" | "E4"
  | "F1" | "F2" | "F3" | "F4";

interface Question {
  id: QuestionId;
  testo: string;
  opzioni: string[];
  showIf?: (answers: Record<string, string>) => boolean;
}

const QUESTIONS: Question[] = [
  // BLOCCO A
  { id: "A1", testo: "Sei italiano o straniero?", opzioni: ["Italiano", "Straniero", "UE non italiano"] },
  { id: "A2", testo: "Quanti anni hai?", opzioni: ["18-25", "26-35", "36-50", "51-65", "65+"] },
  { id: "A3", testo: "In quale città vivi?", opzioni: [] }, // input libero
  // BLOCCO B
  { id: "B1", testo: "Qual è il tuo stato civile?", opzioni: ["Single", "Sposato/a", "Separato/a", "Divorziato/a", "Vedovo/a"] },
  { id: "B2", testo: "Hai figli?", opzioni: ["No", "Sì, minorenni", "Sì, maggiorenni"] },
  { id: "B3", testo: "Hai familiari a carico?", opzioni: ["No", "Sì"] },
  // BLOCCO C
  { id: "C1", testo: "Qual è la tua situazione lavorativa?", opzioni: ["Dipendente", "Autonomo / Freelance", "Disoccupato/a", "Pensionato/a", "Studente"] },
  { id: "C2", testo: "Hai una Partita IVA?", opzioni: ["Sì", "No"], showIf: (a) => a["C1"] === "Autonomo / Freelance" },
  { id: "C3", testo: "Hai mai avuto problemi con il datore di lavoro?", opzioni: ["No", "Sì, risolti", "Sì, in corso"] },
  // BLOCCO D
  { id: "D1", testo: "Riguardo alla casa, sei...", opzioni: ["Proprietario/a", "Affittuario/a", "Vivo con familiari"] },
  { id: "D2", testo: "Hai problemi aperti riguardo alla casa?", opzioni: ["No", "Condominio", "Locazione", "Entrambi"] },
  { id: "D3", testo: "Hai un'automobile?", opzioni: ["Sì", "No"] },
  { id: "D4", testo: "Hai ricevuto una multa?", opzioni: ["No", "Sì, recente", "Sì, vecchia non pagata"] },
  // BLOCCO E
  { id: "E1", testo: "Hai ricevuto una cartella esattoriale o avviso bonario?", opzioni: ["No", "Sì, recente", "Sì, scaduta"] },
  { id: "E2", testo: "Hai una causa legale o diffida in corso?", opzioni: ["No", "Sì, come attore", "Sì, come convenuto"] },
  { id: "E3", testo: "Hai problemi familiari aperti?", opzioni: ["No", "Separazione", "Eredità", "Affidamento"] },
  { id: "E4", testo: "Hai bisogno di un professionista ora?", opzioni: ["No", "Forse", "Sì, urgente"] },
  // BLOCCO F (solo stranieri)
  { id: "F1", testo: "Che tipo di permesso di soggiorno hai?", opzioni: ["Lavoro", "Famiglia", "Studio", "Protezione internazionale", "Lungo periodo", "Altro"], showIf: (a) => a["A1"] === "Straniero" },
  { id: "F2", testo: "Quando scade il tuo permesso?", opzioni: ["Entro 1 mese", "1-3 mesi", "3-6 mesi", "Oltre 6 mesi", "Indeterminato"], showIf: (a) => a["A1"] === "Straniero" },
  { id: "F3", testo: "Hai un ricongiungimento familiare in corso?", opzioni: ["No", "Sì, in attesa", "Sì, approvato"], showIf: (a) => a["A1"] === "Straniero" },
  { id: "F4", testo: "Stai cercando lavoro in Italia?", opzioni: ["No", "Sì"], showIf: (a) => a["A1"] === "Straniero" },
];

function getVisibleQuestions(answers: Record<string, string>): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(answers));
}

function buildProSummary(answers: Record<string, string>): string[] {
  const lines: string[] = [];
  if (answers["D4"] && answers["D4"] !== "No") lines.push("Ricorso contro multe e sanzioni");
  if (answers["E1"] && answers["E1"] !== "No") lines.push("Cartelle esattoriali e debiti fiscali");
  if (answers["E2"] && answers["E2"] !== "No") lines.push("Supporto in cause e contenziosi");
  if (answers["E3"] && answers["E3"] !== "No") lines.push("Diritto di famiglia (" + answers["E3"].toLowerCase() + ")");
  if (answers["D2"] && answers["D2"] !== "No") lines.push("Problemi di " + (answers["D2"] === "Entrambi" ? "condominio e locazione" : answers["D2"].toLowerCase()));
  if (answers["C3"] && answers["C3"] !== "No") lines.push("Vertenze lavorative");
  if (answers["A1"] === "Straniero") lines.push("Permessi di soggiorno e immigrazione");
  if (lines.length === 0) lines.push("Ricerca normative", "Analisi contratti", "Domande legali illimitate");
  return lines.slice(0, 5);
}

export default function ModalOnboarding({ open, onClose, userId, userEmail }: Props) {
  const [phase, setPhase] = useState<"video" | "questions" | "finale">("video");
  const [videoReady, setVideoReady] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cityInput, setCityInput] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const visibleQuestions = getVisibleQuestions(answers);
  const currentQ = visibleQuestions[currentIdx];
  const progress = Math.round(((currentIdx) / visibleQuestions.length) * 100);

  const handleAnswer = useCallback((value: string) => {
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);
    const newVisible = getVisibleQuestions(newAnswers);
    if (currentIdx + 1 >= newVisible.length) {
      saveAndShowFinale(newAnswers);
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  }, [answers, currentQ, currentIdx]);

  const handleCitySubmit = useCallback(() => {
    if (!cityInput.trim()) return;
    handleAnswer(cityInput.trim());
    setCityInput("");
  }, [cityInput, handleAnswer]);

  async function saveAndShowFinale(finalAnswers: Record<string, string>) {
    setPhase("finale");
    // Salva in profiles.onboarding_data — fire and forget
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ onboarding_data: finalAnswers }),
      });
    } catch { /* non bloccante */ }
  }

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "cittadino_pro", userId, email: userEmail }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Errore nel caricamento del pagamento. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhase("video");
    setVideoReady(false);
    setCurrentIdx(0);
    setAnswers({});
    setCityInput("");
  }

  // Non resettare alla chiusura: il modal riappare SEMPRE, ma si riparte dall'inizio
  function handleClose() {
    reset();
    onClose();
  }

  const proItems = buildProSummary(answers);

  return (
    <ModalOverlay open={open} onClose={handleClose} maxWidth="sm:max-w-[500px]">
      <div className="p-7">
        <ModalClose onClose={handleClose} />

        {/* ── PHASE: VIDEO ─────────────────────────────────────────── */}
        {phase === "video" && (
          <>
            <div className="inline-flex items-center gap-1.5 bg-accent/10 text-accent px-3 py-1 rounded-full text-[11px] font-semibold mb-4">
              ⚡ NormaAI PRO
            </div>
            <div className="font-serif text-[22px] text-[#1a1a1a] mb-1">
              Hai usato tutte le query di oggi
            </div>
            <div className="text-[12.5px] text-[#6B6763] mb-5">
              Guarda come NormaAI PRO può aiutarti, poi personalizza la tua esperienza.
            </div>

            {/* Video placeholder */}
            <div className="relative bg-[#1a1a1a] rounded-xl overflow-hidden aspect-video mb-5 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-16 h-16 rounded-full bg-accent/80 flex items-center justify-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><polygon points="5,3 19,12 5,21"/></svg>
                </div>
                <div className="text-[14px] font-medium">Scopri NormaAI PRO</div>
                <div className="text-[11px] text-white/60 mt-1">60 secondi</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPhase("questions")}
                className="flex-1 py-[10px] rounded-[9px] text-[13px] font-medium border border-[#D5D0C8] bg-transparent text-[#6B6763] cursor-pointer hover:bg-[#F7F5F2] transition-colors"
              >
                Salta video
              </button>
              <button
                onClick={() => { setVideoReady(true); setTimeout(() => setPhase("questions"), 300); }}
                className="flex-1 py-[10px] rounded-[9px] text-[13px] font-medium bg-accent text-white cursor-pointer hover:bg-[#c82d08] transition-colors"
              >
                Continua →
              </button>
            </div>
          </>
        )}

        {/* ── PHASE: QUESTIONS ─────────────────────────────────────── */}
        {phase === "questions" && currentQ && (
          <>
            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between text-[11px] text-[#9A9690] mb-1.5">
                <span>Personalizzazione</span>
                <span>{currentIdx + 1} / {visibleQuestions.length}</span>
              </div>
              <div className="h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="font-serif text-[20px] text-[#1a1a1a] mb-5 min-h-[56px]">
              {currentQ.testo}
            </div>

            {/* Input libero per città (A3) */}
            {currentQ.id === "A3" ? (
              <div>
                <input
                  type="text"
                  placeholder="es. Milano, Roma, Napoli..."
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCitySubmit()}
                  className="w-full py-3 px-4 bg-[#F0EDE8] border border-[#D5D0C8] rounded-[9px] text-[#1a1a1a] text-[15px] outline-none focus:border-[#B0A898] focus:bg-white placeholder:text-[#A09B93] mb-3"
                  autoFocus
                />
                <button
                  onClick={handleCitySubmit}
                  disabled={!cityInput.trim()}
                  className="w-full py-[10px] rounded-[9px] text-[13px] font-medium bg-accent text-white cursor-pointer hover:bg-[#c82d08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continua →
                </button>
              </div>
            ) : (
              /* Opzioni a scelta singola */
              <div className="flex flex-col gap-2">
                {currentQ.opzioni.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className="w-full text-left py-3 px-4 rounded-[9px] border border-[#D5D0C8] bg-[#FAFAF8] text-[#1a1a1a] text-[13.5px] cursor-pointer hover:border-accent hover:bg-[#FFF5F2] transition-all duration-150"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Back */}
            {currentIdx > 0 && (
              <button
                onClick={() => setCurrentIdx(currentIdx - 1)}
                className="mt-4 text-[11.5px] text-[#9A9690] hover:text-[#6B6763] cursor-pointer bg-transparent border-none block mx-auto"
              >
                ← Indietro
              </button>
            )}
          </>
        )}

        {/* ── PHASE: FINALE ────────────────────────────────────────── */}
        {phase === "finale" && (
          <>
            <div className="inline-flex items-center gap-1.5 bg-[#F0FBF0] text-[#2E7D32] px-3 py-1 rounded-full text-[11px] font-semibold mb-4">
              ✓ Profilo completato
            </div>
            <div className="font-serif text-[21px] text-[#1a1a1a] mb-2">
              NormaAI PRO fa per te
            </div>
            <div className="text-[12.5px] text-[#6B6763] mb-4">
              Sulla base delle tue risposte, ti aiuto con:
            </div>

            <div className="bg-[#FFFAF8] border border-[#F5D5C8] rounded-xl p-4 mb-5">
              <div className="flex flex-col gap-2.5">
                {proItems.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[13px] text-[#4A4642]">
                    <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] stroke-accent fill-none stroke-[2.5] shrink-0">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                    {item}
                  </div>
                ))}
                <div className="flex items-center gap-2 text-[13px] text-[#4A4642]">
                  <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] stroke-accent fill-none stroke-[2.5] shrink-0">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  Query <strong>illimitate</strong> ogni giorno
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="text-center mb-4">
              <span className="font-serif text-[32px] text-[#1a1a1a]">€9</span>
              <span className="text-[13px] text-[#6B6763]">/mese &middot; Cancella quando vuoi</span>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-[12px] rounded-[9px] text-[14px] font-semibold bg-accent text-white cursor-pointer hover:bg-[#c82d08] transition-colors shadow-[0_2px_12px_rgba(232,52,10,0.25)] disabled:opacity-70 mb-2"
            >
              {loading ? "Caricamento..." : "Attiva Cittadino PRO — €9/mese"}
            </button>

            <button
              onClick={handleClose}
              className="w-full py-[10px] rounded-[9px] text-[13px] text-[#6B6763] bg-transparent border border-[#D5D0C8] cursor-pointer hover:bg-[#F7F5F2] transition-colors"
            >
              Continua con il piano gratuito
            </button>

            <p className="text-[10.5px] text-[#9A9690] text-center mt-3">
              Pagamento sicuro via Stripe &middot; Nessun trial &middot; Accesso immediato
            </p>
          </>
        )}
      </div>
    </ModalOverlay>
  );
}
