"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, X, Paperclip } from "lucide-react";
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
          wordBreak: "break-word",
          overflowWrap: "break-word",
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

function resizeImageToBase64(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Rimuovi prefisso data:image/jpeg;base64,
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function MobileChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentText, setCurrentText] = useState("");
  const [showGate, setShowGate] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentText]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(file);
    e.target.value = "";
  };

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !attachment) || streaming) return;
    const question = text.trim() || (attachment ? `Analizza questo documento: ${attachment.name}` : "");
    const currentAttachment = attachment;
    setInput("");
    setAttachment(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: currentAttachment ? `${question}\n📎 ${currentAttachment.name}` : question, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setStreaming(true);
    setCurrentText("");

    try {
      const history = messages.slice(-6).flatMap((m) => [
        { role: m.role === "user" ? "user" : "assistant" as const, content: m.text },
      ]);

      // Leggi il file come base64 se presente
      let attachmentPayload: { type: "document" | "image"; mediaType: string; name: string; data: string } | undefined;
      if (currentAttachment) {
        const isImage = currentAttachment.type.startsWith("image/");
        let base64: string;
        if (isImage) {
          // Ridimensiona immagini >1MB per evitare payload troppo grandi (foto iPhone 4-8MB)
          base64 = await resizeImageToBase64(currentAttachment, 1200);
        } else {
          const arrayBuffer = await currentAttachment.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          base64 = btoa(binary);
        }
        attachmentPayload = {
          type: isImage ? "image" : "document",
          mediaType: isImage ? "image/jpeg" : (currentAttachment.type || "application/octet-stream"),
          name: currentAttachment.name,
          data: base64,
        };
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          vertical: null,
          userId: null,
          conversationHistory: history,
          turnNumber: messages.filter((m) => m.role === "user").length,
          ...(attachmentPayload ? { attachment: attachmentPayload } : {}),
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
            <div style={{ textAlign: "center", padding: "60px 24px 20px" }}>
              <div className="serif" style={{
                fontSize: 32, fontStyle: "italic", color: "var(--ink-4)",
                marginBottom: 12,
              }}>{'\u00A7'}</div>
              <p style={{ fontSize: 14.5, color: "var(--ink-3)", lineHeight: 1.6, padding: "0 8px", fontFamily: "var(--sans)" }}>
                Chiedimi qualsiasi cosa di legge, norme o diritti.
              </p>
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
          {/* Attachment chip */}
          {attachment && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              marginBottom: 8, padding: "6px 10px",
              background: "var(--paper-2)", border: "1px solid var(--paper-line)",
              borderRadius: 20, width: "fit-content", maxWidth: "100%",
            }}>
              <Paperclip size={12} color="var(--ink-3)" />
              <span style={{
                fontFamily: "var(--sans)", fontSize: 12.5, color: "var(--ink-2)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200,
              }}>
                {attachment.name}
              </span>
              <button
                onClick={() => setAttachment(null)}
                style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", display: "flex", flexShrink: 0 }}
                aria-label="Rimuovi allegato"
              >
                <X size={12} color="var(--ink-3)" />
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />

          <div style={{
            display: "flex", alignItems: "flex-end", gap: 6,
            background: "var(--paper-2)",
            border: "1px solid var(--paper-line)",
            borderRadius: 22, padding: "6px 6px 6px 6px",
          }}>
            {/* Attachment button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Allega file"
              style={{
                width: 36, height: 36, borderRadius: "50%",
                border: "none", background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, cursor: "pointer",
              }}
            >
              <Paperclip size={17} color="var(--ink-3)" />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              onKeyDown={handleKeyDown}
              placeholder="Chiedi a NormaAI..."
              rows={1}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-form-type="other"
              style={{
                flex: 1, border: "none", background: "transparent",
                fontFamily: "var(--sans)", fontSize: 14.5, color: "var(--ink)",
                outline: "none", resize: "none", lineHeight: 1.45,
                maxHeight: 120, overflowY: "auto",
                paddingTop: 6, paddingBottom: 6,
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && !attachment) || streaming}
              aria-label="Invia messaggio"
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: (input.trim() || attachment) && !streaming ? "var(--vermiglio)" : "var(--paper-3)",
                border: "none", cursor: (input.trim() || attachment) && !streaming ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
              }}
            >
              <ArrowUp size={16} color={(input.trim() || attachment) && !streaming ? "white" : "var(--ink-4)"} />
            </button>
          </div>
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
