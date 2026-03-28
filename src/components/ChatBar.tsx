"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const PILLS = [
  { emoji: "⚖️", label: "Avvocato", hint: "Diritto civile, penale, amministrativo…", prompt: "Ho una domanda di diritto su: " },
  { emoji: "📊", label: "Commercialista", hint: "Fiscalità, IVA, dichiarazioni…", prompt: "Ho una domanda fiscale su: " },
  { emoji: "👔", label: "Consulente del Lavoro", hint: "CCNL, buste paga, INPS…", prompt: "Ho una domanda sul diritto del lavoro su: " },
  { emoji: "📐", label: "Ingegnere/Geometra", hint: "Edilizia, urbanistica, sicurezza…", prompt: "Ho una domanda normativa edilizia su: " },
  { emoji: "📈", label: "Consulente Finanziario", hint: "TUF, MiFID II, antiriciclaggio…", prompt: "Ho una domanda normativa finanziaria su: " },
];

interface Source { id: string; titolo: string; fonte: string; url: string; tipo: string }

export interface HistoryMsg {
  id: string;
  question: string;
  vertical: string | null;
  text: string;
  sources: Source[];
  hasRag: boolean;
  ts: number;
  attachmentName?: string;
}

interface StreamingMsg {
  question: string;
  vertical: string | null;
  text: string;
  sources: Source[];
  hasRag: boolean;
  attachmentName?: string;
}

interface Attachment {
  type: "document" | "image";
  mediaType: string;
  name: string;
  data: string;
  textContent?: string;
  preview?: string; // object URL for images
}

const STORAGE_KEY = "norma-history-v1";
const TTL = 24 * 60 * 60 * 1000;
const MAX_DOC_BYTES = 3.5 * 1024 * 1024;  // 3.5 MB
const MAX_IMG_BYTES = 3 * 1024 * 1024;    // 3 MB

function loadHistory(): HistoryMsg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const { items, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > TTL) { localStorage.removeItem(STORAGE_KEY); return []; }
    return items as HistoryMsg[];
  } catch { return []; }
}

function saveHistory(items: HistoryMsg[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, savedAt: Date.now() })); } catch { /* quota */ }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:...;base64," prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}

