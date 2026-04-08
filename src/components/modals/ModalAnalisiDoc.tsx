"use client";

import { useState, useRef, useCallback } from "react";
import ModalOverlay, { ModalClose } from "../ModalOverlay";
import ReactMarkdown from "react-markdown";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TIPI_DOC = [
  "Contratto commerciale",
  "Contratto di lavoro",
  "Contratto di locazione",
  "Sentenza / ordinanza",
  "Atto amministrativo",
  "Delibera / verbale societario",
  "Testamento / atto notarile",
  "Email / PEC legale",
  "Provvedimento normativo",
  "Altro documento legale",
];

const ACCEPT = ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg";
const MAX_DOC_BYTES = 3.5 * 1024 * 1024;
const MAX_IMG_BYTES = 3 * 1024 * 1024;

interface AttachmentData {
  type: "document" | "image";
  mediaType: string;
  name: string;
  data: string;
  textContent?: string;
}

async function readFile(file: File): Promise<AttachmentData | null> {
  return new Promise((resolve) => {
    const isImage = file.type.startsWith("image/");
    const maxBytes = isImage ? MAX_IMG_BYTES : MAX_DOC_BYTES;

    if (file.size > maxBytes) {
      resolve(null);
      return;
    }

    const reader = new FileReader();

    if (!isImage && (file.type === "text/plain" || file.name.endsWith(".txt"))) {
      // Testo puro: leggi come stringa
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        resolve({
          type: "document",
          mediaType: "text/plain",
          name: file.name,
          data: "",
          textContent,
        });
      };
      reader.readAsText(file, "utf-8");
      return;
    }

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      if (isImage) {
        resolve({ type: "image", mediaType: file.type, name: file.name, data: base64 });
      } else {
        resolve({
          type: "document",
          mediaType: file.type || "application/octet-stream",
          name: file.name,
          data: base64,
        });
      }
    };
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="text-[#1a1a1a] font-semibold">{children}</strong>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-[#1a1a1a] text-[14px] font-semibold mb-2 mt-5 first:mt-0">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-[#3D3A37] text-[13px] font-semibold mb-1 mt-3">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-[#3D3A37]">{children}</li>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-accent pl-3 text-[#6B6763] italic my-3">{children}</blockquote>,
  table: ({ children }: { children?: React.ReactNode }) => <div className="overflow-x-auto mb-3"><table className="w-full text-[12.5px] border-collapse">{children}</table></div>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="text-left text-[#6B6763] font-medium px-3 py-2 border-b border-[#D5D0C8]">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="text-[#3D3A37] px-3 py-2 border-b border-[#E5E1D8]">{children}</td>,
};

export default function ModalAnalisiDoc({ open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const [tipoDocs, setTipoDoc] = useState(TIPI_DOC[0]);
  const [domanda, setDomanda] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [fileError, setFileError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFileError("");
    setResult("");
    const data = await readFile(f);
    if (!data) {
      setFileError(`File troppo grande. Massimo ${f.type.startsWith("image/") ? "3 MB" : "3.5 MB"}.`);
      return;
    }
    setFile(f);
    setAttachment(data);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function removeFile() {
    setFile(null);
    setAttachment(null);
    setResult("");
    setFileError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function analizza() {
    if (!attachment) return;
    setLoading(true);
    setResult("");

    const prompt = domanda.trim()
      ? `Tipo documento: ${tipoDocs}.\n\nDomanda specifica: ${domanda.trim()}\n\nAnalizza il documento allegato tenendo conto della domanda specifica.`
      : `Tipo documento: ${tipoDocs}.\n\nAnalizza il documento allegato e fornisci un report completo.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          vertical: "Analisi Documento",
          userId: null,
          attachment,
          conversationHistory: [],
          turnNumber: 0,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Errore server");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "text") {
              setResult((prev) => prev + event.text);
              setTimeout(() => {
                resultRef.current?.scrollTo({ top: resultRef.current.scrollHeight, behavior: "smooth" });
              }, 50);
            }
          } catch { /* ignorato */ }
        }
      }
    } catch {
      setResult("Errore durante l'analisi. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setAttachment(null);
    setTipoDoc(TIPI_DOC[0]);
    setDomanda("");
    setResult("");
    setFileError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  const selectClass = "w-full bg-white border border-[#E5E1D8] text-[#1a1a1a] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#C8C2BA] transition-colors duration-150 appearance-none cursor-pointer";
  const labelClass = "block text-[11px] text-[#6B6763] font-medium mb-1 uppercase tracking-wide";

  // Icona file per tipo
  function fileIcon(name: string) {
    if (name.endsWith(".pdf")) return "📄";
    if (name.endsWith(".doc") || name.endsWith(".docx")) return "📝";
    if (name.endsWith(".txt")) return "📃";
    if (/\.(jpg|jpeg|png)$/i.test(name)) return "🖼️";
    return "📎";
  }

  return (
    <ModalOverlay open={open} onClose={handleClose} maxWidth="max-w-[680px]">
      <div className="p-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-[18px]">📂</div>
            <div>
              <h2 className="text-[#1a1a1a] text-[15px] font-semibold leading-tight">Analisi Documento</h2>
              <p className="text-[11.5px] text-[#6B6763] mt-0.5">Carica un documento — NormaAI lo analizza con RAG normativo</p>
            </div>
          </div>
          <ModalClose onClose={handleClose} />
        </div>

        {/* Upload zone */}
        {!file ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150 mb-4 ${
              dragOver
                ? "border-accent/60 bg-accent/5"
                : "border-[#D5D0C8] hover:border-[#383838] hover:bg-white/[0.015]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handleInputChange}
            />
            <div className="text-3xl opacity-60">📎</div>
            <div className="text-center">
              <p className="text-[13.5px] text-[#7A766F] font-medium">Trascina qui il documento</p>
              <p className="text-[12px] text-[#6B6763] mt-1">oppure <span className="text-accent underline underline-offset-2">sfoglia dal computer</span></p>
            </div>
            <p className="text-[11px] text-[#7A766F] text-center">
              PDF · DOCX · TXT · JPG · PNG &nbsp;·&nbsp; Max 3.5 MB
            </p>
          </div>
        ) : (
          /* File preview */
          <div className="flex items-center gap-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3 mb-4">
            <span className="text-2xl">{fileIcon(file.name)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#1a1a1a] font-medium truncate">{file.name}</p>
              <p className="text-[11px] text-[#6B6763]">{formatBytes(file.size)}</p>
            </div>
            <button
              onClick={removeFile}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#6B6763] hover:text-[#f44] hover:bg-red-500/10 transition-colors shrink-0"
              aria-label="Rimuovi file"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {fileError && (
          <p className="text-[12px] text-red-400 mb-4 px-1">{fileError}</p>
        )}

        {/* Tipo documento + domanda specifica */}
        <div className="flex flex-col gap-3 mb-5">
          <div>
            <label className={labelClass}>Tipo di documento</label>
            <div className="relative">
              <select value={tipoDocs} onChange={(e) => setTipoDoc(e.target.value)} className={selectClass}>
                {TIPI_DOC.map((t) => <option key={t}>{t}</option>)}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 stroke-[#555] fill-none stroke-[2] pointer-events-none" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9" /></svg>
            </div>
          </div>

          <div>
            <label className={labelClass}>Domanda specifica <span className="text-[#333] normal-case tracking-normal">(opzionale)</span></label>
            <textarea
              value={domanda}
              onChange={(e) => setDomanda(e.target.value)}
              placeholder="Es. Ci sono clausole vessatorie? · Il recesso è penalizzante? · Che rischi ha il locatore?"
              rows={2}
              className="w-full bg-white border border-[#E5E1D8] text-[#1a1a1a] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#C8C2BA] transition-colors duration-150 resize-none placeholder:text-[#333]"
            />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={analizza}
          disabled={!attachment || loading}
          className="w-full bg-accent text-white rounded-lg py-[11px] text-[13.5px] font-semibold hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analisi in corso…</>
            : <>Analizza documento →</>}
        </button>

        {/* Result */}
        {(result || loading) && (
          <div ref={resultRef} className="mt-5 bg-white border border-[#E5E1D8] rounded-xl p-4 max-h-[440px] overflow-y-auto">
            {loading && !result && (
              <div className="flex items-center gap-3 text-[#6B6763]">
                <span className="flex gap-[3px]">
                  <span className="w-[5px] h-[5px] rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-[5px] h-[5px] rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-[5px] h-[5px] rounded-full bg-accent/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span className="text-[13px]">Lettura documento…</span>
              </div>
            )}
            {result && (
              <>
                <div className="text-[13px] text-[#3D3A37] leading-[1.75]">
                  <ReactMarkdown components={mdComponents as any}>{result}</ReactMarkdown>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E5E1D8] flex gap-2">
                  <button
                    onClick={() => navigator.clipboard?.writeText(result)}
                    className="flex-1 text-[12px] text-[#6B6763] hover:text-[#1a1a1a] border border-[#E5E1D8] hover:border-[#D5D0C8] rounded-lg py-2 transition-colors"
                  >
                    Copia analisi
                  </button>
                  <button
                    onClick={reset}
                    className="flex-1 text-[12px] text-[#6B6763] hover:text-[#1a1a1a] border border-[#E5E1D8] hover:border-[#D5D0C8] rounded-lg py-2 transition-colors"
                  >
                    Nuovo documento
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <p className="text-center text-[11px] text-[#333] mt-4">
          Il documento viene elaborato in memoria e non viene salvato. Max 3.5 MB.
        </p>
      </div>
    </ModalOverlay>
  );
}
