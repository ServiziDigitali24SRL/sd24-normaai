"use client";

// AvatarStream — renders Sofia talking-head video from HeyGen.
// Flow: pass `text` prop → POST /api/avatar/generate → poll /api/avatar/status
// every 2s until status === "completed" → show <video> autoplay.
//
// HeyGen generation takes 8-15s for ~150 chars. Show shimmer + ETA in the meantime.

import { useEffect, useRef, useState } from "react";
import { AvatarShell, type AvatarKey, type AvatarPhase } from "./AvatarShell";

type Phase = Extract<AvatarPhase, "idle" | "generating" | "ready" | "error">;
export type { AvatarKey };

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

  return (
    <AvatarShell
      avatar={avatar}
      phase={phase}
      onAvatarChange={onAvatarChange}
      showSelector={showSelector}
      waitingLabel={`${elapsedSec}s`}
      error={error}
    >
      {phase === "ready" && videoUrl && (
        <video
          src={videoUrl}
          autoPlay
          playsInline
          controls
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}
    </AvatarShell>
  );
}
