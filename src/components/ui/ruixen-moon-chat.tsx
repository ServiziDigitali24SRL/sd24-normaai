"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { User } from "@supabase/supabase-js";
import {
  Scale,
  FileText,
  Briefcase,
  Building,
  Gavel,
  FileSearch,
  GitCompare,
  CalendarClock,
  ArrowUpIcon,
} from "lucide-react";

const QUICK_ACTIONS = [
  { icon: Scale,          label: "Multe e sanzioni" },
  { icon: FileText,       label: "Contratti" },
  { icon: Briefcase,      label: "Lavoro e dipendenti" },
  { icon: Building,       label: "Condominio" },
  { icon: Gavel,          label: "Diffide e cause" },
  { icon: FileSearch,     label: "Analizza documento" },
  { icon: GitCompare,     label: "Confronta contratti" },
  { icon: CalendarClock,  label: "Scadenze" },
];

interface Source { id: string; titolo: string; fonte: string; url: string; tipo: string }
interface Msg { id: string; question: string; text: string; sources: Source[]; hasRag: boolean; ts: number }
interface Streaming { question: string; text: string }

const STORAGE_KEY = "norma-ruixen-v1";
const TTL = 24 * 60 * 60 * 1000;

function loadHistory(): Msg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const { items, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > TTL) { localStorage.removeItem(STORAGE_KEY); return []; }
    return items as Msg[];
  } catch { return []; }
}
function saveHistory(items: Msg[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, savedAt: Date.now() })); } catch { }
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="text-white font-semibold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-neutral-300">{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-white text-[15px] font-semibold mb-2 mt-4">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-white text-[14px] font-semibold mb-1 mt-3">{children}</h3>,
  code: ({ children }: { children?: React.ReactNode }) => <code className="bg-neutral-800 text-[#dc5028] px-1.5 py-0.5 rounded text-[12.5px] font-mono">{children}</code>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-[#dc5028] pl-3 text-neutral-400 italic my-3">{children}</blockquote>,
};

export default function RuixenMoonChat({ user }: { user?: User | null }) {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Msg[]>([]);
  const [current, setCurrent] = useState<Streaming | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const hasConversation = history.length > 0 || current !== null;

  // Sync sidebar state for input left offset
  useEffect(() => {
    const saved = localStorage.getItem("sb-open");
    setSidebarOpen(saved === "true" || (saved === null && window.innerWidth >= 1024));
    const handler = (e: Event) => setSidebarOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener("sb-toggle", handler);
    return () => window.removeEventListener("sb-toggle", handler);
  }, []);

  // Load history from localStorage
  useEffect(() => { setHistory(loadHistory()); }, []);

  // Measure input height for messages padding
  useEffect(() => {
    if (!inputRef.current) return;
    const ro = new ResizeObserver(() => setInputHeight(inputRef.current?.offsetHeight ?? 0));
    ro.observe(inputRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-scroll
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [current?.text, history.length]);

  // New chat event
  useEffect(() => {
    const handler = () => {
      setHistory([]); setCurrent(null); setStreaming(false); setText("");
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => taRef.current?.focus(), 50);
    };
    window.addEventListener("norma-new-chat", handler);
    return () => window.removeEventListener("norma-new-chat", handler);
  }, []);

  // Auto-resize textarea
  function setText(val: string) {
    setMessage(val);
    setTimeout(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.style.height = "48px";
      ta.style.height = Math.min(ta.scrollHeight, 150) + "px";
    }, 0);
  }

  async function handleSend() {
    const q = message.trim();
    if (!q || sending) return;
    setSending(true); setStreaming(true);
    setCurrent({ question: q, text: "" });
    setText("");
    try {
      const conversationHistory = history.slice(-4).flatMap((msg) => ([
        { role: "user" as const, content: msg.question },
        { role: "assistant" as const, content: msg.text.slice(0, 1000) },
      ]));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, vertical: null, userId: user?.id ?? null, conversationHistory, turnNumber: history.length }),
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
            if (event.type === "sources") { finalSources = event.sources; finalHasRag = event.hasRag; }
            else if (event.type === "text") { finalText += event.text; setCurrent((p) => p ? { ...p, text: p.text + event.text } : null); }
            else if (event.type === "done") {
              setStreaming(false);
              const msg: Msg = { id: crypto.randomUUID(), question: q, text: finalText, sources: finalSources, hasRag: finalHasRag, ts: Date.now() };
              setHistory((prev) => { const next = [...prev, msg]; saveHistory(next); return next; });
              setCurrent(null);
            } else if (event.type === "error") { setCurrent((p) => p ? { ...p, text: p.text || "Errore. Riprova." } : null); setStreaming(false); }
          } catch { }
        }
      }
    } catch {
      setCurrent((p) => p ? { ...p, text: "Impossibile connettersi. Riprova." } : null);
    } finally { setSending(false); setStreaming(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const sidebarW = sidebarOpen ? 240 : 0;
  const canSend = message.trim().length > 0 && !sending;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0D0D0D] relative" style={{ overflow: "clip" }}>
      {/* Glow */}
      <div
        className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgba(220,80,40,0.20) 0%, rgba(180,50,20,0.08) 40%, transparent 70%)", filter: "blur(60px)" }}
      />

      {/* Empty state */}
      {!hasConversation && (
        <div className="flex-1 flex flex-col items-center justify-center z-10" style={{ paddingBottom: inputHeight }}>
          <div className="text-center mb-8 pointer-events-none select-none">
            <h1 className="font-serif text-[32px] md:text-[48px] tracking-[-2px] mb-2 text-white">
              Norma<span className="text-[#dc5028]">AI</span>
            </h1>
            <p className="text-neutral-400 italic text-sm">La norma è uguale per tutti.</p>
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-center flex-wrap gap-2 max-w-[640px] px-4">
            {QUICK_ACTIONS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => { setText(label); setTimeout(() => taRef.current?.focus(), 0); }}
                className="flex items-center gap-2 rounded-full border border-neutral-700 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-500 transition-all duration-150 px-4 py-[7px] text-[12.5px] cursor-pointer"
              >
                <Icon className="w-[14px] h-[14px] shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {hasConversation && (
        <div ref={messagesRef} className="flex-1 overflow-y-auto min-h-0 z-10 relative" style={{ paddingBottom: inputHeight }}>
          <div className="max-w-[768px] mx-auto px-4 md:px-6 pt-6 pb-4 flex flex-col gap-6">
            {history.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-4">
                <div>
                  <p className="text-[11px] text-neutral-500 font-medium mb-1">Tu</p>
                  <p className="text-white text-[14px] leading-[1.6]">{msg.question}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#dc5028] font-medium mb-1">NormaAI</p>
                  <div className="text-neutral-300 text-[14px] leading-[1.75]">
                    <ReactMarkdown components={mdComponents as any}>{msg.text}</ReactMarkdown>
                    {!msg.hasRag && <p className="text-[11px] text-neutral-600 italic mt-2">⚠️ Risposta basata sulla conoscenza generale.</p>}
                    {msg.sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.sources.map((s) => (
                          <a key={s.id} href={s.url || "#"} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-neutral-500 border border-neutral-700 rounded-full px-3 py-1 hover:text-white hover:border-neutral-500 transition-colors">
                            {s.titolo || s.fonte}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {current && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[11px] text-neutral-500 font-medium mb-1">Tu</p>
                  <p className="text-white text-[14px] leading-[1.6]">{current.question}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#dc5028] font-medium mb-1">NormaAI</p>
                  <div className="text-neutral-300 text-[14px] leading-[1.75]">
                    {current.text ? (
                      <>
                        <ReactMarkdown components={mdComponents as any}>{current.text}</ReactMarkdown>
                        {streaming && <span className="inline-block w-[2px] h-[14px] bg-[#dc5028] ml-[2px] animate-pulse align-text-bottom" />}
                      </>
                    ) : (
                      <div className="flex items-center gap-3 text-neutral-500 py-2">
                        <span className="flex gap-[3px]">
                          {[0, 150, 300].map((d) => (
                            <span key={d} className="w-[6px] h-[6px] rounded-full bg-[#dc5028]/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                          ))}
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

      {/* Input bar — fixed bottom */}
      <div
        ref={inputRef}
        className="fixed bottom-0 right-0 z-[50] bg-[#0D0D0D] border-t border-white/[0.06]"
        style={{ left: sidebarW, paddingBottom: "env(safe-area-inset-bottom, 0px)", transition: "left 250ms ease-in-out" }}
        suppressHydrationWarning
      >
        <div className="max-w-[768px] mx-auto px-4 md:px-6 pt-3 pb-3">
          <div className="relative bg-neutral-900/80 backdrop-blur-md rounded-xl border border-neutral-700 focus-within:border-neutral-500 transition-colors">
            <textarea
              ref={taRef}
              value={message}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasConversation ? "Fai un'altra domanda…" : "Chiedimi qualcosa sulla normativa..."}
              rows={1}
              className="w-full px-4 py-3 pb-2 bg-transparent border-none outline-none text-white text-[15px] min-h-[48px] placeholder:text-neutral-500 resize-none"
              style={{ overflow: "hidden" }}
            />
            <div className="flex items-center justify-end px-3 pb-3 pt-1">
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: canSend ? "#dc5028" : "#333" }}
              >
                {sending
                  ? <span className="w-[10px] h-[10px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <ArrowUpIcon className="w-4 h-4 text-white" />
                }
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-neutral-600 mt-2 pb-1">
            NormaAI fornisce informazioni generali, non consulenza legale.{" "}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("norma-open-modal", { detail: "professionisti" }))}
              className="text-[#dc5028] underline underline-offset-2 bg-transparent border-none cursor-pointer text-[11px] hover:opacity-80"
            >
              Trova un professionista →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
