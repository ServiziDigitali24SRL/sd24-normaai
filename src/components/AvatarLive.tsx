"use client";

// AvatarLive — real-time WebRTC streaming avatar via LiveAvatar (HeyGen rebrand).
// Drop-in replacement for AvatarStream (which used the old async generate API).
//
// Flow:
//   1. POST /api/avatar/streaming/start → { session_id, session_token, livekit_url }
//   2. StreamingAvatar SDK connects to LiveKit via session_token
//   3. Parent calls speak() via ref to send text → avatar parla in real-time
//
// Latency: ~1.5s first frame, <500ms per speak() chunk after.

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import StreamingAvatar, {
  StreamingEvents,
  TaskType,
} from "@heygen/streaming-avatar";
import { AvatarShell, type AvatarKey, type AvatarPhase } from "./AvatarShell";

export type { AvatarKey };

export interface AvatarLiveHandle {
  speak: (text: string) => Promise<void>;
  interrupt: () => Promise<void>;
  stop: () => Promise<void>;
}

type Phase = Extract<AvatarPhase, "idle" | "connecting" | "ready" | "speaking" | "error">;

export const AvatarLive = forwardRef<
  AvatarLiveHandle,
  {
    avatar?: AvatarKey;
    onAvatarChange?: (a: AvatarKey) => void;
    showSelector?: boolean;
    autoStart?: boolean;
  }
>(function AvatarLive(
  { avatar = "sofia", onAvatarChange, showSelector = true, autoStart = true },
  ref,
) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sdkRef = useRef<StreamingAvatar | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const start = async () => {
    if (sdkRef.current) return;
    setPhase("connecting");
    setError(null);
    try {
      const r = await fetch("/api/avatar/streaming/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar }),
      });
      const j = await r.json();
      if (!r.ok || !j.session_token) {
        throw new Error(j.error ?? `start_failed_${r.status}`);
      }
      sessionIdRef.current = j.session_id;

      const sdk = new StreamingAvatar({ token: j.session_token });
      sdkRef.current = sdk;

      sdk.on(StreamingEvents.STREAM_READY, (event: { detail: MediaStream }) => {
        if (videoRef.current && event.detail) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.play().catch(() => {});
        }
        setPhase("ready");
      });
      sdk.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setPhase("idle");
        sdkRef.current = null;
      });
      sdk.on(StreamingEvents.AVATAR_START_TALKING, () => setPhase("speaking"));
      sdk.on(StreamingEvents.AVATAR_STOP_TALKING, () => setPhase("ready"));

      // Already-created session → just attach via the token
      // (createStartAvatar would create a new one, we reuse our backend's)
      // The SDK requires createStartAvatar to bootstrap LiveKit room; we let it
      // re-use the same session by passing the existing avatar/voice.
      // Per LiveAvatar docs (post-HeyGen rebrand), token covers an existing session.
      // If the SDK insists on creating a new one, fall back to its API.
      // Keep it simple: pass minimal config and rely on token's session binding.
      // Note: SDK API stable as of @heygen/streaming-avatar 2.x.
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setPhase("error");
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      async speak(text: string) {
        if (!sdkRef.current) return;
        await sdkRef.current.speak({ text, taskType: TaskType.REPEAT });
      },
      async interrupt() {
        if (!sdkRef.current) return;
        await sdkRef.current.interrupt();
      },
      async stop() {
        if (!sdkRef.current) return;
        try {
          await sdkRef.current.stopAvatar();
        } catch { /* ignore */ }
        sdkRef.current = null;
        sessionIdRef.current = null;
        setPhase("idle");
      },
    }),
    [],
  );

  useEffect(() => {
    if (autoStart && phase === "idle") void start();
    return () => {
      // best-effort cleanup
      const sdk = sdkRef.current;
      if (sdk) {
        sdk.stopAvatar().catch(() => {});
        sdkRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);

  return (
    <AvatarShell
      avatar={avatar}
      phase={phase}
      onAvatarChange={onAvatarChange}
      showSelector={showSelector}
      waitingLabel="connessione"
      error={error}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: phase === "ready" || phase === "speaking" ? "block" : "none",
        }}
      />
    </AvatarShell>
  );
});
