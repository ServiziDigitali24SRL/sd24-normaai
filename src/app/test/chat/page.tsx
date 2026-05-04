"use client";

// Test chat page with full agent pipeline visibility.
// SSE consumer for /api/chat: streams Sofia text + agent state events.

import { useEffect, useRef, useState } from "react";

interface AgentEvent {
  agent: string;
  state: "started" | "progress" | "done" | "error";
  durationMs?: number;
  output?: string;
  error?: string;
}
interface DonePayload {
  citations?: Array<{ urn?: string; title?: string; article?: string | null }>;
  invalidCitations?: number;
  highRisk?: boolean;
  finalMarkdown?: string;
}
type Msg = { role: "user" | "assistant"; content: string };

export default function TestChatPage() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [agents, setAgents] = useState<Record<string, AgentEvent>>({});
  const [doneInfo, setDoneInfo] = useState<DonePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string>(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const message = input.trim();
    if (!message || streaming) return;
    setInput(""); setError(null); setDoneInfo(null); setAgents({});
    setMsgs(m => [...m, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationIdRef.current,
          message,
          channel: "chat",
        }),
      });
      if (!r.ok || !r.body) throw new Error(`http_${r.status}`);

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const ev = part.match(/^event:\s*(.+)$/m)?.[1];
          const data = part.match(/^data:\s*(.+)$/m)?.[1];
          if (!ev || !data) continue;
          let payload: Record<string, unknown>;
          try { payload = JSON.parse(data); } catch { continue; }
          if (ev === "token") {
            setMsgs(m => {
              const copy = [...m];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                content: copy[copy.length - 1].content + String(payload.text ?? ""),
              };
              return copy;
            });
          } else if (ev === "agent") {
            const agentEvt = payload as unknown as AgentEvent;
            setAgents(a => ({ ...a, [agentEvt.agent]: agentEvt }));
          } else if (ev === "done") {
            setDoneInfo(payload as DonePayload);
          } else if (ev === "error") {
            throw new Error(String(payload.message ?? "stream_error"));
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch_failed");
    } finally {
      setStreaming(false);
    }
  }

  const agentList = Object.values(agents).sort((a, b) => a.agent.localeCompare(b.agent));

  return (
    <main style={{
      minHeight: "100dvh", background: "var(--paper, #FDFBF7)",
      fontFamily: "var(--sans)", display: "flex", maxWidth: 1200,
      margin: "0 auto", padding: "20px 16px",
    }}>
      {/* Chat column */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <header style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
            textTransform: "uppercase", color: "var(--ink-3)",
          }}>NormaAI · chat</div>
          <h1 style={{
            fontFamily: "var(--serif)", fontSize: 26, color: "var(--ink-1)",
            margin: "6px 0 0", fontWeight: 500,
          }}>Sofia</h1>
        </header>

        <div ref={scrollRef} style={{
          flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12,
          marginBottom: 12, paddingRight: 8,
        }}>
          {msgs.length === 0 && (
            <p style={{ color: "var(--ink-3)", fontSize: 13 }}>
              Scrivi una domanda di natura legale. Sofia risponde citando fonti normative
              quando possibile. (Prova: &ldquo;Quanto tempo ho per impugnare un licenziamento illegittimo?&rdquo;)
            </p>
          )}
          {msgs.map((m, i) => (
            <article key={i} style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.role === "user" ? "var(--vermiglio, #C93924)" : "white",
              color: m.role === "user" ? "white" : "var(--ink-1)",
              padding: "12px 16px", borderRadius: 12,
              border: m.role === "user" ? "none" : "1px solid var(--paper-line, #E8E0D2)",
              fontSize: 14, lineHeight: 1.5,
              fontFamily: m.role === "assistant" ? "var(--serif)" : "var(--sans)",
              whiteSpace: "pre-wrap",
            }}>
              {m.content || (streaming && i === msgs.length - 1 ? "…" : "")}
            </article>
          ))}
        </div>

        {/* Done summary */}
        {doneInfo && (
          <div style={{
            background: "var(--paper-tint, #F8F4ED)",
            border: "1px solid var(--paper-line, #E8E0D2)",
            borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12,
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10,
              letterSpacing: "0.13em", textTransform: "uppercase",
              color: "var(--ink-3)", marginBottom: 6 }}>
              Esito pipeline
            </div>
            <div>Citazioni RAG: <strong>{doneInfo.citations?.length ?? 0}</strong></div>
            <div>Citazioni invalide: <strong>{doneInfo.invalidCitations ?? 0}</strong></div>
            <div>Materia ad alto rischio: <strong>{doneInfo.highRisk ? "sì" : "no"}</strong></div>
            {(doneInfo.citations ?? []).map((c, i) => (
              <div key={i} style={{ marginTop: 4, color: "var(--ink-2)" }}>
                · {c.title ?? c.urn} {c.article ? `art. ${c.article}` : ""}
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={streaming ? "Sofia sta rispondendo…" : "Scrivi qui la tua domanda…"}
            disabled={streaming}
            style={{
              flex: 1, padding: "12px 14px", borderRadius: 8,
              border: "1px solid var(--paper-line, #E8E0D2)",
              fontSize: 14, fontFamily: "var(--sans)",
              background: "white", color: "var(--ink-1)",
            }}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            style={{
              padding: "12px 22px", borderRadius: 8,
              background: "var(--vermiglio, #C93924)", color: "white",
              border: "none", fontSize: 14, fontWeight: 600,
              cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
              opacity: streaming || !input.trim() ? 0.5 : 1,
            }}
          >
            Invia
          </button>
        </div>
        {error && (
          <p style={{ color: "var(--red-error, #B43B25)", fontSize: 12, marginTop: 6 }}>
            {error}
          </p>
        )}
      </section>

      {/* Agent sidebar */}
      <aside style={{
        width: 280, marginLeft: 16, paddingLeft: 16,
        borderLeft: "1px solid var(--paper-line, #E8E0D2)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.13em",
          textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 12,
        }}>
          Agent pipeline
        </div>
        {agentList.length === 0 && !streaming && (
          <p style={{ color: "var(--ink-3)", fontSize: 12 }}>
            Manda un messaggio per vedere gli 8 agenti che processano la richiesta.
          </p>
        )}
        {agentList.map(a => (
          <div key={a.agent} style={{
            padding: "10px 12px", marginBottom: 8, borderRadius: 6,
            background: a.state === "error" ? "var(--vermiglio-tint, #FBE8E4)"
                      : a.state === "done"  ? "var(--paper-tint, #F8F4ED)"
                      : "white",
            border: "1px solid var(--paper-line, #E8E0D2)",
            fontSize: 12, color: "var(--ink-1)",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-3)",
              letterSpacing: "0.05em", marginBottom: 2,
            }}>
              {a.state.toUpperCase()}{a.durationMs != null ? ` · ${a.durationMs}ms` : ""}
            </div>
            <div style={{ fontWeight: 600 }}>{a.agent}</div>
            {a.output && (
              <div style={{ marginTop: 4, color: "var(--ink-2)", fontSize: 11 }}>
                {a.output}
              </div>
            )}
            {a.error && (
              <div style={{ marginTop: 4, color: "var(--red-error, #B43B25)", fontSize: 11 }}>
                {a.error}
              </div>
            )}
          </div>
        ))}
      </aside>
    </main>
  );
}
