"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View = "loading" | "disconnected" | "connected" | "analyzing" | "result";

export default function ModalGmail({ open, onClose }: Props) {
  const [view, setView] = useState<View>("loading");
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [emailCount, setEmailCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setView("loading");
    setError("");
    fetch("/api/gmail/status")
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setGmailEmail(d.email);
          setView("connected");
        } else {
          setView("disconnected");
        }
      })
      .catch(() => setView("disconnected"));
  }, [open]);

  function handleClose() {
    setView("loading");
    setTargetEmail("");
    setAnalysis("");
    setError("");
    onClose();
  }

  function handleConnect() {
    // Redirect to OAuth initiation endpoint
    window.location.href = "/api/auth/gmail";
  }

  async function handleAnalyze() {
    if (!targetEmail.trim()) { setError("Inserisci l'indirizzo email da analizzare"); return; }
    setView("analyzing");
    setError("");
    try {
      const res = await fetch("/api/gmail/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: targetEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore analisi"); setView("connected"); return; }
      setAnalysis(data.analysis);
      setEmailCount(data.count);
      setView("result");
    } catch {
      setError("Errore di connessione");
      setView("connected");
    }
  }

  return (
    <ModalOverlay open={open} onClose={handleClose}>
      <div className="p-7 max-h-[85vh] overflow-y-auto">
        <ModalClose onClose={handleClose} />

        {view === "loading" && (
          <div className="py-12 text-center">
            <div className="text-[13px] text-[#555]">Connessione in corso…</div>
          </div>
        )}

        {view === "disconnected" && (
          <div>
            <ModalTitle>Analisi Corrispondenza</ModalTitle>
            <div className="mt-4 text-[13px] text-[#666] leading-[1.6]">
              Connetti il tuo Gmail per analizzare le email con una persona specifica.
              NormaAI leggerà le email <strong className="text-[#888]">in sola lettura</strong> e
              identificherà aspetti legali, obblighi contrattuali e scadenze rilevanti.
            </div>

            <div className="mt-5 p-4 rounded-xl border border-[#1e1e1e] bg-[#0f0f0f]">
              <div className="flex items-start gap-3">
                <div className="text-[18px] mt-[1px]">🔒</div>
                <div>
                  <div className="text-[12px] font-semibold text-[#888] mb-1">Privacy first</div>
                  <div className="text-[11px] text-[#555] leading-[1.5]">
                    Analizziamo solo le email con l'indirizzo che inserisci tu. Non scansioniamo l'intera casella. Nessun dato viene salvato.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleConnect}
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#2a2a2a] bg-white text-[#333] font-semibold text-[13px] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8] shrink-0">
                <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Connetti Gmail
            </button>
          </div>
        )}

        {(view === "connected" || view === "analyzing") && (
          <div>
            {/* Back arrow if coming from result */}
            <div className="flex items-center gap-2 mb-5">
              <ModalTitle>Analisi Corrispondenza</ModalTitle>
              {gmailEmail && (
                <span className="ml-auto text-[10px] text-[#444] bg-[#161616] border border-[#252525] px-2 py-[3px] rounded-md truncate max-w-[140px]">
                  {gmailEmail}
                </span>
              )}
            </div>

            <div className="text-[12px] text-[#555] mb-4 leading-[1.5]">
              Inserisci l'indirizzo email di una persona. NormaAI analizzerà tutta la
              vostra corrispondenza e rileverà aspetti legali rilevanti.
            </div>

            <div className="text-[10px] uppercase tracking-[0.06em] text-[#444] mb-[6px]">
              Indirizzo email da analizzare
            </div>
            <input
              type="email"
              placeholder="es. avvocato@studio.it"
              value={targetEmail}
              onChange={e => setTargetEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyze()}
              className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-[10px] text-[13px] text-[#ccc] outline-none focus:border-[#333] placeholder:text-[#333]"
              disabled={view === "analyzing"}
            />

            {error && <div className="mt-2 text-[12px] text-red-400">{error}</div>}

            <button
              onClick={handleAnalyze}
              disabled={view === "analyzing"}
              className="mt-4 w-full bg-accent text-[#0D0D0D] font-semibold text-[13px] py-[10px] rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {view === "analyzing" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Analisi in corso…
                </span>
              ) : "Analizza corrispondenza"}
            </button>

            <button
              onClick={() => { setGmailEmail(null); setView("disconnected"); }}
              className="mt-3 w-full text-[11px] text-[#444] hover:text-[#666] bg-transparent border-none cursor-pointer transition-colors"
            >
              Disconnetti Gmail
            </button>
          </div>
        )}

        {view === "result" && (
          <div>
            <button
              onClick={() => setView("connected")}
              className="flex items-center gap-2 text-[11px] text-[#555] mb-5 hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2]">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              Nuova analisi
            </button>

            <div className="flex items-center gap-3 mb-5">
              <ModalTitle>Analisi completata</ModalTitle>
              <span className="ml-auto text-[10px] text-[#444] shrink-0">
                {emailCount} email analizzate
              </span>
            </div>

            <div className="text-[10px] uppercase tracking-[0.06em] text-[#444] mb-2">
              {targetEmail}
            </div>

            <div className="p-4 rounded-xl border border-[#1e1e1e] bg-[#0a0a0a]">
              <div className="text-[13px] text-[#bbb] leading-[1.7] whitespace-pre-wrap">
                {analysis.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                  part.startsWith("**") && part.endsWith("**")
                    ? <strong key={i} className="text-[#ddd] font-semibold">{part.slice(2, -2)}</strong>
                    : part
                )}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(analysis).catch(() => {});
              }}
              className="mt-4 text-[11px] text-[#444] hover:text-accent transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              Copia analisi
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
