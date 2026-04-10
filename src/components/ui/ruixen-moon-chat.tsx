"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { User } from "@supabase/supabase-js";
import {
  ArrowUpIcon,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Image,
  Camera,
  Mic,
  MicOff,
  X,
} from "lucide-react";

const PROFESSIONI: { emoji: string; label: string; prompts: string[] }[] = [
  {
    emoji: "⚖️",
    label: "Avvocato",
    prompts: [
      "Come si redige una diffida formale?",
      "Termini di prescrizione per responsabilità contrattuale",
      "Come impugnare un licenziamento per giusta causa",
      "Differenza tra arbitrato e mediazione",
    ],
  },
  {
    emoji: "💼",
    label: "Commercialista",
    prompts: [
      "Aliquote IRES e IRAP per le SRL nel 2024",
      "Regime forfettario: limiti e cause di esclusione",
      "Come si calcola l'IVA per le operazioni intracomunitarie",
      "Scadenze dichiarazione dei redditi persone fisiche",
    ],
  },
  {
    emoji: "👷",
    label: "Consulente del Lavoro",
    prompts: [
      "Procedura corretta per un licenziamento per giustificato motivo",
      "Calcolo TFR e modalità di erogazione",
      "Obblighi DURC e sanzioni per irregolarità",
      "Differenze tra contratto a tempo determinato e somministrazione",
    ],
  },
  {
    emoji: "🔧",
    label: "Tecnico / Ing.",
    prompts: [
      "Obblighi DVR sicurezza sul lavoro D.Lgs 81/2008",
      "Normativa antincendio per edifici industriali",
      "Requisiti permesso di costruire vs SCIA",
      "Certificazione energetica APE: quando è obbligatoria",
    ],
  },
  {
    emoji: "🏦",
    label: "Consulente Fin.",
    prompts: [
      "Obblighi MiFID II per la consulenza finanziaria",
      "Normativa antiriciclaggio D.Lgs 231/2007",
      "Requisiti per distribuzione fondi comuni in Italia",
      "GDPR e trattamento dati clienti nel settore finanziario",
    ],
  },
];

