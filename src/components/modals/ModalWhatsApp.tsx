"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View = "loading" | "disconnected" | "connected" | "analyzing" | "result";

export default function ModalWhatsApp({ open, onClose }: Props) {
  const [view, setView] = useState<View>("loading");
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneId, setPhoneId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [targetPhone, setTargetPhone] = useState("+39");
  const [analysis, setAnalysis] = useState("");
  const [msgCount, setMsgCount] = useState(0);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setView("loading");
    setError("");
    fetch("/api/whatsapp/status")
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setPhone(d.phone);
          setView("connected");
        } else {
          setView("disconnected");
        }
      })
      .catch(() => setView("disconnected"));
  }, [open]);

  function handleClose() {
    setView("loading");
    setTargetPhone("+39");
    setAnalysis("");
    setError("");
    setPhoneId("");
    setAccessToken("");
    setConnecting(false);
    onClose();
  }

  async function handleConnect() {
    if (!phoneId.trim() || !accessToken.trim()) {
      setError("Inserisci Phone ID e Access Token");
      return;
    }
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneId: phoneId.trim(), accessToken: accessToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore connessione"); setConnecting(false); return; }
      setPhone(data.phone);
      setView("connected");
    } catch {
      setError("Errore di connessione");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    await fetch("/api/whatsapp/connect", { method: "DELETE" });
    setPhone(null);
    setView("disconnected");
  }

  async function handleAnalyze() {
    if (!targetPhone.trim() || targetPhone.trim().length < 5) {
      setError("Inserisci il numero di telefono da analizzare");
      return;
    }
    setView("analyzing");
    setError("");
    try {
      const res = await fetch("/api/whatsapp/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPhone: targetPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore analisi"); setView("connected"); return; }
      setAnalysis(data.analysis);
      setMsgCount(data.count);
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
            <div className="text-[13px] text-[#6B6763]">Connessione in corso...</div>
          </div>
        )}

        {view === "disconnected" && (
          <div>
            <ModalTitle>WhatsApp Business</ModalTitle>
            <div className="mt-4 text-[13px] text-[#6B6763] leading-[1.6]">
              Connetti WhatsApp Business per analizzare le tue conversazioni.
              NormaAI identificherà aspetti legali, accordi verbali e scadenze nelle tue chat.
            </div>

            <div className="mt-5 p-4 rounded-xl border border-[#E5E1D8] bg-white">
              <div className="flex items-start gap-3">
                <div className="text-[18px] mt-[1px]">🔒</div>
                <div>
                  <div className="text-[12px] font-semibold text-[#6B6763] mb-1">Privacy first</div>
                  <div className="text-[11px] text-[#6B6763] leading-[1.5]">
                    Analizziamo solo le conversazioni che scegli tu. Nessun dato viene salvato permanentemente.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-[6px]">
                WhatsApp Business Phone ID
              </div>
              <input
                type="text"
                placeholder="es. 123456789012345"
                value={phoneId}
                onChange={e => setPhoneId(e.target.value)}
                className="w-full bg-white border border-[#222] rounded-lg px-3 py-[10px] text-[13px] text-[#3D3A37] outline-none focus:border-[#D5D0C8] placeholder:text-[#333]"
              />
            </div>

            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-[6px]">
                Access Token (Meta Cloud API)
              </div>
              <input
                type="password"
                placeholder="Token Meta Cloud API"
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleConnect()}
                className="w-full bg-white border border-[#222] rounded-lg px-3 py-[10px] text-[13px] text-[#3D3A37] outline-none focus:border-[#D5D0C8] placeholder:text-[#333]"
              />
            </div>

            {error && <div className="mt-2 text-[12px] text-red-400">{error}</div>}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#D5D0C8] bg-white text-[#333] font-semibold text-[13px] cursor-pointer hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.564l4.67-1.474A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.173 0-4.19-.606-5.916-1.655l-.424-.252-4.398 1.388 1.412-4.303-.277-.44A9.793 9.793 0 012.182 12c0-5.415 4.403-9.818 9.818-9.818S21.818 6.585 21.818 12 17.415 21.818 12 21.818z"/>
              </svg>
              {connecting ? "Connessione..." : "Connetti WhatsApp"}
            </button>

            <div className="mt-4 text-[10px] text-[#7A766F] leading-[1.5]">
              Serve un account WhatsApp Business con accesso alla Meta Cloud API.
              Ottieni le credenziali da{" "}
              <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
                developers.facebook.com
              </a>
            </div>
          </div>
        )}

        {(view === "connected" || view === "analyzing") && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <ModalTitle>Analisi WhatsApp</ModalTitle>
              {phone && (
                <span className="ml-auto text-[10px] text-[#7A766F] bg-[#161616] border border-[#E5E1D8] px-2 py-[3px] rounded-md truncate max-w-[140px]">
                  {phone}
                </span>
              )}
            </div>

            <div className="text-[12px] text-[#6B6763] mb-4 leading-[1.5]">
              Inserisci il numero di telefono di un contatto. NormaAI analizzerà la
              conversazione e rileverà aspetti legali rilevanti.
            </div>

            <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-[6px]">
              Numero da analizzare
            </div>
            <input
              type="tel"
              placeholder="+39 333 1234567"
              value={targetPhone}
              onChange={e => setTargetPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAnalyze()}
              className="w-full bg-white border border-[#222] rounded-lg px-3 py-[10px] text-[13px] text-[#3D3A37] outline-none focus:border-[#D5D0C8] placeholder:text-[#333]"
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
                  Analisi in corso...
                </span>
              ) : "Analizza conversazione"}
            </button>

            <button
              onClick={handleDisconnect}
              className="mt-3 w-full text-[11px] text-[#7A766F] hover:text-[#6B6763] bg-transparent border-none cursor-pointer transition-colors"
            >
              Disconnetti WhatsApp
            </button>
          </div>
        )}

        {view === "result" && (
          <div>
            <button
              onClick={() => setView("connected")}
              className="flex items-center gap-2 text-[11px] text-[#6B6763] mb-5 hover:text-[#6B6763] transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2]">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              Nuova analisi
            </button>

            <div className="flex items-center gap-3 mb-5">
              <ModalTitle>Analisi completata</ModalTitle>
              <span className="ml-auto text-[10px] text-[#7A766F] shrink-0">
                {msgCount} messaggi analizzati
              </span>
            </div>

            <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-2">
              {targetPhone}
            </div>

            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-[#FAFAF8]">
              <div className="text-[13px] text-[#7A766F] leading-[1.7] whitespace-pre-wrap">
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
              className="mt-4 text-[11px] text-[#7A766F] hover:text-accent transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              Copia analisi
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
