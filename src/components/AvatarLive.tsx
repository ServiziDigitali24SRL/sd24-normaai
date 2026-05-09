"use client";

// AvatarLive — real-time WebRTC streaming avatar.
// Transport: api.liveavatar.com (LiveKit room). Backend: ElevenLabs Conversational
// Agent (ASR+LLM+TTS server-side). LiveAvatar acts as pure lip-sync renderer.
// Direct livekit-client connection (no @heygen/streaming-avatar SDK).
//
// Flow:
//   1. POST /api/avatar/streaming/start → backend opens LiveAvatar session with
//      `mode: LITE + elevenlabs_agent_config: { secret_id, agent_id }`.
//      Returns { session_id, session_token, livekit_url, livekit_client_token }.
//   2. Connect directly via livekit-client using client_token.
//   3. Subscribe to remote video+audio tracks → attach to <video>/<audio>.
//   4. speak()/interrupt() POST to api.liveavatar.com/v1/sessions/{task,interrupt}.
//
// Target: first frame < 1.5s (SER-163 lat_avatar).

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      // Expose for debugging
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__avatarRoom = room;

      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        console.log("[avatar] TrackSubscribed", track.kind, "from", participant.identity);
        if (track.kind === "video" && videoRef.current) {
          (track as RemoteVideoTrack).attach(videoRef.current);
          videoRef.current.play().catch((err) => console.warn("[avatar] video.play() failed:", err));
          setPhase("ready");
        } else if (track.kind === "audio" && audioRef.current) {
          (track as RemoteAudioTrack).attach(audioRef.current);
          audioRef.current.play().catch((err) => console.warn("[avatar] audio.play() failed:", err));
        }
      });
      room.on(RoomEvent.ParticipantConnected, (p) => {
        console.log("[avatar] ParticipantConnected:", p.identity, "kind=", p.kind);
      });
      room.on(RoomEvent.TrackPublished, (pub, p) => {
        console.log("[avatar] TrackPublished:", pub.kind, "by", p.identity);
      });
      room.on(RoomEvent.Disconnected, (reason) => {
        console.log("[avatar] Disconnected:", reason);
        setPhase("idle");
      });
      room.on(RoomEvent.MediaDevicesError, (e) => {
        console.error("[avatar] MediaDevicesError:", e);
        setError(String(e));
        setPhase("error");
      });

      await room.connect(j.livekit_url, j.livekit_client_token);
      console.log("[avatar] room.connect OK, participants:", room.remoteParticipants.size);
    } catch (e) {
      console.error("[avatar] start failed:", e);
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
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: phase === "ready" || phase === "speaking" ? "block" : "none",
        }}
      />
      <audio ref={audioRef} autoPlay style={{ display: "none" }} />
    </AvatarShell>
  );
});
