"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Plus, X, Paperclip, Image as ImageIcon, Camera, FileText } from "lucide-react";
import { MobileTabBar } from "@/components/mobile/MobileTabBar";
import { MobileAuthSheet } from "@/components/mobile/MobileAuthSheet";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: { code: string; title: string; snippet: string }[];
  ts: number;
}

function ChatBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
        <div style={{
          maxWidth: "76%",
          background: "var(--ink)",
          color: "var(--paper)",
          padding: "12px 16px",
          borderRadius: "18px 18px 4px 18px",
          fontSize: 14.5, lineHeight: 1.5,
        }}>
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "flex-start" }}>
      <div style={{
        width: 28, height: 28, flexShrink: 0,
        borderRadius: "50%",
        background: "var(--paper-2)",
        border: "1px solid var(--paper-line)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic",
        color: "var(--vermiglio)", marginTop: 2,
      }}>{'\u00A7'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="serif norma-md" style={{
          fontSize: 15, lineHeight: 1.55, color: "var(--ink)", fontStyle: "italic",
        }}>
          <ReactMarkdown>{msg.text}</ReactMarkdown>
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {msg.sources.slice(0, 2).map((src, i) => (
              <div key={i} style={{
                background: "var(--paper-2)",
                border: "1px solid var(--paper-line)",
                borderLeft: "2px solid var(--vermiglio)",
                borderRadius: 6, padding: "8px 10px",
              }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--vermiglio)", fontWeight: 600, marginRight: 6 }}>
                  {'\u00A7'} {src.code}
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-3)", fontStyle: "italic" }}>{src.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "flex-start" }}>
      <div style={{
        width: 28, height: 28, flexShrink: 0, borderRadius: "50%",
        background: "var(--paper-2)", border: "1px solid var(--paper-line)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic", color: "var(--vermiglio)",
      }}>{'\u00A7'}</div>
      <div style={{
        background: "var(--paper-2)", border: "1px solid var(--paper-line)",
        borderRadius: "18px 18px 18px 4px",
        padding: "12px 16px", display: "flex", gap: 4, alignItems: "center",
      }}>
        {[0, 0.2, 0.4].map((d, i) => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--ink-3)",
            animation: `dots-bounce 1s ${d}s infinite ease`,
            display: "inline-block",
          }} />
        ))}
      </div>
    </div>
  );
}

