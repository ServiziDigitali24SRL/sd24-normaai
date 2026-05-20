"use client";

/**
 * /mobile/chat — chat scritta mobile-style.
 * Wire diretto a /api/chat (SSE stream).
 * Quota gate identica al desktop.
 */

import { useEffect, useRef, useState } from "react";
import { MobileShell } from "@/components/mobile/shell";
import { MobileButton } from "@/components/mobile/buttons";
import { MOBILE_COLORS, MOBILE_FONT, MOBILE_SPACING } from "@/components/mobile/theme";
import { loadDraft } from "../onboarding/draft";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface QuotaResponse {
  used: number;
  limit: number;
  remaining: number;
}

export default function MobileChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [userName, setUserName] = useState("");
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = loadDraft();
    setUserName(d.first_name);
    fetchQuota();
  }, []);

  const fetchQuota = () => {
    fetch("/api/quota/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: QuotaResponse | null) => {
        if (j) setQuota(j);
      })
      .catch(() => {});
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };
    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "chat_failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // SSE parsing best-effort: gli endpoint /api/chat ritornano sia SSE
        // formattato che plain stream. Estraiamo solo i delta data: { content }
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload) as { content?: string; delta?: string; text?: string };
            const piece = obj.content ?? obj.delta ?? obj.text ?? "";
            acc += piece;
            setMessages((m) =>
              m.map((msg) => (msg.id === assistantMsg.id ? { ...msg, content: acc } : msg))
            );
          } catch {
            // Plain text fallback
            acc += payload;
            setMessages((m) =>
              m.map((msg) => (msg.id === assistantMsg.id ? { ...msg, content: acc } : msg))
            );
          }
        }
      }
      fetchQuota();
    } catch (e) {
      const errText = e instanceof Error ? e.message : "Errore chat";
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantMsg.id ? { ...msg, content: `⚠️ ${errText}` } : msg
        )
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell
      topbar
      topbarTitle="Chat con Sofia"
      topbarRight={
        quota && (
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: quota.remaining === 0 ? MOBILE_COLORS.orangeLight : MOBILE_COLORS.blueLight,
              color: quota.remaining === 0 ? MOBILE_COLORS.orange : MOBILE_COLORS.blue,
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {quota.used}/{quota.limit}
          </span>
        )
      }
      userName={userName || undefined}
      contentPadding={0}
    >
      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: `${MOBILE_SPACING.md}px ${MOBILE_SPACING.lg}px`,
          display: "flex",
          flexDirection: "column",
          gap: MOBILE_SPACING.md,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              color: MOBILE_COLORS.textMuted,
            }}
          >
            <div style={{ fontSize: 36, lineHeight: 1, color: MOBILE_COLORS.blue, marginBottom: 12 }}>§</div>
            <div style={{ fontSize: MOBILE_FONT.bodyLg, fontWeight: 600, color: MOBILE_COLORS.text }}>
              Scrivi la tua domanda
            </div>
            <div style={{ marginTop: 4, fontSize: MOBILE_FONT.small }}>
              Lavoro, affitto, tasse, condominio, contratti…
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "12px 16px",
              borderRadius: 18,
              background: m.role === "user" ? MOBILE_COLORS.blue : MOBILE_COLORS.surface,
              color: m.role === "user" ? "white" : MOBILE_COLORS.text,
              boxShadow: m.role === "assistant" ? "0 1px 2px rgba(0,0,0,0.04)" : undefined,
              border: m.role === "assistant" ? `1px solid ${MOBILE_COLORS.line}` : undefined,
              fontSize: MOBILE_FONT.body,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {m.content || (m.role === "assistant" && busy ? "…" : "")}
          </div>
        ))}
      </div>

      {/* Quota exhausted CTA */}
      {quota && quota.remaining === 0 && (
        <div
          style={{
            margin: `0 ${MOBILE_SPACING.lg}px ${MOBILE_SPACING.sm}px`,
            padding: 12,
            background: MOBILE_COLORS.orangeLight,
            color: MOBILE_COLORS.text,
            borderRadius: 12,
            fontSize: MOBILE_FONT.small,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ flex: 1 }}>
            Hai usato le 10 consultazioni gratis. Per casi seri, parla con un avvocato.
          </span>
          <a
            href="/lead/new"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: MOBILE_COLORS.orange,
              color: "white",
              fontSize: MOBILE_FONT.caption,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            9€ →
          </a>
        </div>
      )}

      {/* Composer */}
      <div
        style={{
          borderTop: `1px solid ${MOBILE_COLORS.line}`,
          padding: `${MOBILE_SPACING.sm}px ${MOBILE_SPACING.lg}px calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_SPACING.sm}px)`,
          background: MOBILE_COLORS.bg,
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Scrivi la tua domanda…"
          rows={1}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            padding: "10px 14px",
            border: `1.5px solid ${MOBILE_COLORS.line}`,
            borderRadius: 22,
            background: MOBILE_COLORS.surface,
            fontFamily: MOBILE_FONT.family,
            fontSize: MOBILE_FONT.body,
            color: MOBILE_COLORS.text,
            outline: "none",
            resize: "none",
            lineHeight: 1.4,
          }}
        />
        <MobileButton
          variant="primary"
          size="md"
          disabled={!input.trim() || busy || (quota?.remaining === 0)}
          onClick={send}
          style={{ borderRadius: 22, width: 44, padding: 0 }}
          aria-label="Invia"
        >
          ↑
        </MobileButton>
      </div>
    </MobileShell>
  );
}
