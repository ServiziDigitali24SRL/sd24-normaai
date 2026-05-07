"use client";

import { useConversation } from "@11labs/react";
import { useCallback, useRef, useState } from "react";
import Image from "next/image";

export function SofiaAvatar({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => console.log("[Sofia] connected"),
    onDisconnect: () => console.log("[Sofia] disconnected"),
    onError: (err) => console.error("[Sofia] error", err),
  });

  const start = useCallback(async () => {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const res = await fetch("/api/voice/conversational/token");
    const data = await res.json();
    if (data.avatar_url) setAvatarUrl(data.avatar_url);
    await conversation.startSession({ signedUrl: data.signed_url });
  }, [conversation]);

  const stop = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isSpeaking = conversation.isSpeaking;
  const status = conversation.status;
  const isConnected = status === "connected";

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
    >
      <div
        style={{
          borderRadius: "50%",
          padding: 4,
          background: isSpeaking ? "conic-gradient(#6366f1, #a78bfa, #6366f1)" : "transparent",
          boxShadow: isSpeaking
            ? "0 0 32px 8px rgba(99,102,241,0.5)"
            : "0 0 0 2px rgba(99,102,241,0.3)",
          transition: "all 0.25s ease",
          transform: isSpeaking ? "scale(1.04)" : "scale(1)",
        }}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Sofia"
            width={200}
            height={200}
            style={{ borderRadius: "50%", display: "block", objectFit: "cover" }}
            priority
            unoptimized
          />
        ) : (
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
            }}
          >
            👩‍⚖️
          </div>
        )}
      </div>

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
