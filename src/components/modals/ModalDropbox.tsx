"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface DropboxFile {
  id: string;
  name: string;
  path: string;
  modified: string;
  size: number;
}

type View = "loading" | "disconnected" | "connected" | "searching";

export default function ModalDropbox({ open, onClose }: Props) {
  const [view, setView] = useState<View>("loading");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setView("loading");
    setError("");
    fetch("/api/dropbox/status")
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setAccountName(d.accountName);
          setView("connected");
        } else {
          setView("disconnected");
        }
      })
      .catch(() => setView("disconnected"));
  }, [open]);

  function handleClose() {
    setView("loading");
    setQuery("");
    setFiles([]);
    setError("");
    onClose();
  }

  function handleConnect() {
    window.location.href = "/api/auth/dropbox";
  }

  async function handleSearch() {
    if (!query.trim()) {
      setError("Inserisci un termine di ricerca");
      return;
    }
    setView("searching");
    setError("");
    setFiles([]);
    try {
      const res = await fetch("/api/dropbox/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nella ricerca");
        setView("connected");
        return;
      }
      setFiles(data.files || []);
      setView("connected");
    } catch {
      setError("Errore di connessione");
      setView("connected");
    }
  }

  async function handleDisconnect() {
    try {
      await fetch("/api/dropbox/status", { method: "DELETE" });
    } catch {}
    setAccountName(null);
    setFiles([]);
    setQuery("");
    setView("disconnected");
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
            <ModalTitle>Documenti Dropbox</ModalTitle>
            <div className="mt-4 text-[13px] text-[#6B6763] leading-[1.6]">
              Connetti il tuo Dropbox per cercare e analizzare documenti direttamente dalla tua
              cartella cloud. NormaAI accede ai file <strong className="text-[#6B6763]">in sola lettura</strong> per
              estrarre informazioni legali, contratti e scadenze rilevanti.
            </div>

            <div className="mt-5 p-4 rounded-xl border border-[#E5E1D8] bg-white">
              <div className="flex items-start gap-3">
                <div className="text-[18px] mt-[1px]">🔒</div>
                <div>
                  <div className="text-[12px] font-semibold text-[#6B6763] mb-1">Privacy first</div>
                  <div className="text-[11px] text-[#6B6763] leading-[1.5]">
                    Cerchiamo solo i file che corrispondono alla tua ricerca. Non scansioniamo l'intero Dropbox. Nessun file viene copiato o salvato.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleConnect}
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#D5D0C8] bg-white text-[#333] font-semibold text-[13px] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#0061FF">
                <path d="M12 2L6 6.5L12 11L6 15.5L0 11L6 6.5L0 2L6 6.5L12 2ZM6 15.5L12 11L18 15.5L12 20L6 15.5ZM12 11L18 6.5L12 2L18 6.5L24 2L18 6.5L24 11L18 6.5L12 11Z"/>
              </svg>
              Connetti Dropbox
            </button>
          </div>
        )}

        {(view === "connected" || view === "searching") && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <ModalTitle>Documenti Dropbox</ModalTitle>
              {accountName && (
                <span className="ml-auto text-[10px] text-[#7A766F] bg-[#161616] border border-[#E5E1D8] px-2 py-[3px] rounded-md truncate max-w-[140px]">
                  {accountName}
                </span>
              )}
            </div>

            <div className="text-[12px] text-[#6B6763] mb-4 leading-[1.5]">
              Cerca un documento nel tuo Dropbox. NormaAI troverà i file corrispondenti
              e potrà analizzarne il contenuto legale.
            </div>

            <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-[6px]">
              Cerca documenti
            </div>
            <input
              type="text"
              placeholder="es. contratto affitto, fattura, NDA..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="w-full bg-white border border-[#222] rounded-lg px-3 py-[10px] text-[13px] text-[#3D3A37] outline-none focus:border-[#D5D0C8] placeholder:text-[#333]"
              disabled={view === "searching"}
            />

            {error && <div className="mt-2 text-[12px] text-red-400">{error}</div>}

            <button
              onClick={handleSearch}
              disabled={view === "searching"}
              className="mt-4 w-full bg-accent text-[#0D0D0D] font-semibold text-[13px] py-[10px] rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {view === "searching" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Ricerca in corso...
                </span>
              ) : "Cerca nel Dropbox"}
            </button>

            {/* Search results */}
            {files.length > 0 && (
              <div className="mt-5">
                <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-2">
                  {files.length} {files.length === 1 ? "risultato" : "risultati"}
                </div>
                <div className="flex flex-col gap-2">
                  {files.map(f => (
                    <div
                      key={f.id}
                      className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF8] hover:border-[#D5D0C8] transition-colors"
                    >
                      <div className="text-[13px] text-[#7A766F] font-medium truncate">{f.name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-[#7A766F] truncate">{f.path}</span>
                        <span className="text-[10px] text-[#333] shrink-0">{formatSize(f.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleDisconnect}
              className="mt-3 w-full text-[11px] text-[#7A766F] hover:text-[#6B6763] bg-transparent border-none cursor-pointer transition-colors"
            >
              Disconnetti Dropbox
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
