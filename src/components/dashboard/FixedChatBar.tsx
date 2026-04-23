"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Camera, ImageIcon, Paperclip, Mic, MicOff, Send, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FixedChatBarProps {
  context?: string | null;       // nome sottocategoria attiva (es. "Locazione / Affitto")
  onSend?: (text: string) => void;
  onOpenChat?: (ctx?: string) => void;
}

// ─── Menu item style ──────────────────────────────────────────────────────────

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 16px",
  border: "none",
  borderBottom: "1px solid var(--paper-line)",
  background: "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontFamily: "var(--sans)",
  fontSize: 13,
  color: "var(--ink-1)",
  textAlign: "left",
  transition: "background 0.12s",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function FixedChatBar({ context, onSend, onOpenChat }: FixedChatBarProps) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const placeholder = context
    ? `Chiedi su ${context}... il corpus NormaAI è già nel contesto`
    : "Chiedimi qualcosa sulla normativa italiana...";

  // ── Chiudi menu su click esterno ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = "auto";
      textRef.current.style.height =
        Math.min(textRef.current.scrollHeight, 120) + "px";
    }
  }, [text]);

  // ── Push-to-talk ──────────────────────────────────────────────────────────
  const startRec = () => {
    setRecording(true);
    setRecordSec(0);
    recordTimer.current = setInterval(() => setRecordSec((s) => s + 1), 1000);
  };

  const stopRec = () => {
    if (!recording) return;
    setRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    // TODO: inviare audio a Vapi/ElevenLabs → trascrizione → setText()
    // Per ora apre la chat contestuale
    onOpenChat?.(context ?? undefined);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;

  // ── Invia messaggio testuale ──────────────────────────────────────────────
  const send = () => {
    if (!text.trim()) return;
    onSend?.(text.trim());
    onOpenChat?.(context ?? text.trim());
    setText("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      style={{
        borderTop: "1px solid var(--paper-line)",
        background: "white",
        padding: "10px 16px 12px",
        flexShrink: 0,
        position: "relative",
        zIndex: 40,
      }}
    >
      {/* Label contestuale */}
      {context && (
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9,
            letterSpacing: "0.13em",
            color: "var(--vermiglio-ink)",
            textTransform: "uppercase",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ color: "var(--vermiglio)", fontFamily: "var(--serif)", fontSize: 13, fontStyle: "italic" }}>§</span>
          {context} · Sofia AI · RAG attivo
        </div>
      )}

      {/* Barra principale */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          background: "var(--paper-tint)",
          border: "1.5px solid var(--paper-line)",
          borderRadius: 14,
          padding: "8px 10px",
          transition: "border-color 0.15s",
        }}
        onFocus={() => {}}
      >
        {/* ── Bottone + con menu ── */}
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            title="Allega"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: menuOpen ? "var(--ink)" : "var(--paper-2)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: menuOpen ? "white" : "var(--ink-3)",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
          >
            {menuOpen ? <X size={14} /> : <Plus size={15} />}
          </button>

          {/* Submenu */}
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                bottom: 44,
                left: 0,
                background: "white",
                border: "1px solid var(--paper-line)",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                overflow: "hidden",
                minWidth: 170,
                zIndex: 60,
              }}
            >
              {/* Fotocamera */}
              <button
                style={menuItemStyle}
                onClick={() => {
                  setMenuOpen(false);
                  // In produzione: navigator.mediaDevices.getUserMedia({ video: true })
                  photoInputRef.current?.click();
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--paper-tint)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <Camera size={14} color="var(--ink-3)" />
                Fotocamera
              </button>

              {/* Foto / Galleria */}
              <button
                style={menuItemStyle}
                onClick={() => {
                  setMenuOpen(false);
                  photoInputRef.current?.click();
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--paper-tint)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <ImageIcon size={14} color="var(--ink-3)" />
                Foto / Galleria
              </button>

              {/* File / PDF */}
              <button
                style={{ ...menuItemStyle, borderBottom: "none" }}
                onClick={() => {
                  setMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--paper-tint)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <Paperclip size={14} color="var(--ink-3)" />
                File / PDF
              </button>
            </div>
          )}

          {/* Input nascosti */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.xlsx,.csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // TODO: upload file → widget W1 subcategoria attiva
                onOpenChat?.(context ?? undefined);
              }
            }}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // TODO: upload immagine → analisi AI
                onOpenChat?.(context ?? undefined);
              }
            }}
          />
        </div>

        {/* ── Testo o Stato registrazione ── */}
        {recording ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 8px",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--vermiglio)",
                display: "inline-block",
                animation: "mdPulse 0.8s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 14,
                color: "var(--ink-2)",
                letterSpacing: "0.06em",
              }}
            >
              {fmt(recordSec)}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--ink-4)",
                fontFamily: "var(--sans)",
              }}
            >
              Parla con Sofia… rilascia per inviare
            </span>
          </div>
        ) : (
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
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
              maxHeight: 120,
            }}
          />
        )}

        {/* ── Microfono (push-to-talk) o Invia ── */}
        {text.trim() ? (
          <button
            onClick={send}
            title="Invia"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--vermiglio)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
          >
            <Send size={13} />
          </button>
        ) : (
          <button
            onMouseDown={startRec}
            onMouseUp={stopRec}
            onMouseLeave={recording ? stopRec : undefined}
            onTouchStart={startRec}
            onTouchEnd={stopRec}
            title="Tieni premuto per parlare con Sofia"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: recording ? "var(--vermiglio)" : "var(--paper-2)",
              border: `2px solid ${recording ? "var(--vermiglio)" : "transparent"}`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: recording ? "white" : "var(--ink-3)",
              flexShrink: 0,
              transition: "all 0.15s ease",
              boxShadow: recording ? "0 0 0 4px rgba(201,57,36,0.15)" : "none",
            }}
          >
            {recording ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}
      </div>

      {/* Footer label */}
      <div
        style={{
          textAlign: "center",
          marginTop: 5,
          fontFamily: "var(--mono)",
          fontSize: 8.5,
          color: "var(--ink-5)",
          letterSpacing: "0.1em",
        }}
      >
        NormaAI non sostituisce la consulenza legale professionale
        {context && " · Contesto attivo: " + context}
      </div>
    </div>
  );
}
