"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Agreement {
  id: string;
  name: string;
  status: string;
  createdDate: string;
}

type View = "loading" | "disconnected" | "connected";

const STATUS_LABELS: Record<string, string> = {
  SIGNED: "Firmato",
  OUT_FOR_SIGNATURE: "In attesa di firma",
  WAITING_FOR_MY_SIGNATURE: "Da firmare",
  DRAFT: "Bozza",
  CANCELLED: "Annullato",
  EXPIRED: "Scaduto",
  AUTHORING: "In creazione",
  OUT_FOR_APPROVAL: "In approvazione",
};

const STATUS_COLORS: Record<string, string> = {
  SIGNED: "text-green-400",
  OUT_FOR_SIGNATURE: "text-yellow-400",
  WAITING_FOR_MY_SIGNATURE: "text-blue-400",
  DRAFT: "text-[#555]",
  CANCELLED: "text-red-400",
  EXPIRED: "text-red-400",
  AUTHORING: "text-[#555]",
  OUT_FOR_APPROVAL: "text-yellow-400",
};

export default function ModalAdobeSign({ open, onClose }: Props) {
  const [view, setView] = useState<View>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setView("loading");
    setError("");
    fetch("/api/adobesign/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected) {
          setEmail(d.email);
          setView("connected");
          loadAgreements();
        } else {
          setView("disconnected");
        }
      })
      .catch(() => setView("disconnected"));
  }, [open]);

  async function loadAgreements() {
    try {
      const res = await fetch("/api/adobesign/agreements");
      const data = await res.json();
      if (res.ok && data.agreements) {
        setAgreements(data.agreements);
      }
    } catch {}
  }

  function handleClose() {
    setView("loading");
    setAgreements([]);
    setError("");
    onClose();
  }

  function handleConnect() {
    window.location.href = "/api/auth/adobesign";
  }

  async function handleDisconnect() {
    try {
      await fetch("/api/adobesign/status", { method: "DELETE" });
      setEmail(null);
      setAgreements([]);
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
            <div className="text-[13px] text-[#555]">Connessione in corso...</div>
          </div>
        )}

        {view === "disconnected" && (
          <div>
            <ModalTitle>Adobe Sign</ModalTitle>
            <div className="mt-4 text-[13px] text-[#666] leading-[1.6]">
              Connetti Adobe Sign per monitorare i tuoi accordi e firme digitali.
              NormaAI terr&agrave; traccia delle scadenze e dello stato dei documenti.
            </div>

            <div className="mt-5 p-4 rounded-xl border border-[#1e1e1e] bg-[#0f0f0f]">
              <div className="flex items-start gap-3">
                <div className="text-[18px] mt-[1px]">&#128274;</div>
                <div>
                  <div className="text-[12px] font-semibold text-[#888] mb-1">Privacy</div>
                  <div className="text-[11px] text-[#555] leading-[1.5]">
                    Accesso in sola lettura. Nessun documento viene modificato o salvato.
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="mt-3 text-[12px] text-red-400">{error}</div>}

            <button
              onClick={handleConnect}
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#2a2a2a] bg-white text-[#333] font-semibold text-[13px] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <path d="M9 15l2 2 4-4" />
              </svg>
              Connetti Adobe Sign
            </button>
          </div>
        )}

        {view === "connected" && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <ModalTitle>Adobe Sign</ModalTitle>
              {email && (
                <span className="ml-auto text-[10px] text-[#444] bg-[#161616] border border-[#252525] px-2 py-[3px] rounded-md truncate max-w-[160px]">
                  {email}
                </span>
              )}
            </div>

            <div className="text-[12px] text-[#555] mb-4 leading-[1.5]">
              I tuoi accordi recenti su Adobe Sign.
            </div>

            {error && <div className="mb-3 text-[12px] text-red-400">{error}</div>}

            {agreements.length > 0 ? (
              <div className="space-y-[1px]">
                {agreements.map((agr) => (
                  <div
                    key={agr.id}
                    className="p-3 rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#bbb] truncate">
                        {agr.name || "Senza nome"}
                      </div>
                      <div className="text-[10px] text-[#444] mt-[2px]">
                        {formatDate(agr.createdDate)}
                      </div>
                    </div>
                    <div
                      className={`text-[10px] font-medium shrink-0 ${
                        STATUS_COLORS[agr.status] || "text-[#555]"
                      }`}
                    >
                      {STATUS_LABELS[agr.status] || agr.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-[12px] text-[#444]">
                Nessun accordo recente
              </div>
            )}

            <button
              onClick={handleDisconnect}
              className="mt-5 w-full text-[11px] text-[#444] hover:text-[#666] bg-transparent border-none cursor-pointer transition-colors"
            >
              Disconnetti Adobe Sign
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