const PLACEHOLDER_EXAMPLES = [
  "Chiedimi qualcosa sulla normativa...",
  "Come funziona il contratto a tempo determinato?",
  "Quali sono le sanzioni per le fatture false?",
  "Cosa dice il codice civile sul condominio?",
  "Come si calcola il TFR?",
  "Quando scatta l'obbligo di DURC?",
  "Differenze tra S.r.l. e S.p.A.?",
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
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="text-[#1a1a1a] font-semibold">{children}</strong>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-[#3D3A37]">{children}</li>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-[#1a1a1a] text-[15px] font-semibold mb-2 mt-4">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-[#1a1a1a] text-[14px] font-semibold mb-1 mt-3">{children}</h3>,
  code: ({ children }: { children?: React.ReactNode }) => <code className="bg-[#F0EDE8] text-accent px-1.5 py-0.5 rounded text-[12.5px] font-mono">{children}</code>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-accent pl-3 text-[#6B6763] italic my-3">{children}</blockquote>,
};

export default function RuixenMoonChat({ user }: { user?: User | null }) {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Msg[]>([]);
  const [current, setCurrent] = useState<Streaming | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputHeight, setInputHeight] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, 1 | -1>>({});
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [attachment, setAttachment] = useState<{ name: string; type: string; data: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [selectedProfessione, setSelectedProfessione] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(sending);
  sendingRef.current = sending;

  const hasConversation = history.length > 0 || current !== null;

  // Placeholder rotation
  useEffect(() => {
    if (hasConversation) return;
    const interval = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
        setPlaceholderVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, [hasConversation]);

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

  // Keyboard offset — prevents virtual keyboard from covering input bar on mobile
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => { vv.removeEventListener("resize", handler); vv.removeEventListener("scroll", handler); };
  }, []);

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

  // Command palette query event
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      if (q && !sendingRef.current) {
        sendQuery(q);
      }
    };
    window.addEventListener("norma-cmd-query", handler);
    return () => window.removeEventListener("norma-cmd-query", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function sendQuery(q: string) {
    if (!q.trim() || sendingRef.current) return;
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
      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        const code = data?.code;
        setCurrent(null); setSending(false); setStreaming(false);
        window.dispatchEvent(new CustomEvent("norma-open-modal", { detail: code === "onboarding" ? "onboarding" : "cittadino" }));
        return;
      }
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
              window.dispatchEvent(new CustomEvent("norma-query-done", { detail: { summary: q.slice(0, 200) } }));
            } else if (event.type === "error") { setCurrent((p) => p ? { ...p, text: p.text || "Errore. Riprova." } : null); setStreaming(false); }
          } catch { }
        }
      }
    } catch {
      setCurrent((p) => p ? { ...p, text: "Impossibile connettersi. Riprova." } : null);
    } finally { setSending(false); setStreaming(false); }
  }

  async function handleSend() {
    const q = message.trim() || (attachment ? `Analizza: ${attachment.name}` : "");
    if (!q) return;
    setAttachment(null);
    await sendQuery(q);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function copyMessage(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function rateMessage(id: string, val: 1 | -1) {
    setRatings((prev) => prev[id] === val ? { ...prev, [id]: undefined as any } : { ...prev, [id]: val });
  }

  function handleDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = (reader.result as string).split(",")[1];
      setAttachment({ name: file.name, type: file.type || "application/octet-stream", data });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleImgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = (reader.result as string).split(",")[1];
      setAttachment({ name: file.name, type: file.type, data });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function toggleRecording() {
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const data = (reader.result as string).split(",")[1];
          setAttachment({ name: "registrazione.webm", type: "audio/webm", data });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { }
  }

  const sidebarW = sidebarOpen ? 240 : 0;
  const canSend = (message.trim().length > 0 || !!attachment) && !sending;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F7F5F2] relative" style={{ overflow: "clip" }}>
      {/* Subtle warm glow at bottom */}
      <div
        className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgba(232,52,10,0.06) 0%, rgba(200,100,50,0.03) 50%, transparent 70%)", filter: "blur(60px)" }}
      />

      {/* Empty state */}
      {!hasConversation && (
        <div className="flex-1 flex flex-col items-center justify-center z-10" style={{ paddingBottom: inputHeight }}>
          <div className="text-center mb-6 pointer-events-none select-none">
            <h1 className="font-serif text-[36px] md:text-[52px] tracking-[-2px] mb-1 text-[#1a1a1a]">
              Norma<span className="text-accent">AI</span>
            </h1>
            <p className="text-[#6B6763] italic text-sm">La norma è uguale per tutti.</p>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3 mb-6 pointer-events-none select-none flex-wrap justify-center">
            {[
              { value: "558K+", label: "norme indicizzate" },
              { value: "Oggi",  label: "ultimo aggiornamento" },
              { value: "0€",    label: "per iniziare" },
            ].map(({ value, label }) => (
              <div key={label} className="flex items-center gap-1.5 bg-white border border-[#E5E1D8] rounded-full px-3 py-1 shadow-sm">
                <span className="text-[12px] font-semibold text-[#1a1a1a]">{value}</span>
                <span className="text-[11.5px] text-[#7A766F]">{label}</span>
              </div>
            ))}
          </div>

          {/* Selettore professione */}
          <div className="w-full max-w-[640px] px-4 mb-4">
            <p className="text-[11.5px] text-[#9A9690] text-center mb-3">Scegli il tuo professionista di riferimento</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {PROFESSIONI.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSelectedProfessione(prev => prev === p.label ? null : p.label)}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12.5px] cursor-pointer transition-all duration-150 ${
                    selectedProfessione === p.label
                      ? "border-accent bg-accent text-white shadow-md"
                      : "border-[#E5E1D8] bg-white text-[#3D3A37] hover:bg-[#F0EDE8] hover:border-[#C8C2BA] shadow-sm"
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
            {selectedProfessione && (() => {
              const prof = PROFESSIONI.find(p => p.label === selectedProfessione);
              if (!prof) return null;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {prof.prompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setText(prompt); setTimeout(() => taRef.current?.focus(), 0); }}
                      className="text-left rounded-xl border border-[#E5E1D8] bg-white px-4 py-3 text-[12px] text-[#3D3A37] hover:bg-[#F0EDE8] hover:border-[#C8C2BA] hover:-translate-y-[1px] transition-all duration-150 shadow-sm"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center pointer-events-none select-none">
            {[
              "🔒 Privacy garantita",
              "📜 Legislazione italiana",
              "⚡ Risposta in secondi",
              "🆓 Sempre gratuito per i privati",
            ].map((badge) => (
              <span key={badge} className="text-[11px] text-[#7A766F] bg-[#F0EDE8] px-2.5 py-1 rounded-full">
                {badge}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {hasConversation && (
        <div ref={messagesRef} className="flex-1 overflow-y-auto min-h-0 z-10 relative" style={{ paddingBottom: inputHeight }}>
          <div className="max-w-[768px] mx-auto px-4 md:px-6 pt-6 pb-4 flex flex-col gap-8">
            {history.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-5">
                {/* User message bubble */}
                <div className="flex justify-end">
                  <div className="bg-white border border-[#E5E1D8] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
                    <p className="text-[#1a1a1a] text-[14px] leading-[1.6]">{msg.question}</p>
                  </div>
                </div>
                {/* AI response */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-bold text-accent">N</span>
                    </div>
                    <p className="text-[11px] text-accent font-semibold tracking-wide">NormaAI</p>
                  </div>
                  <div className="text-[#3D3A37] text-[14px] leading-[1.8] pl-7">
                    <ReactMarkdown components={mdComponents as any}>{msg.text}</ReactMarkdown>
                    {!msg.hasRag && (
                      <p className="text-[11px] text-[#9A9690] italic mt-2 flex items-center gap-1">
                        <span>⚠️</span> Risposta basata sulla conoscenza generale — nessun documento trovato nel corpus.
                      </p>
                    )}
                    {msg.sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.sources.map((s) => (
                          <a key={s.id} href={s.url || "#"} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-[#6B6763] bg-[#F0EDE8] border border-[#D8D3CC] rounded-full px-3 py-1 hover:bg-white hover:border-[#B0A898] hover:text-[#1a1a1a] transition-colors">
                            {s.titolo || s.fonte}
                          </a>
                        ))}
                      </div>
                    )}
                    {/* Actions row */}
                    <div className="flex items-center gap-2 mt-3 pl-0">
                      <button
                        onClick={() => copyMessage(msg.id, msg.text)}
                        className="flex items-center gap-1.5 text-[11px] text-[#9A9690] hover:text-[#1a1a1a] transition-colors"
                        title="Copia risposta"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === msg.id ? "Copiato" : "Copia"}</span>
                      </button>
                      <span className="text-[#D8D3CC]">·</span>
                      <button
                        onClick={() => rateMessage(msg.id, 1)}
                        className={`flex items-center gap-1 text-[11px] transition-colors ${ratings[msg.id] === 1 ? "text-green-600" : "text-[#9A9690] hover:text-green-600"}`}
                        title="Risposta utile"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => rateMessage(msg.id, -1)}
                        className={`flex items-center gap-1 text-[11px] transition-colors ${ratings[msg.id] === -1 ? "text-red-500" : "text-[#9A9690] hover:text-red-500"}`}
                        title="Risposta non utile"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {current && (
              <div className="flex flex-col gap-5">
                <div className="flex justify-end">
                  <div className="bg-white border border-[#E5E1D8] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
                    <p className="text-[#1a1a1a] text-[14px] leading-[1.6]">{current.question}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-bold text-accent">N</span>
                    </div>
                    <p className="text-[11px] text-accent font-semibold tracking-wide">NormaAI</p>
                  </div>
                  <div className="text-[#3D3A37] text-[14px] leading-[1.8] pl-7">
                    {current.text ? (
                      <>
                        <ReactMarkdown components={mdComponents as any}>{current.text}</ReactMarkdown>
                        {streaming && (
                          <span className="inline-block w-[2px] h-[14px] bg-accent ml-[2px] animate-pulse align-text-bottom rounded-full" />
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-3 text-[#9A9690] py-2">
                        <span className="flex gap-[4px]">
                          {[0, 150, 300].map((d) => (
                            <span key={d} className="w-[6px] h-[6px] rounded-full bg-accent/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
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
        className="fixed bottom-0 right-0 z-[50] bg-[#F7F5F2] border-t border-[#E5E1D8]"
        style={{ left: sidebarW, paddingBottom: `max(env(safe-area-inset-bottom, 0px), ${keyboardOffset}px)`, transition: "left 250ms ease-in-out, padding-bottom 150ms ease-out" }}
        suppressHydrationWarning
      >
        <div className="max-w-[768px] mx-auto px-4 md:px-6 pt-3 pb-3">
          <input ref={docRef} type="file" accept="application/pdf,text/plain,.pdf,.txt,.doc,.docx" className="hidden" onChange={handleDocFile} />
          <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImgFile} />
          <input ref={camRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handleImgFile} />
          <div className="relative bg-white border border-[#D5D0C8] rounded-xl focus-within:border-[#B0A898] focus-within:shadow-[0_0_0_3px_rgba(180,160,140,0.12)] transition-all shadow-sm">
            {attachment && (
              <div className="flex items-center gap-2 px-4 pt-2">
                <span className="text-[11px] text-[#6B6763] bg-[#F0EDE8] border border-[#D8D3CC] rounded-full px-2.5 py-0.5 flex items-center gap-1.5 max-w-[240px] truncate">
                  <Paperclip className="w-3 h-3 shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                </span>
                <button onClick={() => setAttachment(null)} className="text-[#9A9690] hover:text-[#1a1a1a] bg-transparent border-none cursor-pointer p-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <textarea
              ref={taRef}
              value={message}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                hasConversation
                  ? "Fai un'altra domanda…"
                  : (placeholderVisible ? PLACEHOLDER_EXAMPLES[placeholderIdx] : "")
              }
              rows={1}
              className="w-full px-4 py-3 pb-2 bg-transparent border-none outline-none text-[#1a1a1a] text-[16px] min-h-[48px] placeholder:text-[#9A9690] resize-none transition-opacity duration-300"
              style={{ overflow: "hidden" }}
            />
            <div className="flex items-center gap-2 px-3 pb-3 pt-1">
              <button
                onClick={() => docRef.current?.click()}
                title="Allega documento"
                className="w-[44px] h-[44px] flex items-center justify-center rounded-xl text-[#9A9690] hover:text-[#1a1a1a] hover:bg-[#F0EDE8] transition-all border-none bg-transparent cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                onClick={() => imgRef.current?.click()}
                title="Allega immagine"
                className="w-[44px] h-[44px] flex items-center justify-center rounded-xl text-[#9A9690] hover:text-[#1a1a1a] hover:bg-[#F0EDE8] transition-all border-none bg-transparent cursor-pointer"
              >
                <Image className="w-4 h-4" />
              </button>
              <button
                onClick={() => camRef.current?.click()}
                title="Scatta foto"
                className="w-[44px] h-[44px] flex items-center justify-center rounded-xl text-[#9A9690] hover:text-[#1a1a1a] hover:bg-[#F0EDE8] transition-all border-none bg-transparent cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={toggleRecording}
                title={recording ? "Ferma registrazione" : "Registra vocale"}
                className={`w-[44px] h-[44px] flex items-center justify-center rounded-xl transition-all border-none bg-transparent cursor-pointer ${recording ? "text-accent bg-accent/10" : "text-[#9A9690] hover:text-[#1a1a1a] hover:bg-[#F0EDE8]"}`}
              >
                {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <span className="text-[11px] text-[#C8C2BA] ml-1 hidden sm:inline">
                <kbd className="bg-[#F0EDE8] px-1 py-0.5 rounded text-[10px] font-mono">⌘K</kbd>{" "}cerca
              </span>
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="ml-auto w-[44px] h-[44px] rounded-full flex items-center justify-center transition-all duration-150 border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: canSend ? "#E8340A" : "#D5D0C8" }}
              >
                {sending
                  ? <span className="w-[10px] h-[10px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <ArrowUpIcon className="w-4 h-4 text-white" />
                }
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#9A9690] mt-2 pb-1">
            NormaAI fornisce informazioni generali, non consulenza legale.{" "}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("norma-open-modal", { detail: "professionisti" }))}
              className="text-accent underline underline-offset-2 bg-transparent border-none cursor-pointer text-[11px] hover:opacity-80"
            >
              Trova un professionista →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
