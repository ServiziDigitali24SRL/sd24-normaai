"use client";

import { useState, useRef } from "react";
import ModalOverlay, { ModalClose } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  companyName: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DOMANDE_GUIDA = [
  "Qual è il core business della tua azienda?",
  "Chi sono i tuoi principali clienti e competitor?",
  "Quali sono i rischi normativi principali nel tuo settore?",
  "Quali obiettivi di crescita hai per i prossimi 12 mesi?",
  "Hai già una strategia di compliance documentata?",
];

export default function ModalBusinessPlan({ open, onClose, userId, companyName }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Ciao! Sono l'assistente NormaAI per la pianificazione aziendale. Ti aiuto a creare un Business Plan con una sezione dedicata alla compliance normativa.\n\nIniziamo: ${DOMANDE_GUIDA[0]}`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [questionIdx, setQuestionIdx] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    const newMsgs: Message[] = [...messages, { role: "user", content: q }];
    setMessages(newMsgs);
    setLoading(true);

    const nextIdx = Math.min(questionIdx + 1, DOMANDE_GUIDA.length - 1);
    const nextQuestion = questionIdx < DOMANDE_GUIDA.length - 1
      ? `\n\nGrazie. Prossima domanda: ${DOMANDE_GUIDA[nextIdx]}`
      : "\n\nHo raccolto tutte le informazioni necessarie. Posso ora generare un draft del Business Plan con la sezione compliance. Vuoi procedere?";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          vertical: "Compliance",
          userId,
          conversationHistory: newMsgs.slice(-6).map(m => ({ role: m.role, content: m.content })),
          turnNumber: newMsgs.length,
        }),
      });

      if (!res.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: "Errore nella risposta AI. Riprova." }]);
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      let text = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const obj = JSON.parse(line.slice(6));
            if (obj.type === "text") {
              text += obj.text;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: text + nextQuestion };
                return copy;
              });
            }
          } catch {}
        }
      }
      setQuestionIdx(nextIdx);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Errore di rete. Riprova." }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function exportPdf() {
    setExporting(true);
    // Collect conversation as text and trigger download
    const content = messages.map(m => `${m.role === "user" ? "IMPRESA" : "NORMAAI"}: ${m.content}`).join("\n\n");
    const blob = new Blob([`BUSINESS PLAN DRAFT — ${companyName || "Azienda"}\nGenerato da NormaAI — ${new Date().toLocaleDateString("it-IT")}\n\nDISCLAIMER: Questo documento è generato da AI a scopo informativo e non sostituisce consulenza legale professionale.\n\n${content}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-plan-normaai-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="flex flex-col h-[85vh] max-h-[700px] w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E1D8] shrink-0">
          <div>
            <div className="text-[18px] font-serif text-[#1a1a1a]">Business Plan AI</div>
            <div className="text-[11px] text-[#9A9690] mt-0.5">Chat guidata per il tuo piano aziendale + compliance</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportPdf}
              disabled={exporting || messages.length < 4}
              className="text-[12px] border border-[#E5E1D8] text-[#6B6763] px-3 py-1.5 rounded-lg hover:bg-[#F0EDE8] transition-colors disabled:opacity-40"
            >
              {exporting ? "Export…" : "⬇ Esporta"}
            </button>
            <ModalClose onClose={onClose} />
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-[#FFFBF0] border-b border-[#FFE08A] px-5 py-2 text-[11px] text-[#9B6B00] shrink-0">
          ⚠️ <strong>Disclaimer:</strong> Documento generato da AI a scopo informativo. Non sostituisce consulenza professionale legale, fiscale o finanziaria.
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-accent text-white rounded-br-sm" : "bg-white border border-[#E5E1D8] text-[#1a1a1a] rounded-bl-sm shadow-sm"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E5E1D8] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#9A9690] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#9A9690] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#9A9690] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#E5E1D8] bg-white px-4 py-3 flex items-end gap-2 shrink-0">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Rispondi alla domanda…"
            className="flex-1 resize-none rounded-xl border border-[#E5E1D8] bg-[#FAFAF8] px-4 py-2.5 text-[13px] focus:outline-none focus:border-[#C8C2BA] min-h-[44px] max-h-[120px]"
            rows={1}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="h-[44px] w-[44px] bg-accent rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#c82d08] transition-colors shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
            </svg>
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
