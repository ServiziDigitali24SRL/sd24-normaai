"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
}

interface Source {
  titolo?: string;
  urn?: string;
  articolo?: string;
  comma?: string;
  content?: string;
}

interface ChatSlidePanelProps {
  open: boolean;
  context?: string | null;
  initialMessage?: string;
  userId?: string;
  onClose: () => void;
}

// ─── ChatSlidePanel ────────────────────────────────────────────────────────────

export default function ChatSlidePanel({
  open,
  context,
  initialMessage,
  userId,
  onClose,
}: ChatSlidePanelProps) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [current, setCurrent] = useState<{ text: string; sources?: Source[] } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, current]);

  // Focus input when opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // If initialMessage provided, send it automatically when panel opens
  const sentInitRef = useRef<string>("");
  useEffect(() => {
    if (open && initialMessage && initialMessage !== sentInitRef.current) {
      sentInitRef.current = initialMessage;
      handleSend(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMessage]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSend = useCallback(
    async (text?: string) => {
      const q = (text ?? input).trim();
      if (!q || sending) return;
      setInput("");
      setSending(true);
      setStreaming(true);

      const history = msgs.slice(-6);
      const conversationHistory = history.flatMap((m) =>
        m.role === "user"
          ? []
          : [
              { role: "user" as const, content: history[history.indexOf(m) - 1]?.text ?? "" },
              { role: "assistant" as const, content: m.text.slice(0, 800) },
            ]
      );

      setMsgs((prev) => [...prev, { role: "user", text: q }]);
      setCurrent({ text: "" });

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            vertical: null,
            userId: userId ?? null,
            conversationHistory,
            turnNumber: msgs.filter((m) => m.role === "user").length,
            context: context ?? undefined,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          setCurrent(null);
          setMsgs((prev) => [
            ...prev,
            { role: "assistant", text: "Errore nel caricamento. Riprova tra un momento." },
          ]);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalText = "";
        let finalSources: Source[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.type === "text") {
                finalText += parsed.text ?? "";
                setCurrent({ text: finalText });
              } else if (parsed.type === "sources") {
                finalSources = parsed.sources ?? [];
                setCurrent((c) => ({ text: c?.text ?? finalText, sources: finalSources }));
              } else if (parsed.type === "done") {
                finalText = parsed.full_text ?? finalText;
              }
            } catch {
              // non-JSON line, skip
            }
          }
        }

        setMsgs((prev) => [
          ...prev,
          { role: "assistant", text: finalText, sources: finalSources },
        ]);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setMsgs((prev) => [
          ...prev,
          { role: "assistant", text: "Connessione interrotta. Riprova." },
        ]);
      } finally {
        setCurrent(null);
        setSending(false);
        setStreaming(false);
      }
    },
    [input, msgs, sending, userId, context]
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.18)",
          zIndex: 200,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          background: "white",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
          animation: "slideInRight 0.22s ease",
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          .csp-msg p { margin: 0 0 8px; }
          .csp-msg p:last-child { margin-bottom: 0; }
          .csp-msg strong { font-weight: 600; }
          .csp-msg em { font-style: italic; }
          @keyframes cspBlink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid var(--paper-line)",
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 17,
                fontWeight: 600,
                color: "var(--ink-1)",
                letterSpacing: "-0.3px",
              }}
            >
              Sofia<span style={{ color: "var(--vermiglio)" }}>AI</span>
            </div>
            {context && (
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  color: "var(--vermiglio)",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                § {context} · RAG attivo
              </div>
            )}
          </div>
          <button
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--paper-2)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-3)",
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 18px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {msgs.length === 0 && !current && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                gap: 12,
                color: "var(--ink-4)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--paper-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                §
              </div>
              <p
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--ink-3)",
                  textAlign: "center",
                  maxWidth: 280,
                  lineHeight: 1.5,
                }}
              >
                {context
                  ? `Chiedi qualcosa su "${context}" — il corpus NormaAI è nel contesto.`
                  : "Chiedimi qualcosa sulla normativa italiana."}
              </p>
            </div>
          )}

          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: m.role === "user" ? "flex-end" : "flex-start",
                gap: 6,
              }}
            >
              <div
                className={m.role === "assistant" ? "csp-msg" : undefined}
                style={{
                  maxWidth: "88%",
                  padding: "10px 14px",
                  borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "2px 14px 14px 14px",
                  background: m.role === "user" ? "var(--vermiglio)" : "var(--paper-tint)",
                  color: m.role === "user" ? "white" : "var(--ink-1)",
                  fontFamily: "var(--sans)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
                dangerouslySetInnerHTML={
                  m.role === "assistant"
                    ? {
                        __html: m.text
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/\n/g, "<br>"),
                      }
                    : undefined
                }
              >
                {m.role === "user" ? m.text : null}
              </div>

              {/* Sources */}
              {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    maxWidth: "88%",
                  }}
                >
                  {m.sources.slice(0, 3).map((s, si) => (
                    <span
                      key={si}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 9.5,
                        color: "var(--vermiglio)",
                        background: "rgba(201,57,36,0.07)",
                        border: "1px solid rgba(201,57,36,0.2)",
                        borderRadius: 4,
                        padding: "2px 6px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {s.titolo || s.urn || `Fonte ${si + 1}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Streaming current */}
          {current && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 6,
              }}
            >
              <div
                className="csp-msg"
                style={{
                  maxWidth: "88%",
                  padding: "10px 14px",
                  borderRadius: "2px 14px 14px 14px",
                  background: "var(--paper-tint)",
                  color: "var(--ink-1)",
                  fontFamily: "var(--sans)",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  minHeight: 42,
                }}
                dangerouslySetInnerHTML={{
                  __html: current.text
                    ? current.text
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                        .replace(/\n/g, "<br>") +
                      '<span style="display:inline-block;width:8px;height:14px;background:var(--vermiglio);margin-left:3px;border-radius:1px;animation:cspBlink 0.9s infinite;vertical-align:middle"></span>'
                    : '<span style="display:inline-flex;gap:4px;align-items:center"><span style="width:6px;height:6px;border-radius:50%;background:var(--ink-4);animation:cspBlink 0.9s 0s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--ink-4);animation:cspBlink 0.9s 0.3s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--ink-4);animation:cspBlink 0.9s 0.6s infinite"></span></span>',
                }}
              />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "12px 16px 16px",
            borderTop: "1px solid var(--paper-line)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              background: "var(--paper-tint)",
              border: "1.5px solid var(--paper-line)",
              borderRadius: 14,
              padding: "8px 10px",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                context
                  ? `Chiedi su ${context}...`
                  : "Chiedi qualcosa sulla normativa..."
              }
              disabled={sending}
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13.5,
                fontFamily: "var(--sans)",
                color: "var(--ink-1)",
                lineHeight: 1.5,
                padding: "6px 4px",
                maxHeight: 100,
                opacity: sending ? 0.5 : 1,
              }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 100) + "px";
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              title="Invia"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: input.trim() && !sending ? "var(--vermiglio)" : "var(--paper-2)",
                border: "none",
                cursor: input.trim() && !sending ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: input.trim() && !sending ? "white" : "var(--ink-4)",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              {sending ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22,2 15,22 11,13 2,9" />
                </svg>
              )}
            </button>
          </div>
          <div
            style={{
              textAlign: "center",
              marginTop: 6,
              fontFamily: "var(--mono)",
              fontSize: 8.5,
              color: "var(--ink-5)",
              letterSpacing: "0.1em",
            }}
          >
            NormaAI non sostituisce la consulenza legale professionale
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </>
  );
}
