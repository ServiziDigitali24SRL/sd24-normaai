"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { User } from "@supabase/supabase-js";

const PILLS = [
  { label: "Avvocato", hint: "Diritto civile, penale, amministrativo…" },
  { label: "Commercialista", hint: "Fiscalità, IVA, dichiarazioni…" },
  { label: "Consulente del Lavoro", hint: "CCNL, buste paga, INPS…" },
  { label: "Ingegnere/Geometra", hint: "Edilizia, urbanistica, sicurezza…" },
  { label: "Consulente Finanziario", hint: "TUF, MiFID II, antiriciclaggio…" },
];

const CONTRACT_VERTICAL = "Analisi Contratto";

const BOZZE = [
  { label: "Parere Legale", icon: "⚖️", placeholder: "Descrivi il fatto su cui vuoi il parere (es. 'Il mio cliente è stato licenziato senza preavviso dopo 5 anni...')" },
  { label: "Email Professionale", icon: "📧", placeholder: "Descrivi l'email da redigere (es. 'Diffida a pagare fattura di €8.000 scaduta da 60 giorni...')" },
  { label: "Memoria Difensiva", icon: "📋", placeholder: "Descrivi la questione processuale (es. 'Comparsa di risposta: il convenuto nega di aver firmato il contratto...')" },
  { label: "Bozza Contratto", icon: "📝", placeholder: "Descrivi il contratto da redigere (es. 'Contratto di fornitura software SaaS annuale B2B con limitazione responsabilità...')" },
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
  preview?: string;
}

const STORAGE_KEY = "norma-history-v1";
const CONV_ID_KEY = "norma-conv-id";
const TTL = 24 * 60 * 60 * 1000;
const MAX_DOC_BYTES = 3.5 * 1024 * 1024;
const MAX_IMG_BYTES = 3 * 1024 * 1024;
const COLLAPSE_THRESHOLD = 600;

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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, savedAt: Date.now() })); } catch { }
}

async function loadHistoryFromDB(userId: string, conversationId: string | null): Promise<{ messages: HistoryMsg[]; conversationId: string | null }> {
  try {
    const params = new URLSearchParams({ userId });
    if (conversationId) params.set("conversationId", conversationId);
    const res = await fetch(`/api/conversations?${params}`);
    if (!res.ok) return { messages: [], conversationId: null };
    return await res.json();
  } catch { return { messages: [], conversationId: null }; }
}

async function saveMessageToDB(userId: string, conversationId: string | null, msg: HistoryMsg): Promise<string | null> {
  try {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, conversationId, msg }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.conversationId ?? null;
  } catch { return null; }
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
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

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="text-cream font-semibold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="text-[#aaa]">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-[#ccc]">{children}</li>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-cream text-[16px] font-semibold mb-2 mt-4">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-cream text-[15px] font-semibold mb-2 mt-4">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-cream text-[14px] font-semibold mb-1 mt-3">{children}</h3>,
  code: ({ children }: { children?: React.ReactNode }) => <code className="bg-[#1a1a1a] text-accent px-[5px] py-[1px] rounded text-[12.5px] font-mono">{children}</code>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-accent pl-3 text-[#888] italic my-3">{children}</blockquote>,
  hr: () => <hr className="border-[#222] my-4" />,
};

function CollapsibleText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > COLLAPSE_THRESHOLD;
  const displayText = isLong && !expanded ? text.slice(0, COLLAPSE_THRESHOLD) + "…" : text;
  return (
    <>
      <ReactMarkdown components={mdComponents as any}>{displayText}</ReactMarkdown>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="text-accent text-[12px] mt-1 bg-transparent border-none cursor-pointer hover:underline">
          {expanded ? "Mostra meno ▲" : "Mostra di più ▼"}
        </button>
      )}
    </>
  );
}