export default function MobileChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [showGate, setShowGate] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleAttach = (kind: "file" | "photo" | "camera") => {
    setShowAttachMenu(false);
    const ref =
      kind === "file"   ? fileInputRef.current  :
      kind === "photo"  ? photoInputRef.current :
      /* camera */        cameraInputRef.current;
    ref?.click();
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setAttachments((prev) => [...prev, ...files].slice(0, 5));
    // Reset so picking the same file twice still triggers onChange
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentText]);

  const sendMessage = async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || streaming) return;
    setInput("");
    // TODO: wire attachments to /api/upload + include refs in payload.
    // For now we surface them in the user message so it's visible they were
    // attached, then clear the picker.
    const attachmentSuffix = attachments.length
      ? `\n\n📎 ${attachments.map((f) => f.name).join(", ")}`
      : "";
    const fullText = (text + attachmentSuffix).trim() || "Allegati";
    setAttachments([]);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: fullText, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setCurrentText("");

    try {
      const history = messages.slice(-6).flatMap((m) => [
        { role: m.role === "user" ? "user" : "assistant" as const, content: m.text },
      ]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: fullText,
          vertical: null,
          userId: null,
          conversationHistory: history,
          turnNumber: messages.filter((m) => m.role === "user").length,
        }),
      });

      if (res.status === 402) {
        setStreaming(false);
        setShowGate(true);
        return;
      }

      if (!res.ok || !res.body) throw new Error("HTTP " + res.status);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";
      let finalSources: { code: string; title: string; snippet: string }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "sources") finalSources = event.sources ?? [];
            else if (event.type === "text") {
              finalText += event.text;
              setCurrentText((p) => p + event.text);
            } else if (event.type === "done" || event.type === "error") break;
          } catch {}
        }
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: finalText || "Errore nella risposta. Riprova.",
        sources: finalSources,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentText("");
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant",
        text: "Impossibile connettersi. Riprova.", ts: Date.now(),
      }]);
    }
    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <style>{`
        @keyframes dots-bounce { 0%,80%,100%{opacity:.3;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }
        .norma-md p { margin: 0 0 8px; }
        .norma-md p:last-child { margin-bottom: 0; }
        .norma-md strong { font-weight: 700; font-style: italic; }
        .norma-md h1,.norma-md h2,.norma-md h3 { font-size: 16px; font-weight: 600; font-style: normal; margin: 10px 0 4px; line-height: 1.3; }
        .norma-md ul,.norma-md ol { padding-left: 18px; margin: 6px 0; }
        .norma-md li { margin-bottom: 4px; }
        .norma-md code { font-family: var(--mono); font-size: 12px; background: var(--paper-3); padding: 1px 4px; border-radius: 3px; font-style: normal; }
      `}</style>
      <div style={{
        minHeight: "100dvh", display: "flex", flexDirection: "column",
        background: "var(--paper)",
      }}>
        {/* Safe area top */}
        <div style={{ height: "env(safe-area-inset-top, 44px)", background: "var(--paper)", flexShrink: 0 }} />

        {/* Header */}
        <div style={{
          padding: "8px 16px",
          borderBottom: "1px solid var(--paper-line)",
          display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0, background: "var(--paper)",
        }}>
          <div className="serif" style={{ flex: 1, fontSize: 18 }}>
            Norma<span style={{ fontStyle: "italic", color: "var(--vermiglio)" }}>AI</span>
          </div>
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--ink-4)", textTransform: "uppercase" }}>
            Chat
          </span>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "16px 16px 0",
          paddingBottom: 0,
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div className="serif" style={{
                fontSize: 28, fontStyle: "italic", color: "var(--ink-4)",
                marginBottom: 8,
              }}>{'\u00A7'}</div>
              <p style={{ fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55, padding: "0 8px" }}>
                Ti posso aiutare per <strong>multe</strong>, <strong>sanzioni</strong>, <strong>citazioni</strong>, <strong>posto di blocco</strong>,<br />
                per qualsiasi cosa, sono qui per te.
              </p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  "Mi hanno fatto una multa, posso fare ricorso?",
                  "Cosa devo dire ad un posto di blocco?",
                  "Mi è arrivata una citazione: cosa fare?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: "10px 14px",
                      background: "var(--paper-2)",
                      border: "1px solid var(--paper-line)",
                      borderRadius: 8, cursor: "pointer",
                      fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-2)",
                      textAlign: "left",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)}
          {streaming && currentText && (
            <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, flexShrink: 0, borderRadius: "50%",
                background: "var(--paper-2)", border: "1px solid var(--paper-line)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--serif)", fontSize: 16, fontStyle: "italic", color: "var(--vermiglio)",
              }}>{'\u00A7'}</div>
              <div className="serif norma-md" style={{ flex: 1, fontSize: 15, lineHeight: 1.55, fontStyle: "italic", color: "var(--ink)" }}>
                <ReactMarkdown>{currentText}</ReactMarkdown>
              </div>
            </div>
          )}
          {streaming && !currentText && <TypingIndicator />}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        {/* Input bar */}
        <div style={{
          padding: "10px 12px",
          paddingBottom: "calc(10px + 72px + env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--paper-line)",
          background: "var(--paper)",
          flexShrink: 0,
        }}>
          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8,
              padding: "0 4px",
            }}>
              {attachments.map((f, i) => {
                const isImg = f.type.startsWith("image/");
                return (
                  <div key={`${f.name}-${i}`} style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "var(--paper-2)",
                    border: "1px solid var(--paper-line)",
                    borderRadius: 8, padding: "5px 8px 5px 8px",
                    fontSize: 12, fontFamily: "var(--sans)", color: "var(--ink-2)",
                    maxWidth: 200,
                  }}>
                    {isImg ? <ImageIcon size={13} color="var(--vermiglio)" /> : <FileText size={13} color="var(--vermiglio)" />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name}
                    </span>
                    <button
                      onClick={() => removeAttachment(i)}
                      aria-label="Rimuovi"
                      style={{
                        border: "none", background: "transparent",
                        padding: 0, marginLeft: 2, cursor: "pointer",
                        display: "inline-flex", alignItems: "center",
                      }}
                    >
                      <X size={13} color="var(--ink-3)" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{
            display: "flex", alignItems: "flex-end", gap: 6,
            background: "var(--paper-2)",
            border: "1px solid var(--paper-line)",
            borderRadius: 22, padding: "6px 6px 6px 6px",
          }}>
            {/* Attach button (left) */}
            <button
              onClick={() => setShowAttachMenu(true)}
              aria-label="Allega"
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "transparent",
                border: "1px solid var(--paper-line)",
                cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Plus size={18} color="var(--ink-2)" />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              onKeyDown={handleKeyDown}
              placeholder="Chiedi a NormaAI..."
              rows={1}
              style={{
                flex: 1, border: "none", background: "transparent",
                fontFamily: "var(--sans)", fontSize: 14.5, color: "var(--ink)",
                outline: "none", resize: "none", lineHeight: 1.45,
                maxHeight: 120, overflowY: "auto",
                paddingTop: 6, paddingBottom: 6, paddingLeft: 4,
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && attachments.length === 0) || streaming}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: (input.trim() || attachments.length > 0) && !streaming ? "var(--vermiglio)" : "var(--paper-3)",
                border: "none", cursor: (input.trim() || attachments.length > 0) && !streaming ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
              }}
            >
              <ArrowUp size={16} color={(input.trim() || attachments.length > 0) && !streaming ? "white" : "var(--ink-4)"} />
            </button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.doc,.docx,.txt,.rtf,.odt,.csv,.xls,.xlsx"
            onChange={onFilePicked}
            multiple
            style={{ display: "none" }}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={onFilePicked}
            multiple
            style={{ display: "none" }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFilePicked}
            style={{ display: "none" }}
          />
        </div>

        <MobileTabBar />

        {/* Mobile auth sheet — opened by 402 paywall instead of routing to /onboarding */}
        <MobileAuthSheet
          open={showAuth}
          initialMode="signup"
          initialRole="privato"
          onClose={() => setShowAuth(false)}
        />

        {/* Attachment menu (bottom sheet) */}
        {showAttachMenu && (
          <div
            onClick={() => setShowAttachMenu(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 250,
              background: "rgba(26,24,20,0.5)",
              backdropFilter: "blur(2px)",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "var(--paper)",
                borderRadius: "20px 20px 0 0",
                padding: "20px 20px",
                paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
                boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
              }}
            >
              <div style={{
                width: 36, height: 4, background: "var(--paper-3)",
                borderRadius: 2, margin: "0 auto 16px",
              }} />
              <div className="serif" style={{ fontSize: 18, marginBottom: 14, textAlign: "center" }}>
                Allega
              </div>
              {[
                { kind: "camera" as const, label: "Scatta foto",  icon: Camera,    desc: "Usa la fotocamera" },
                { kind: "photo"  as const, label: "Foto da galleria", icon: ImageIcon, desc: "Scegli dalle tue foto" },
                { kind: "file"   as const, label: "Carica file",  icon: Paperclip, desc: "PDF, Word, Excel, testo" },
              ].map(({ kind, label, icon: Icon, desc }) => (
                <button
                  key={kind}
                  onClick={() => handleAttach(kind)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 12px",
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid var(--paper-line)",
                    cursor: "pointer", textAlign: "left",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "var(--paper-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Icon size={18} color="var(--vermiglio)" strokeWidth={1.6} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", fontWeight: 500 }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                      {desc}
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setShowAttachMenu(false)}
                style={{
                  width: "100%", marginTop: 14, padding: "13px",
                  borderRadius: 10,
                  background: "var(--paper-2)", border: "1px solid var(--paper-line)",
                  fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)",
                  cursor: "pointer",
                }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Onboarding gate */}
        {showGate && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(26,24,20,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "flex-end",
          }}>
            <div style={{
              width: "100%", background: "var(--paper)",
              borderRadius: "20px 20px 0 0",
              padding: "28px 24px",
              paddingBottom: "calc(28px + env(safe-area-inset-bottom))",
            }}>
              <div className="serif" style={{ fontSize: 22, marginBottom: 10 }}>
                Limite raggiunto
              </div>
              <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 20, lineHeight: 1.5 }}>
                Registrati gratis per 10 query al giorno.
              </p>
              <button
                onClick={() => { setShowGate(false); setShowAuth(true); }}
                style={{
                  width: "100%", padding: "15px", borderRadius: 10, border: "none",
                  background: "var(--vermiglio)", color: "white",
                  fontFamily: "var(--sans)", fontSize: 15, fontWeight: 600, cursor: "pointer",
                  marginBottom: 10,
                }}
              >
                Registrati gratis
              </button>
              <button
                onClick={() => setShowGate(false)}
                style={{
                  width: "100%", padding: "13px", borderRadius: 10,
                  background: "transparent", border: "1px solid var(--paper-line)",
                  fontFamily: "var(--sans)", fontSize: 14, color: "var(--ink-2)", cursor: "pointer",
                }}
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
