"use client";

// AvatarStream — renders Sofia talking-head video from HeyGen.
// Flow: pass `text` prop → POST /api/avatar/generate → poll /api/avatar/status
// every 2s until status === "completed" → show <video> autoplay.
//
// HeyGen generation takes 8-15s for ~150 chars. Show shimmer + ETA in the meantime.

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "generating" | "ready" | "error";
export type AvatarKey = "sofia" | "marco";

export function AvatarStream({
  text,
  avatar = "sofia",
  onAvatarChange,
  showSelector = true,
}: {
  text: string;
  avatar?: AvatarKey;
  onAvatarChange?: (a: AvatarKey) => void;
  showSelector?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!text || text.trim().length < 5) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let tickTimer: ReturnType<typeof setInterval> | null = null;

    async function run() {
      setPhase("generating");
      setVideoUrl(null);
      setError(null);
      startedAtRef.current = Date.now();
      tickTimer = setInterval(() => {
        if (startedAtRef.current) {
          setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }
      }, 1000);

      try {
        const r = await fetch("/api/avatar/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, avatar }),
        });
        const j = await r.json();
        if (!r.ok || !j.videoId) throw new Error(j.error ?? "generate_failed");

        const startedAt = Date.now();
        const MAX_WAIT_MS = 180_000; // 3 min hard cap — HeyGen Business avg 60-90s, p95 ≤180s

        const poll = async () => {
          if (cancelled) return;
          const res = await fetch(`/api/avatar/status?id=${j.videoId}`);
          const s = await res.json().catch(() => ({}));
          if (cancelled) return;

          // Treat any error response (HTTP non-2xx OR `{error: ...}` body) as failed
          if (!res.ok || s.error) {
            setError(s.error ?? `status_http_${res.status}`);
            setPhase("error");
            if (tickTimer) clearInterval(tickTimer);
            return;
          }

          if (s.status === "completed" && s.videoUrl) {
            setVideoUrl(s.videoUrl);
            setPhase("ready");
            if (tickTimer) clearInterval(tickTimer);
            return;
          }
          if (s.status === "failed") {
            setError(s.error ?? "heygen_failed");
            setPhase("error");
            if (tickTimer) clearInterval(tickTimer);
            return;
          }

          // Still processing — bail out if we've exceeded the hard cap
          if (Date.now() - startedAt > MAX_WAIT_MS) {
            setError("timeout_180s");
            setPhase("error");
            if (tickTimer) clearInterval(tickTimer);
            return;
          }
          pollTimer = setTimeout(poll, 2000);
        };
        await poll();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "unknown");
          setPhase("error");
          if (tickTimer) clearInterval(tickTimer);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (tickTimer) clearInterval(tickTimer);
    };
  }, [text, avatar]);

  if (phase === "idle") return null;

  const pickerBtn = (key: AvatarKey, label: string) => (
    <button
      key={key}
      onClick={() => onAvatarChange?.(key)}
      disabled={!onAvatarChange || phase === "generating"}
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        border: "1px solid var(--paper-line, #E8E0D2)",
        background: avatar === key ? "var(--vermiglio, #C93924)" : "white",
        color: avatar === key ? "white" : "var(--ink-2)",
        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.13em", textTransform: "uppercase",
        cursor: onAvatarChange && phase !== "generating" ? "pointer" : "default",
        opacity: !onAvatarChange ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      {showSelector && (
        <div style={{ display: "flex", gap: 8 }}>
          {pickerBtn("sofia", "Sofia")}
          {pickerBtn("marco", "Marco")}
        </div>
      )}
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          aspectRatio: "9 / 16",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--paper-tint, #F8F4ED)",
          position: "relative",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
      {phase === "generating" && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 11,
          letterSpacing: "0.13em", textTransform: "uppercase", gap: 12,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "2px solid var(--paper-line, #E8E0D2)",
            borderTopColor: "var(--vermiglio, #C93924)",
            animation: "spin 0.8s linear infinite",
          }} />
          <span>{avatar === "marco" ? "Marco" : "Sofia"} · {elapsedSec}s</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {phase === "ready" && videoUrl && (
        <video
          src={videoUrl}
          autoPlay
          playsInline
          controls
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}

      {phase === "error" && (
        <div style={{
          position: "absolute", inset: 0, padding: 16, display: "flex",
          alignItems: "center", justifyContent: "center", textAlign: "center",
          color: "var(--red-error, #B43B25)", fontSize: 13,
        }}>
          Avatar non disponibile{error ? `: ${error.slice(0, 80)}` : ""}
        </div>
      )}
      </div>
    </div>
  );
}
