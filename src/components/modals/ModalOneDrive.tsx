"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View = "loading" | "disconnected" | "connected";

interface DriveFile {
  name: string;
  mimeType: string;
  lastModified: string;
  webUrl: string;
}

export default function ModalOneDrive({ open, onClose }: Props) {
  const [view, setView] = useState<View>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setView("loading");
    setError("");
    fetch("/api/onedrive/status")
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setEmail(d.email);
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
    window.location.href = "/api/auth/onedrive";
  }

  async function handleSearch() {
    if (!query.trim()) { setError("Inserisci un termine di ricerca"); return; }
    setSearching(true);
    setError("");
    setFiles([]);
    try {
      const res = await fetch("/api/onedrive/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore ricerca"); setSearching(false); return; }
      setFiles(data.files || []);
      setSearching(false);
    } catch {
      setError("Errore di connessione");
      setSearching(false);
    }
  }

  function handleDisconnect() {
    setEmail(null);
    setFiles([]);
    setQuery("");
    setView("disconnected");
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
            <ModalTitle>OneDrive</ModalTitle>
            <div className="mt-4 text-[13px] text-[#6B6763] leading-[1.6]">
              Connetti OneDrive per importare e analizzare i tuoi documenti.
              NormaAI potra' cercare e leggere i file dal tuo cloud per estrarre informazioni legali rilevanti.
            </div>

            <div className="mt-5 p-4 rounded-xl border border-[#E5E1D8] bg-white">
              <div className="flex items-start gap-3">
                <div className="text-[18px] mt-[1px]">&#128274;</div>
                <div>
                  <div className="text-[12px] font-semibold text-[#6B6763] mb-1">Privacy first</div>
                  <div className="text-[11px] text-[#6B6763] leading-[1.5]">
                    Accesso in sola lettura. Non modifichiamo, cancelliamo o creiamo file nel tuo OneDrive.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleConnect}
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#D5D0C8] bg-white text-[#333] font-semibold text-[13px] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 19h18l-3-8H6L3 19z"/>
                <path d="M6 11V5a2 2 0 012-2h8a2 2 0 012 2v6"/>
              </svg>
              Connetti OneDrive
            </button>
          </div>
        )}

        {view === "connected" && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <ModalTitle>OneDrive</ModalTitle>
              {email && (
                <span className="ml-auto text-[10px] text-[#7A766F] bg-[#161616] border border-[#E5E1D8] px-2 py-[3px] rounded-md truncate max-w-[140px]">
                  {email}
                </span>
              )}
            </div>

            <div className="text-[12px] text-[#6B6763] mb-4 leading-[1.5]">
              Cerca documenti nel tuo OneDrive. NormaAI trovera' i file che corrispondono alla tua ricerca.
            </div>

            <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-[6px]">
              Cerca documenti
            </div>
            <input
              type="text"
              placeholder="es. contratto, fattura, delibera..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="w-full bg-white border border-[#222] rounded-lg px-3 py-[10px] text-[13px] text-[#3D3A37] outline-none focus:border-[#D5D0C8] placeholder:text-[#333]"
              disabled={searching}
            />

            {error && <div className="mt-2 text-[12px] text-red-400">{error}</div>}

            <button
              onClick={handleSearch}
              disabled={searching}
              className="mt-4 w-full bg-accent text-[#0D0D0D] font-semibold text-[13px] py-[10px] rounded-xl border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {searching ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Ricerca in corso...
                </span>
              ) : "Cerca documenti"}
            </button>

            {files.length > 0 && (
              <div className="mt-5 space-y-2">
                <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-2">
                  {files.length} risultat{files.length === 1 ? "o" : "i"}
                </div>
                {files.map((f, i) => (
                  <a
                    key={i}
                    href={f.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF8] hover:border-[#D5D0C8] transition-colors no-underline"
                  >
                    <div className="text-[13px] text-[#3D3A37] truncate">{f.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-[#7A766F]">{f.mimeType}</span>
                      {f.lastModified && (
                        <span className="text-[10px] text-[#7A766F]">
                          {new Date(f.lastModified).toLocaleDateString("it-IT")}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}

            <button
              onClick={handleDisconnect}
              className="mt-3 w-full text-[11px] text-[#7A766F] hover:text-[#6B6763] bg-transparent border-none cursor-pointer transition-colors"
            >
              Disconnetti OneDrive
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
