"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Envelope {
  id: string;
  subject: string;
  status: string;
  sentDate: string;
}

type View = "loading" | "disconnected" | "connected";

const STATUS_LABELS: Record<string, string> = {
  sent: "Inviato",
  delivered: "Consegnato",
  completed: "Completato",
  declined: "Rifiutato",
  voided: "Annullato",
  created: "Creato",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "text-green-400",
  declined: "text-red-400",
  voided: "text-red-400",
  sent: "text-yellow-400",
  delivered: "text-blue-400",
  created: "text-[#6B6763]",
};

export default function ModalDocuSign({ open, onClose }: Props) {
  const [view, setView] = useState<View>("loading");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setView("loading");
    setError("");
    fetch("/api/docusign/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) {
          setAccountName(d.accountName);
          setView("connected");
          loadEnvelopes();
        } else {
          setView("disconnected");
        }
      })
      .catch(() => setView("disconnected"));
  }, [open]);

  async function loadEnvelopes() {
    try {
      const res = await fetch("/api/docusign/envelopes");
      const data = await res.json();
      if (res.ok && data.envelopes) {
        setEnvelopes(data.envelopes);
      }
    } catch {}
  }

  function handleClose() {
    setView("loading");
    setEnvelopes([]);
    setError("");
    onClose();
  }

  function handleConnect() {
    window.location.href = "/api/auth/docusign";
  }

  async function handleDisconnect() {
    try {
      await fetch("/api/docusign/status", { method: "DELETE" });
      setAccountName(null);
      setEnvelopes([]);
      setView("disconnected");
    } catch {
      setError("Errore durante la disconnessione");
    }
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
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
            <ModalTitle>DocuSign</ModalTitle>
            <div className="mt-4 text-[13px] text-[#6B6763] leading-[1.6]">
              Connetti DocuSign per monitorare i tuoi contratti e firme digitali.
              NormaAI analizzer&agrave; lo stato dei tuoi documenti e le scadenze.
            </div>

            <div className="mt-5 p-4 rounded-xl border border-[#E5E1D8] bg-white">
              <div className="flex items-start gap-3">
                <div className="text-[18px] mt-[1px]">&#128274;</div>
                <div>
                  <div className="text-[12px] font-semibold text-[#6B6763] mb-1">Privacy</div>
                  <div className="text-[11px] text-[#6B6763] leading-[1.5]">
                    Accesso in sola lettura ai tuoi envelope. Nessun documento viene modificato o salvato.
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="mt-3 text-[12px] text-red-400">{error}</div>}

            <button
              onClick={handleConnect}
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#D5D0C8] bg-white text-[#333] font-semibold text-[13px] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Connetti DocuSign
            </button>
          </div>
        )}

        {view === "connected" && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <ModalTitle>DocuSign</ModalTitle>
              {accountName && (
                <span className="ml-auto text-[10px] text-[#7A766F] bg-[#161616] border border-[#E5E1D8] px-2 py-[3px] rounded-md truncate max-w-[160px]">
                  {accountName}
                </span>
              )}
            </div>

            <div className="text-[12px] text-[#6B6763] mb-4 leading-[1.5]">
              I tuoi envelope recenti su DocuSign.
            </div>

            {error && <div className="mb-3 text-[12px] text-red-400">{error}</div>}

            {envelopes.length > 0 ? (
              <div className="space-y-[1px]">
                {envelopes.map((env) => (
                  <div
                    key={env.id}
                    className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF8] flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#7A766F] truncate">
                        {env.subject || "Senza oggetto"}
                      </div>
                      <div className="text-[10px] text-[#7A766F] mt-[2px]">
                        {formatDate(env.sentDate)}
                      </div>
                    </div>
                    <div
                      className={`text-[10px] font-medium shrink-0 ${
                        STATUS_COLORS[env.status] || "text-[#6B6763]"
                      }`}
                    >
                      {STATUS_LABELS[env.status] || env.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-[12px] text-[#7A766F]">
                Nessun envelope recente
              </div>
            )}

            <button
              onClick={handleDisconnect}
              className="mt-5 w-full text-[11px] text-[#7A766F] hover:text-[#6B6763] bg-transparent border-none cursor-pointer transition-colors"
            >
              Disconnetti DocuSign
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
