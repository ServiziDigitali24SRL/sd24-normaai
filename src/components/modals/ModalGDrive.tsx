"use client";

import { useState, useEffect } from "react";
import ModalOverlay, { ModalClose, ModalTitle } from "../ModalOverlay";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface DriveFile {
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

type View = "loading" | "disconnected" | "connected" | "searching" | "results";

export default function ModalGDrive({ open, onClose }: Props) {
  const [view, setView] = useState<View>("loading");
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setView("loading");
    setError("");
    fetch("/api/gdrive/status")
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setDriveEmail(d.email);
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
    window.location.href = "/api/auth/gdrive";
  }

  async function handleSearch() {
    if (!query.trim()) { setError("Inserisci un termine di ricerca"); return; }
    setView("searching");
    setError("");
    try {
      const res = await fetch("/api/gdrive/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Errore ricerca"); setView("connected"); return; }
      setFiles(data.files || []);
      setView("results");
    } catch {
      setError("Errore di connessione");
      setView("connected");
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return iso; }
  }

  function mimeIcon(mime: string) {
    if (mime.includes("pdf")) return "PDF";
    if (mime.includes("document") || mime.includes("word")) return "DOC";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "XLS";
    if (mime.includes("presentation") || mime.includes("powerpoint")) return "PPT";
    if (mime.includes("folder")) return "DIR";
    if (mime.includes("image")) return "IMG";
    return "FILE";
  }

  return (
    <ModalOverlay open={open} onClose={handleClose}>
      <div className="p-7 max-h-[85vh] overflow-y-auto">
        <ModalClose onClose={handleClose} />

        {view === "loading" && (
          <div className="py-12 text-center">
            <div className="text-[13px] text-[#6B6763]">Connessione in corso…</div>
          </div>
        )}

        {view === "disconnected" && (
          <div>
            <ModalTitle>Google Drive</ModalTitle>
            <div className="mt-4 text-[13px] text-[#6B6763] leading-[1.6]">
              Connetti Google Drive per importare e analizzare i tuoi documenti.
              NormaAI cercherà contratti, normative e documenti legali rilevanti.
            </div>

            <div className="mt-5 p-4 rounded-xl border border-[#E5E1D8] bg-white">
              <div className="flex items-start gap-3">
                <div className="text-[18px] mt-[1px]">🔒</div>
                <div>
                  <div className="text-[12px] font-semibold text-[#6B6763] mb-1">Privacy first</div>
                  <div className="text-[11px] text-[#6B6763] leading-[1.5]">
                    Accesso in sola lettura. Non modifichiamo né cancelliamo i tuoi file.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleConnect}
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-[#D5D0C8] bg-white text-[#333] font-semibold text-[13px] cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8] shrink-0">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              Connetti Google Drive
            </button>
          </div>
        )}

        {(view === "connected" || view === "searching") && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <ModalTitle>Google Drive</ModalTitle>
              {driveEmail && (
                <span className="ml-auto text-[10px] text-[#7A766F] bg-[#161616] border border-[#E5E1D8] px-2 py-[3px] rounded-md truncate max-w-[140px]">
                  {driveEmail}
                </span>
              )}
            </div>

            <div className="text-[12px] text-[#6B6763] mb-4 leading-[1.5]">
              Cerca nei tuoi file Google Drive. NormaAI troverà contratti,
              normative e documenti legali rilevanti.
            </div>

            <div className="text-[10px] uppercase tracking-[0.06em] text-[#7A766F] mb-[6px]">
              Cerca nei tuoi file
            </div>
            <input
              type="text"
              placeholder="es. contratto affitto, GDPR, fattura…"
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
                  Ricerca in corso…
                </span>
              ) : "Cerca documenti"}
            </button>

            <button
              onClick={() => { setDriveEmail(null); setView("disconnected"); }}
              className="mt-3 w-full text-[11px] text-[#7A766F] hover:text-[#6B6763] bg-transparent border-none cursor-pointer transition-colors"
            >
              Disconnetti Google Drive
            </button>
          </div>
        )}

        {view === "results" && (
          <div>
            <button
              onClick={() => setView("connected")}
              className="flex items-center gap-2 text-[11px] text-[#6B6763] mb-5 hover:text-[#6B6763] transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none stroke-[2]">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              Nuova ricerca
            </button>

            <div className="flex items-center gap-3 mb-5">
              <ModalTitle>Risultati</ModalTitle>
              <span className="ml-auto text-[10px] text-[#7A766F] shrink-0">
                {files.length} file trovati
              </span>
            </div>

            {files.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#6B6763]">
                Nessun file trovato per "{query}"
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((file, i) => (
                  <a
                    key={i}
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E1D8] bg-[#FAFAF8] hover:border-[#D5D0C8] transition-colors no-underline"
                  >
                    <span className="text-[9px] font-bold text-[#6B6763] bg-[#181818] border border-[#E5E1D8] px-[6px] py-[2px] rounded shrink-0 uppercase tracking-wide">
                      {mimeIcon(file.mimeType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#7A766F] truncate">{file.name}</div>
                      <div className="text-[10px] text-[#7A766F] mt-[2px]">
                        {formatDate(file.modifiedTime)}
                      </div>
                    </div>
                    <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-[#333] fill-none stroke-[2] shrink-0">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                      <polyline points="15,3 21,3 21,9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
