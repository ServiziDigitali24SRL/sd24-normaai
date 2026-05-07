"use client";

import { useConversation } from "@11labs/react";
import { useCallback, useEffect, useRef } from "react";

export function SofiaAvatar({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    onConnect: () => console.log("[Sofia] connected"),
    onDisconnect: () => console.log("[Sofia] disconnected"),
    onError: (err) => console.error("[Sofia] error", err),
  });

  const start = useCallback(async () => {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const res = await fetch("/api/voice/conversational/token");
    const { signed_url } = await res.json();
    await conversation.startSession({ signedUrl: signed_url });
  }, [conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isSpeaking = conversation.isSpeaking;
  const status = conversation.status;
  const isConnected = status === "connected";

  return (
    <div ref={containerRef} className={className} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {/* Avatar orb — pulsa quando Sofia parla */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: isSpeaking
            ? "radial-gradient(circle, #6366f1 0%, #4f46e5 60%, #1e1b4b 100%)"
            : "radial-gradient(circle, #818cf8 0%, #6366f1 60%, #1e1b4b 100%)",
          boxShadow: isSpeaking
            ? "0 0 40px 10px rgba(99,102,241,0.6)"
            : "0 0 20px 4px rgba(99,102,241,0.3)",
          transition: "all 0.2s ease",
          transform: isSpeaking ? "scale(1.08)" : "scale(1)",
          cursor: isConnected ? "pointer" : "default",
        }}
      />

      <span style={{ fontSize: 13, color: "#94a3b8" }}>
        {status === "connecting" && "Connessione…"}
        {status === "connected" && (isSpeaking ? "Sofia sta parlando…" : "In ascolto")}
        {status === "disconnected" && "Sofia — assistente legale AI"}
      </span>

      {!isConnected ? (
        <button
          onClick={start}
          disabled={status === "connecting"}
          style={{
            padding: "10px 28px",
            borderRadius: 9999,
            background: "#6366f1",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {status === "connecting" ? "Connessione…" : "Parla con Sofia"}
        </button>
      ) : (
        <button
          onClick={stop}
          style={{
            padding: "10px 28px",
            borderRadius: 9999,
            background: "#ef4444",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Termina
        </button>
      )}
    </div>
  );
}