export default function ChatBar({ user }: { user?: User | null }) {
  const userRole = user?.user_metadata?.role as string | undefined;
  const isProfessionista = userRole === "professionista";
  const [text, setText] = useState("");
  const [activePill, setActivePill] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<HistoryMsg[]>([]);
  const [current, setCurrent] = useState<StreamingMsg | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [recording, setRecording] = useState(false);
  const [attachErr, setAttachErr] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [contractMode, setContractMode] = useState(false);
  const [activeBozza, setActiveBozza] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("sb-open");
    setSidebarOpen(saved === "true" || (saved === null && window.innerWidth >= 768));
    const handler = (e: Event) => { const v = (e as CustomEvent<boolean>).detail; setTimeout(() => setSidebarOpen(v), 0); };
    window.addEventListener("sb-toggle", handler);
    return () => window.removeEventListener("sb-toggle", handler);
  }, []);

  // Measure input height for padding
  useEffect(() => {
    if (!inputRef.current) return;
    const ro = new ResizeObserver(() => {
      setInputHeight(inputRef.current?.offsetHeight ?? 0);
    });
    ro.observe(inputRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (user?.id) {
      const savedConvId = localStorage.getItem(CONV_ID_KEY);
      loadHistoryFromDB(user.id, savedConvId).then(({ messages, conversationId: convId }) => {
        if (messages.length > 0) setHistory(messages);
        if (convId) { setConversationId(convId); localStorage.setItem(CONV_ID_KEY, convId); }
      });
    } else {
      setHistory(loadHistory());
    }
  }, [user?.id]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [current?.text, history.length]);

  const handleScroll = useCallback(() => {
    const el = messagesRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function scrollToBottom() { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }

  useEffect(() => {
    function handleNewChat() {
      setHistory([]); setCurrent(null); setStreaming(false); setText("");
      setActivePill(null); setAttachment(null); setAttachErr(null); setShowScrollBtn(false); setContractMode(false); setActiveBozza(null);
      setConversationId(null);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CONV_ID_KEY);
      setTimeout(() => taRef.current?.focus(), 50);
    }
    window.addEventListener("norma-new-chat", handleNewChat);
    return () => window.removeEventListener("norma-new-chat", handleNewChat);
  }, []);

  async function handleDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setAttachErr(null);
    if (file.size > MAX_DOC_BYTES) { setAttachErr("Documento troppo grande (max 3.5 MB)."); return; }
    const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isDoc = file.name.endsWith(".doc") || file.name.endsWith(".docx") || file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isTxt && !isPdf && !isDoc) { setAttachErr("Formato non supportato. Carica un PDF, TXT o Word."); return; }
    if (isPdf) { const data = await readFileAsBase64(file); setAttachment({ type: "document", mediaType: "application/pdf", name: file.name, data }); setContractMode(true); setActivePill(null); }
    else { const textContent = await readFileAsText(file); setAttachment({ type: "document", mediaType: "text/plain", name: file.name, data: "", textContent }); }
  }

  async function handleImgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setAttachErr(null);
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { setAttachErr("Formato non supportato. Usa JPEG, PNG o WebP."); return; }
    if (file.size > MAX_IMG_BYTES) { setAttachErr("Immagine troppo grande (max 3 MB)."); return; }
    const data = await readFileAsBase64(file);
    setAttachment({ type: "image", mediaType: file.type, name: file.name, data, preview: URL.createObjectURL(file) });
  }

  function toggleRecording() {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setAttachErr("Riconoscimento vocale non supportato. Usa Chrome o Edge."); return; }
    const recognition = new SR();
    recognition.lang = "it-IT"; recognition.continuous = false; recognition.interimResults = false;
    recognitionRef.current = recognition;
    recognition.onresult = (e: any) => { setText((prev) => prev ? prev + " " + e.results[0][0].transcript : e.results[0][0].transcript); taRef.current?.focus(); };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => { setAttachErr("Errore microfono."); setRecording(false); };
    recognition.start(); setRecording(true); setAttachErr(null);
  }

  function handlePill(idx: number) {
    if (activePill === idx) { setActivePill(null); return; }
    setActivePill(idx);
    setActiveBozza(null);
    setTimeout(() => taRef.current?.focus(), 0);
  }

  function handleBozza(idx: number) {
    if (activeBozza === idx) { setActiveBozza(null); return; }
    setActiveBozza(idx);
    setActivePill(null);
    setContractMode(false);
    setTimeout(() => taRef.current?.focus(), 0);
  }

  async function handleSend() {
    if ((!text.trim() && !attachment) || sending) return;
    const q = text.trim() || (contractMode && attachment ? "Analizza questo contratto e produci il report completo." : attachment ? "Analizza: " + attachment.name : "");
    const v = contractMode ? CONTRACT_VERTICAL : activeBozza !== null ? BOZZE[activeBozza].label : activePill !== null ? PILLS[activePill].label : null;
    const att = attachment;
    setSending(true); setStreaming(true);
    setCurrent({ question: q, vertical: v, text: "", sources: [], hasRag: false, attachmentName: att?.name });
    setText(""); setActivePill(null); setActiveBozza(null); setAttachment(null); setAttachErr(null);
    try {
      const conversationHistory = history.slice(-4).flatMap((msg) => ([
        { role: "user" as const, content: msg.question },
        { role: "assistant" as const, content: msg.text.slice(0, 1000) },
      ]));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, vertical: v, userId: user?.id ?? null, attachment: att, conversationHistory, turnNumber: history.length }),
      });
      if (!res.ok || !res.body) throw new Error("HTTP " + res.status);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", finalText = "", finalSources: Source[] = [], finalHasRag = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "sources") { finalSources = event.sources; finalHasRag = event.hasRag; setCurrent((p) => p ? { ...p, sources: event.sources, hasRag: event.hasRag } : null); }
            else if (event.type === "text") { finalText += event.text; setCurrent((p) => p ? { ...p, text: p.text + event.text } : null); }
            else if (event.type === "done") {
              setStreaming(false);
              const msg: HistoryMsg = { id: crypto.randomUUID(), question: q, vertical: v, text: finalText, sources: finalSources, hasRag: finalHasRag, ts: Date.now(), attachmentName: att?.name };
              setHistory((prev) => { const next = [...prev, msg]; saveHistory(next); return next; });
              if (user?.id) {
                saveMessageToDB(user.id, conversationId, msg).then((newConvId) => {
                  if (newConvId && newConvId !== conversationId) {
                    setConversationId(newConvId);
                    localStorage.setItem(CONV_ID_KEY, newConvId);
                  }
                });
              }
              setCurrent(null);
            } else if (event.type === "error") { setCurrent((p) => p ? { ...p, text: p.text || "Errore. Riprova." } : null); setStreaming(false); }
          } catch { }
        }
      }
    } catch (e) {
      console.error(e);
      setCurrent((p) => p ? { ...p, text: "Impossibile connettersi. Riprova." } : null);
    } finally { setSending(false); setStreaming(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const hasConversation = history.length > 0 || current !== null;

  const sidebarW = sidebarOpen ? 240 : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0D0D0D] relative" style={{ overflow: "clip" }}>
      {/* Glow background */}
      <div
        className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgba(220,80,40,0.20) 0%, rgba(180,50,20,0.08) 40%, transparent 70%)", filter: "blur(60px)" }}
      />
      {!hasConversation && (
        <div className="flex-1 flex flex-col items-center justify-center z-10" style={{ paddingBottom: inputHeight }} suppressHydrationWarning>
          {!contractMode ? (
            <div className="flex flex-col items-center pointer-events-none select-none">
              <div className="font-serif text-[32px] md:text-[48px] tracking-[-2px] mb-[6px]">
                Norma<span className="text-accent">AI</span>
              </div>
              <div className="text-[14px] text-[#666] italic mb-6">La norma è uguale per tutti.</div>
            </div>
          ) : (
            <div className="flex flex-col items-center max-w-[480px] px-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-accent fill-none stroke-[1.5]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
              </div>
              <div className="text-cream text-[18px] font-semibold mb-2">Analisi Contratto</div>
              <div className="text-[#666] text-[13px] text-center leading-[1.6]">
                Carica un contratto PDF e NormaAI produrrà un report completo con rischi, clausole mancanti e conformità alla legge italiana.
              </div>
              <div className="mt-4 flex gap-2 flex-wrap justify-center">
                {["Contratto di fornitura", "NDA", "Contratto di lavoro", "Appalto", "Licenza software"].map(t => (
                  <span key={t} className="text-[11px] text-[#555] bg-[#161616] border border-[#222] px-3 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasConversation && (
        <div ref={messagesRef} className="flex-1 overflow-y-auto min-h-0 z-10 relative" style={{ paddingBottom: inputHeight }}>
          <div className="max-w-[768px] mx-auto px-4 md:px-6 pt-6 pb-4 flex flex-col gap-6">
            {history.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-4">
                <div>
                  <p className="text-[11px] text-[#555] font-medium mb-1">Tu</p>
                  <p className="text-cream text-[14px] leading-[1.6]">{msg.question}</p>
                  {msg.attachmentName && <span className="inline-block mt-1 text-[11px] text-[#555] bg-[#161616] border border-[#252525] rounded px-2 py-0.5">📎 {msg.attachmentName}</span>}
                </div>
                <div>
                  <p className="text-[11px] text-accent font-medium mb-1">NormaAI</p>
                  <div className="text-[#ccc] text-[14px] leading-[1.75]">
                    <CollapsibleText text={msg.text} />
                    {!msg.hasRag && <p className="text-[11px] text-[#444] italic mt-3">⚠️ Risposta basata sulla conoscenza generale.</p>}
                  </div>
                </div>
              </div>
            ))}
            {current && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[11px] text-[#555] font-medium mb-1">Tu</p>
                  <p className="text-cream text-[14px] leading-[1.6]">{current.question}</p>
                </div>
                <div>
                  <p className="text-[11px] text-accent font-medium mb-1">NormaAI</p>
                  <div className="text-[#ccc] text-[14px] leading-[1.75]">
                    {current.text ? (
                      <>
                        <ReactMarkdown components={mdComponents as any}>{current.text}</ReactMarkdown>
                        {streaming && <span className="inline-block w-[2px] h-[14px] bg-accent ml-[2px] animate-pulse align-text-bottom" />}
                        {!streaming && !current.hasRag && <p className="text-[11px] text-[#444] italic mt-3">⚠️ Risposta basata sulla conoscenza generale.</p>}
                      </>
                    ) : (
                      <div className="flex items-center gap-3 text-[#666] py-2">
                        <span className="flex gap-[3px]">
                          <span className="w-[6px] h-[6px] rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-[6px] h-[6px] rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-[6px] h-[6px] rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                        <span className="text-[13px]">NormaAI sta elaborando…</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {hasConversation && showScrollBtn && (
        <button onClick={scrollToBottom} className="fixed z-[60] w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#333] text-[#888] hover:text-cream hover:border-accent flex items-center justify-center transition-all duration-150 shadow-lg" style={{ bottom: inputHeight + 8, left: "50%" , transform: "translateX(-50%)" }}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]"><polyline points="6,9 12,15 18,9" /></svg>
        </button>
      )}

      <div ref={inputRef} className="fixed bottom-0 right-0 z-[50] bg-[#0D0D0D] border-t border-[#1a1a1a]/50" style={{ left: sidebarW, paddingBottom: "env(safe-area-inset-bottom, 0px)", transition: "left 250ms ease-in-out" }} suppressHydrationWarning>
        <div className="max-w-[768px] mx-auto px-4 md:px-6 pt-3 pb-3">
          {attachment && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-[#161616] border border-[#252525] rounded-xl">
              {attachment.type === "image" && attachment.preview
                ? <img src={attachment.preview} alt={attachment.name} className="w-8 h-8 rounded object-cover shrink-0" />
                : <span className="text-[16px]">{attachment.mediaType === "application/pdf" ? "📄" : "📝"}</span>}
              <span className="text-[12px] text-[#888] truncate flex-1">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="text-[#444] hover:text-[#888] transition-colors shrink-0 bg-transparent border-none cursor-pointer p-0 text-[14px] leading-none">×</button>
            </div>
          )}
          {attachErr && <div className="mb-2 px-3 py-2 bg-[#1f0d0d] border border-[#3a1a1a] rounded-xl"><p className="text-[11.5px] text-[#f44]">{attachErr}</p></div>}

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden transition-colors duration-200 focus-within:border-[#444] shadow-lg">
            <textarea ref={taRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} rows={1}
              placeholder={hasConversation ? "Fai un'altra domanda…" : contractMode ? "Carica il contratto PDF o fai una domanda specifica…" : activeBozza !== null ? BOZZE[activeBozza].placeholder : activePill !== null ? `Fai una domanda a ${PILLS[activePill].label}…` : "Che problema hai oggi?"}
              className="w-full px-5 pt-4 pb-2 bg-transparent border-none outline-none text-cream text-[15px] min-h-[48px] placeholder:text-[#555] resize-none"
            />
            <div className="flex items-center gap-4 px-4 pb-3 pt-1">
              <input ref={docRef} type="file" accept="application/pdf,text/plain,.pdf,.txt,.doc,.docx" className="hidden" onChange={handleDocFile} />
              <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImgFile} />
              <AttButton title="Allega documento" onClick={() => docRef.current?.click()}>
                <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
              </AttButton>
              <AttButton title="Allega immagine" onClick={() => imgRef.current?.click()}>
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>
              </AttButton>
              <AttButton title={recording ? "Ferma registrazione" : "Registra vocale"} onClick={toggleRecording} active={recording}>
                <svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
              </AttButton>
              <button onClick={handleSend} disabled={sending || (!text.trim() && !attachment)} className="ml-auto w-8 h-8 rounded-full bg-accent border-none text-white flex items-center justify-center transition-all duration-150 hover:bg-accent-hover hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed">
                {sending ? <span className="w-[10px] h-[10px] border-2 border-white border-t-transparent rounded-full animate-spin" /> : <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" fill="#fff" stroke="none" /></svg>}
              </button>
            </div>
          </div>

          {!hasConversation && !contractMode && (
            <div className="mt-[14px] space-y-2">
              {/* Contract analysis CTA — solo professionista */}
              {isProfessionista && (
                <button
                  onClick={() => { setContractMode(true); setActivePill(null); docRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-4 py-[10px] bg-accent/5 border border-accent/20 rounded-xl text-[13px] text-accent hover:bg-accent/10 hover:border-accent/40 transition-all duration-150 cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 stroke-accent fill-none stroke-[1.8]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  <span className="font-medium">Analisi Contratto</span>
                  <span className="text-[11px] text-accent/60 ml-auto">Carica PDF →</span>
                </button>
              )}
              {/* Bozze pills — solo professionista */}
              {isProfessionista && (
                <div className="flex gap-[7px] overflow-x-auto pb-1 scrollbar-hide">
                  <span className="text-[11px] text-[#444] shrink-0 flex items-center pr-1">Genera →</span>
                  {BOZZE.map((b, i) => (
                    <button key={i} onClick={() => handleBozza(i)} title={b.placeholder}
                      className={"flex items-center gap-[5px] bg-[#141414] border border-[#222] text-[#888] px-[12px] py-[6px] rounded-full text-[12px] cursor-pointer transition-all duration-150 whitespace-nowrap hover:border-[#3a3a3a] hover:text-cream hover:bg-[#1c1c1c] shrink-0" + (activeBozza === i ? " !border-accent !text-cream !bg-[#E8340A18]" : "")}>
                      <span>{b.icon}</span>{b.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Vertical pills */}
              <p className="text-[11px] text-[#444] text-center mb-[6px] tracking-wide uppercase">Scegli il professionista, poi scrivi</p>
              <div className="flex gap-[7px] overflow-x-auto md:flex-wrap md:justify-center pb-1 scrollbar-hide">
                {PILLS.map((pill, i) => (
                  <button key={i} onClick={() => handlePill(i)} title={pill.hint}
                    className={"flex items-center gap-[6px] bg-[#141414] border border-[#222] text-[#888] px-[14px] py-[7px] rounded-full text-[12.5px] cursor-pointer transition-all duration-150 whitespace-nowrap hover:border-[#3a3a3a] hover:text-cream hover:bg-[#1c1c1c] shrink-0" + (activePill === i ? " !border-accent !text-cream !bg-[#E8340A18]" : "")}>
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {contractMode && !hasConversation && (
            <div className="mt-[14px] flex items-center gap-2 px-4 py-[10px] bg-accent/5 border border-accent/20 rounded-xl">
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 stroke-accent fill-none stroke-[1.8]"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
              <span className="text-[12.5px] text-accent font-medium">Modalità Analisi Contratto attiva</span>
              <button onClick={() => { setContractMode(false); setAttachment(null); }} className="ml-auto text-[11px] text-[#555] hover:text-[#888] bg-transparent border-none cursor-pointer">✕ Annulla</button>
            </div>
          )}

          <p className="text-center text-[11px] text-[#555] mt-2 pb-1">
            NormaAI fornisce informazioni generali, non consulenza legale.{" "}
            <button onClick={() => window.dispatchEvent(new CustomEvent("norma-open-modal", { detail: "professionisti" }))} className="text-accent underline underline-offset-2 bg-transparent border-none cursor-pointer text-[11px] hover:text-accent-hover">
              Trova un professionista →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function AttButton({ title, onClick, children, active }: { title: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button title={title} onClick={onClick} className={"bg-transparent border-none p-[5px] rounded-[7px] flex items-center transition-colors duration-150 [&_svg]:w-[15px] [&_svg]:h-[15px] [&_svg]:stroke-current [&_svg]:fill-none [&_svg]:stroke-[1.8] " + (active ? "text-accent animate-pulse" : "text-[#444] hover:text-[#888] hover:bg-white/[0.03]")}>
      {children}
    </button>
  );
}
