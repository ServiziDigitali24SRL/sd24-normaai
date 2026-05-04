"use client";

// AvatarLive — real-time WebRTC streaming avatar via LiveAvatar (HeyGen rebrand).
// Direct LiveKit connection (no @heygen/streaming-avatar SDK conflict).
//
// Flow:
//   1. POST /api/avatar/streaming/start → backend creates session AND starts it
//      → returns { session_id, session_token, livekit_url, livekit_client_token }
//   2. We connect directly via livekit-client to the LiveKit room with the client_token
//   3. Subscribe to remote video+audio tracks → attach to <video>
//   4. speak()/interrupt() POST to LiveAvatar task endpoints with session_token
//
// Latency: ~1.5s first frame.

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Room, RoomEvent, RemoteVideoTrack, RemoteAudioTrack } from "livekit-client";
import { AvatarShell, type AvatarKey, type AvatarPhase } from "./AvatarShell";

export type { AvatarKey };

export interface AvatarLiveHandle {
  speak: (text: string) => Promise<void>;
  interrupt: () => Promise<void>;
  stop: () => Promise<void>;
}

type Phase = Extract<AvatarPhase, "idle" | "connecting" | "ready" | "speaking" | "error">;

interface SessionState {
  session_id: string;
  session_token: string;
}

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
  const roomRef = useRef<Room | null>(null);
  const sessionRef = useRef<SessionState | null>(null);

  const start = async () => {
    if (roomRef.current) return;
    setPhase("connecting");
    setError(null);

    try {
      const r = await fetch("/api/avatar/streaming/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar }),
      });
      const j = await r.json();
      if (!r.ok || !j.livekit_url || !j.livekit_client_token) {
        throw new Error(j.error ?? `start_failed_${r.status}`);
      }
      sessionRef.current = { session_id: j.session_id, session_token: j.session_token };

      // Direct LiveKit connection — no SDK middleman.
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "video" && videoRef.current) {
          (track as RemoteVideoTrack).attach(videoRef.current);
          setPhase("ready");
        } else if (track.kind === "audio" && videoRef.current) {
          (track as RemoteAudioTrack).attach(videoRef.current);
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        setPhase("idle");
      });
      room.on(RoomEvent.MediaDevicesError, (e) => {
        setError(String(e));
        setPhase("error");
      });

      await room.connect(j.livekit_url, j.livekit_client_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setPhase("error");
      roomRef.current = null;
    }
  };

  const sendTask = async (text: string, taskType: "repeat" | "interrupt" = "repeat") => {
    const sess = sessionRef.current;
    if (!sess) return;
    if (taskType === "interrupt") {
      await fetch("https://api.liveavatar.com/v1/sessions/interrupt", {
        method: "POST",
        headers: { "Authorization": `Bearer ${sess.session_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sess.session_id }),
      }).catch(() => {});
      return;
    }
    await fetch("https://api.liveavatar.com/v1/sessions/task", {
      method: "POST",
      headers: { "Authorization": `Bearer ${sess.session_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sess.session_id, text, task_type: "repeat" }),
    }).catch(() => {});
  };

  useImperativeHandle(
    ref,
    () => ({
      async speak(text: string) {
        setPhase("speaking");
        await sendTask(text, "repeat");
        // ready will be set back when track activity ends; LiveKit doesn't expose
        // a "speaking ended" event, so we just trust that the audio resumes idle.
        setTimeout(() => setPhase("ready"), 500);
      },
      async interrupt() {
        await sendTask("", "interrupt");
        setPhase("ready");
      },
      async stop() {
        const room = roomRef.current;
        const sess = sessionRef.current;
        if (room) {
          try { await room.disconnect(); } catch { /* ignore */ }
          roomRef.current = null;
        }
        if (sess) {
          fetch("/api/avatar/streaming/stop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sess.session_id }),
            keepalive: true,
          }).catch(() => {});
        }
        sessionRef.current = null;
        setPhase("idle");
      },
    }),
    [],
  );

  useEffect(() => {
    if (autoStart && phase === "idle") void start();

    const onUnload = () => {
      const sess = sessionRef.current;
      if (!sess) return;
      try {
        const blob = new Blob([JSON.stringify({ session_id: sess.session_id })], { type: "application/json" });
        navigator.sendBeacon?.("/api/avatar/streaming/stop", blob);
      } catch { /* ignore */ }
    };
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      const room = roomRef.current;
      const sess = sessionRef.current;
      if (room) {
        room.disconnect().catch(() => {});
        roomRef.current = null;
      }
      if (sess) {
        fetch("/api/avatar/streaming/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sess.session_id }),
          keepalive: true,
        }).catch(() => {});
        sessionRef.current = null;
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