export default function ChatBar() {
  const [text, setText] = useState("");
  const [activePill, setActivePill] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<HistoryMsg[]>([]);
  const [current, setCurrent] = useState<StreamingMsg | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [recording, setRecording] = useState(false);
  const [attachErr, setAttachErr] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => { setHistory(loadHistory()); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [current?.text, history.length]);

  useEffect(() => {
    function handleNewChat() {
      setHistory([]);
      setCurrent(null);
      setStreaming(false);
      setText("");
      setActivePill(null);
      setAttachment(null);
      setAttachErr(null);
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => taRef.current?.focus(), 50);
    }
    window.addEventListener("norma-new-chat", handleNewChat);
    return () => window.removeEventListener("norma-new-chat", handleNewChat);
  }, []);

  // ── File handlers ──────────────────────────────────────────────────────────

  async function handleDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachErr(null);

    if (file.size > MAX_DOC_BYTES) {
      setAttachErr(`Documento troppo grande (max 3.5 MB). Questo file è ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }

    const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isDoc = file.name.endsWith(".doc") || file.name.endsWith(".docx") ||
      file.type === "application/msword" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isTxt && !isPdf && !isDoc) {
      setAttachErr("Formato non supportato. Carica un PDF, TXT o Word (.doc/.docx).");
      return;
    }

    if (isPdf) {
      const data = await readFileAsBase64(file);
      setAttachment({ type: "document", mediaType: "application/pdf", name: file.name, data });
    } else {
      // TXT and Word: send as plain text
      const textContent = await readFileAsText(file);
      setAttachment({ type: "document", mediaType: "text/plain", name: file.name, data: "", textContent });
    }
  }

  async function handleImgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachErr(null);

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setAttachErr("Formato immagine non supportato. Usa JPEG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_IMG_BYTES) {
      setAttachErr(`Immagine troppo grande (max 3 MB). Questo file è ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }

    const data = await readFileAsBase64(file);
    const preview = URL.createObjectURL(file);
    setAttachment({ type: "image", mediaType: file.type, name: file.name, data, preview });
  }

  function toggleRecording() {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setAttachErr("Riconoscimento vocale non supportato. Usa Chrome o Edge.");
      return;
    }

    const recognition = new SR();
    recognition.lang = "it-IT";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => prev ? prev + " " + transcript : transcript);
      taRef.current?.focus();
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => {
      setAttachErr("Errore microfono. Controlla i permessi del browser.");
      setRecording(false);
    };

    recognition.start();
    setRecording(true);
    setAttachErr(null);
  }

  // ── Pills ──────────────────────────────────────────────────────────────────

  function handlePill(idx: number) {
    if (activePill === idx) { setActivePill(null); setText(""); return; }
    setActivePill(idx);
    setText(PILLS[idx].prompt);
    setTimeout(() => {
      const ta = taRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(PILLS[idx].prompt.length, PILLS[idx].prompt.length); }
    }, 0);
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!text.trim() || sending) return;
    const q = text.trim();
    const v = activePill !== null ? PILLS[activePill].label : null;
    const att = attachment;

    setSending(true);
    setStreaming(true);
    setCurrent({ question: q, vertical: v, text: "", sources: [], hasRag: false, attachmentName: att?.name });
    setText("");
    setActivePill(null);
    setAttachment(null);
    setAttachErr(null);

    try {
      // Build conversation history for multi-turn context (last 4 messages = 2 exchanges)
      const conversationHistory = history.slice(-4).flatMap((msg) => ([
        { role: "user" as const, content: msg.question },
        { role: "assistant" as const, content: msg.text.slice(0, 1000) },
      ]));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          vertical: v,
          userId: null,
          attachment: att,
          conversationHistory,
          turnNumber: history.length,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";
      let finalSources: Source[] = [];
      let finalHasRag = false;

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
            if (event.type === "sources") {
              finalSources = event.sources; finalHasRag = event.hasRag;
              setCurrent((p) => p ? { ...p, sources: event.sources, hasRag: event.hasRag } : null);
            } else if (event.type === "text") {
              finalText += event.text;
              setCurrent((p) => p ? { ...p, text: p.text + event.text } : null);
            } else if (event.type === "done") {
              setStreaming(false);
              const msg: HistoryMsg = {
                id: crypto.randomUUID(), question: q, vertical: v,
                text: finalText, sources: finalSources, hasRag: finalHasRag,
                ts: Date.now(), attachmentName: att?.name,
              };
              setHistory((prev) => { const next = [...prev, msg]; saveHistory(next); return next; });
              setCurrent(null);
            } else if (event.type === "error") {
              setCurrent((p) => p ? { ...p, text: p.text || "Si è verificato un errore. Riprova tra poco." } : null);
              setStreaming(false);
            }
          } catch { /* malformed SSE */ }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      setCurrent((p) => p ? { ...p, text: "Impossibile connettersi al servizio. Riprova tra qualche secondo." } : null);
    } finally {
      setSending(false);
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const hasConversation = history.length > 0 || current !== null;

  return (
    <div className="w-full max-w-[660px] flex flex-col">
      {/* Conversation thread */}
      {hasConversation && (
        <div className="mb-4 flex flex-col gap-4">
          {history.map((msg) => (
            <div key={msg.id} className="bg-[#111] border border-[#1e1e1e] rounded-[14px] overflow-hidden">
              <div className="px-[18px] py-[10px] border-b border-[#1a1a1a] flex items-start gap-[10px]">
                <div className="shrink-0 w-[20px] h-[20px] rounded-full bg-[#222] flex items-center justify-center mt-[1px]">
                  <svg viewBox="0 0 24 24" className="w-[10px] h-[10px]" fill="none" stroke="#666" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  {msg.vertical && <p className="text-[10.5px] text-[#444] mb-[1px]">{PILLS.find((p) => p.label === msg.vertical)?.emoji} {msg.vertical}</p>}
                  {msg.attachmentName && <p className="text-[10px] text-[#444] mb-[2px]">📎 {msg.attachmentName}</p>}
                  <p className="text-[#666] text-[12.5px] leading-[1.5] line-clamp-2">{msg.question}</p>
                </div>
                <span className="text-[10px] text-[#333] shrink-0 mt-[2px]">
                  {new Date(msg.ts).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="px-[18px] py-[10px] text-[12.5px] text-[#666] leading-[1.65] line-clamp-3">{msg.text}</div>
            </div>
          ))}

          {current && (
            <div className="bg-[#111] border border-[#222] rounded-[14px] overflow-hidden animate-fadeIn">
              <div className="px-[18px] py-[12px] border-b border-[#1a1a1a] flex items-start gap-[10px]">
                <div className="shrink-0 w-[22px] h-[22px] rounded-full bg-accent flex items-center justify-center mt-[1px]">
                  <svg viewBox="0 0 24 24" className="w-[11px] h-[11px]" fill="#fff" stroke="none">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#555] text-[11px] mb-[2px]">
                    {current.vertical ? `${PILLS.find((p) => p.label === current.vertical)?.emoji} ${current.vertical}` : "Domanda"}
                  </p>
                  {current.attachmentName && <p className="text-[10px] text-[#444] mb-[2px]">📎 {current.attachmentName}</p>}
                  <p className="text-[#888] text-[13px] leading-[1.5] truncate">{current.question}</p>
                </div>
              </div>
              <div className="px-[18px] py-[16px] max-h-[400px] overflow-y-auto">
                {current.text ? (
                  <div className="text-[#ccc] text-[13.5px] leading-[1.75]">
                    <ReactMarkdown components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="text-cream font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="text-[#aaa]">{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-[3px]">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-[3px]">{children}</ol>,
                      li: ({ children }) => <li className="text-[#ccc]">{children}</li>,
                      h1: ({ children }) => <h1 className="text-cream text-[15px] font-semibold mb-2 mt-3">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-cream text-[14px] font-semibold mb-2 mt-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-cream text-[13.5px] font-semibold mb-1 mt-2">{children}</h3>,
                      code: ({ children }) => <code className="bg-[#1a1a1a] text-accent px-[5px] py-[1px] rounded text-[12.5px] font-mono">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-accent pl-3 text-[#888] italic my-2">{children}</blockquote>,
                      hr: () => <hr className="border-[#222] my-3" />,
                    }}>
                      {current.text}
                    </ReactMarkdown>
                    {streaming && <span className="inline-block w-[2px] h-[14px] bg-accent ml-[2px] animate-pulse align-text-bottom" />}
                  </div>
                ) : (
                  <div className="flex items-center gap-[10px] text-[#444]">
                    <span className="w-[16px] h-[16px] border-2 border-[#333] border-t-[#666] rounded-full animate-spin" />
                    <span className="text-[13px]">Ricerca nel corpus normativo…</span>
                  </div>
                )}
              </div>
              {!streaming && current.sources.length > 0 && (
                <div className="px-[18px] py-[12px] border-t border-[#1a1a1a]">
                  <p className="text-[10.5px] text-[#444] uppercase tracking-[0.06em] mb-[8px]">Fonti ({current.sources.length})</p>
                  <div className="flex flex-wrap gap-[6px]">
                    {current.sources.map((src, i) => (
                      <a key={src.id} href={src.url || undefined} target={src.url ? "_blank" : undefined} rel="noopener noreferrer"
                        className={`inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-full bg-[#1a1a1a] border border-[#252525] text-[11px] leading-[1.3] transition-colors ${src.url ? "text-[#666] hover:text-cream hover:border-[#333] cursor-pointer" : "text-[#555] cursor-default"}`}>
                        <span className="text-[#444]">{i + 1}</span>
                        <span className="max-w-[160px] truncate">{src.titolo}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {!streaming && !current.hasRag && current.text && (
                <div className="px-[18px] py-[10px] border-t border-[#1a1a1a]">
                  <p className="text-[11px] text-[#444] italic">⚠️ Risposta basata sulla conoscenza generale — corpus non disponibile al momento.</p>
                </div>
              )}
              {!streaming && current.text && (
                <div className="px-[18px] py-[10px] border-t border-[#1a1a1a]">
                  <p className="text-[11px] text-[#444]">Risposta generata da NormaAI · modello Claude</p>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#252525] rounded-xl">
          {attachment.type === "image" && attachment.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.preview} alt={attachment.name} className="w-8 h-8 rounded object-cover shrink-0" />
          ) : (
            <span className="text-[16px]">{attachment.mediaType === "application/pdf" ? "📄" : "📝"}</span>
          )}
          <span className="text-[12px] text-[#888] truncate flex-1">{attachment.name}</span>
          <button onClick={() => setAttachment(null)} className="text-[#444] hover:text-[#888] transition-colors shrink-0 bg-transparent border-none cursor-pointer p-0 text-[14px] leading-none">×</button>
        </div>
      )}

      {/* Error */}
      {attachErr && (
        <div className="mb-2 px-3 py-2 bg-[#1f0d0d] border border-[#3a1a1a] rounded-xl">
          <p className="text-[11.5px] text-[#f44]">{attachErr}</p>
        </div>
      )}

      {/* Input box */}
      <div className="bg-[#161616] border border-[#222] rounded-[14px] overflow-hidden transition-colors duration-200 focus-within:border-[#333]">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={hasConversation ? "Fai un'altra domanda…" : "Che problema hai oggi?"}
          className="w-full px-[18px] pt-[16px] pb-[8px] bg-transparent border-none outline-none text-cream text-[14.5px] min-h-[60px] placeholder:text-[#3a3a3a] resize-none"
        />
        <div className="flex items-center gap-5 px-3 pb-3 pt-2 border-t border-[#1e1e1e]">
          {/* Hidden file inputs */}
          <input ref={docRef} type="file" accept="application/pdf,text/plain,.pdf,.txt,.doc,.docx" className="hidden" onChange={handleDocFile} />
          <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImgFile} />

          {/* Attach document */}
          <AttButton title="Allega documento (PDF, TXT — max 3.5 MB)" onClick={() => docRef.current?.click()}>
            <svg viewBox="0 0 24 24">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </AttButton>

          {/* Attach image */}
          <AttButton title="Allega immagine (JPEG, PNG, WebP — max 3 MB)" onClick={() => imgRef.current?.click()}>
            <svg viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
          </AttButton>

          {/* Voice */}
          <AttButton
            title={recording ? "Clicca per fermare la registrazione" : "Registra vocale (italiano)"}
            onClick={toggleRecording}
            active={recording}
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </AttButton>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="ml-auto w-8 h-8 rounded-full bg-accent border-none text-white flex items-center justify-center transition-all duration-150 hover:bg-accent-hover hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <span className="w-[10px] h-[10px] border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="#fff" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22,2 15,22 11,13 2,9" fill="#fff" stroke="none" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Pills */}
      {!hasConversation && (
        <div className="flex flex-wrap gap-[7px] mt-[14px] justify-center">
          {PILLS.map((pill, i) => (
            <button key={i} onClick={() => handlePill(i)} title={pill.hint}
              className={`flex items-center gap-[6px] bg-[#141414] border border-[#222] text-[#888] px-[14px] py-[7px] rounded-full text-[12.5px] cursor-pointer transition-all duration-150 whitespace-nowrap hover:border-[#3a3a3a] hover:text-cream hover:bg-[#1c1c1c] ${activePill === i ? "!border-accent !text-cream !bg-[#E8340A18]" : ""}`}>
              <span>{pill.emoji}</span> {pill.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AttButton({ title, onClick, children, active }: {
  title: string; onClick: () => void; children: React.ReactNode; active?: boolean;
}) {
  return (
    <button title={title} onClick={onClick}
      className={`bg-transparent border-none p-[5px] rounded-[7px] flex items-center transition-colors duration-150 [&_svg]:w-[15px] [&_svg]:h-[15px] [&_svg]:stroke-current [&_svg]:fill-none [&_svg]:stroke-[1.8] ${
        active ? "text-accent animate-pulse" : "text-[#444] hover:text-[#888] hover:bg-white/[0.03]"
      }`}>
      {children}
    </button>
  );
}
