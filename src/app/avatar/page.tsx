"use client";

// Surface 2 — /avatar (desktop-only)
// Hero "Sofia, in video." → bottone richiede cam+mic → connette LiveAvatar WebRTC
// Mobile UA è già reindirizzata a /voice dal middleware.
// Provider: api.liveavatar.com via /api/avatar/streaming/start (LiveKit room).

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteVideoTrack, RemoteAudioTrack } from "livekit-client";

type Phase = "hero" | "permission" | "connecting" | "live" | "error";

interface Stats {
  latencyMs: number | null;
  fps: number | null;
  bitrateKbps: number | null;
}

export default function AvatarPage() {
  const [phase, setPhase] = useState<Phase>("hero");
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ latencyMs: null, fps: null, bitrateKbps: null });

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBytesRef = useRef<{ bytes: number; ts: number } | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hangup().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSessionWithRetry(retries = 3): Promise<{
    livekit_url: string;
    livekit_client_token: string;
    session_id: string;
    session_token: string;
  }> {
    let lastErr: unknown = null;
    for (let i = 0; i < retries; i++) {
      try {
        const r = await fetch("/api/avatar/streaming/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: "sofia" }),
        });
        const j = await r.json();
        if (r.status === 401) {
          // token refresh path — backend will re-auth; just retry
          lastErr = new Error("auth_401");
          await new Promise((res) => setTimeout(res, 500 * (i + 1)));
          continue;
        }
        if (!r.ok || !j.livekit_url || !j.livekit_client_token) {
          throw new Error(j.error ?? `start_failed_${r.status}`);
        }
        return j;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error("start_failed");
  }

  async function handleStart() {
    setError(null);
    setPhase("permission");
    try {
      // 1. Request cam+mic permission
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true,
      });
      localStreamRef.current = localStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(() => {});
      }

      setPhase("connecting");

      // 2. Start LiveAvatar session
      const j = await startSessionWithRetry(3);

      // 3. Connect LiveKit room
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "video" && remoteVideoRef.current) {
          (track as RemoteVideoTrack).attach(remoteVideoRef.current);
        } else if (track.kind === "audio" && remoteAudioRef.current) {
          (track as RemoteAudioTrack).attach(remoteAudioRef.current);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setPhase("hero");
      });

      await room.connect(j.livekit_url, j.livekit_client_token);
      setPhase("live");

      // 4. Stats polling
      startStatsPolling(room);
    } catch (e) {
      console.error("[avatar] start error", e);
      setError(e instanceof Error ? e.message : "unknown_error");
      setPhase("error");
      // Cleanup partial state
      stopLocalStream();
    }
  }

  function startStatsPolling(room: Room) {
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    lastBytesRef.current = null;

    statsTimerRef.current = setInterval(async () => {
      try {
        // Pick first remote video receiver
        const participants = Array.from(room.remoteParticipants.values());
        if (!participants.length) return;
        const tracks = participants[0].videoTrackPublications;
        let pc: RTCPeerConnection | null = null;
        for (const pub of tracks.values()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const receiver = (pub.track as any)?.receiver as RTCRtpReceiver | undefined;
          if (receiver) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pc = (receiver as any).transport?.iceTransport ? null : null;
            const report = await receiver.getStats();
            let fps: number | null = null;
            let bytes = 0;
            let rtt: number | null = null;
            report.forEach((s) => {
              if (s.type === "inbound-rtp" && s.kind === "video") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                fps = (s as any).framesPerSecond ?? null;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                bytes = (s as any).bytesReceived ?? 0;
              }
              if (s.type === "candidate-pair" && (s as RTCIceCandidatePairStats).nominated) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                rtt = ((s as any).currentRoundTripTime ?? 0) * 1000;
              }
            });

            const now = Date.now();
            let kbps: number | null = null;
            if (lastBytesRef.current) {
              const dt = (now - lastBytesRef.current.ts) / 1000;
              const dBytes = bytes - lastBytesRef.current.bytes;
              if (dt > 0) kbps = Math.round((dBytes * 8) / 1000 / dt);
            }
            lastBytesRef.current = { bytes, ts: now };

            setStats({
              latencyMs: rtt != null ? Math.round(rtt) : null,
              fps: fps != null ? Math.round(fps) : null,
              bitrateKbps: kbps,
            });
            break;
          }
        }
        void pc;
      } catch {
        // ignore stats errors
      }
    }, 1500);
  }

  function stopLocalStream() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }

  async function hangup() {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch {
        /* ignore */
      }
      roomRef.current = null;
    }
    stopLocalStream();
    setStats({ latencyMs: null, fps: null, bitrateKbps: null });
    setPhase("hero");
    // Best-effort backend stop
    fetch("/api/avatar/streaming/stop", { method: "POST" }).catch(() => {});
  }

  // ─── RENDER ──────────────────────────────────────────────────────────
  if (phase === "hero" || phase === "error") {
    return (
      <main
        style={{ background: "#F5F0E6" }}
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      >
        <h1
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          className="text-6xl md:text-7xl font-semibold text-stone-900 mb-4"
        >
          Sofia, in video.
        </h1>
        <p className="text-xl text-stone-700 mb-10">Come una vera consulenza.</p>
        <button
          onClick={handleStart}
          className="px-10 py-4 rounded-full bg-stone-900 text-white text-lg font-medium hover:bg-stone-800 transition"
        >
          Inizia videochiamata
        </button>
        {phase === "error" && error && (
          <p className="mt-6 text-red-700 text-sm">Errore: {error}</p>
        )}
      </main>
    );
  }

  return (
    <main
      style={{ background: "#0a0a0a" }}
      className="min-h-screen relative flex items-center justify-center"
    >
      {(phase === "permission" || phase === "connecting") && (
        <div className="absolute inset-0 flex items-center justify-center text-stone-200 z-10">
          <p className="text-lg">
            {phase === "permission" ? "Richiesta permessi camera + microfono…" : "Connessione a Sofia…"}
          </p>
        </div>
      )}

      {/* Remote (Sofia) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="max-w-full max-h-screen"
        style={{ width: "1280px", height: "720px", objectFit: "cover" }}
      />
      <audio ref={remoteAudioRef} autoPlay />

      {/* Local preview bottom-right */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-6 right-6 rounded-lg border border-stone-700 shadow-xl"
        style={{ width: "160px", height: "120px", objectFit: "cover" }}
      />

      {/* Stats overlay */}
      {phase === "live" && (
        <div
          className="absolute top-4 left-4 bg-black/60 text-stone-100 text-xs px-3 py-2 rounded font-mono"
          aria-label="webrtc-stats"
        >
          <div>latency: {stats.latencyMs ?? "—"} ms</div>
          <div>fps: {stats.fps ?? "—"}</div>
          <div>bitrate: {stats.bitrateKbps ?? "—"} kbps</div>
        </div>
      )}

      {/* Hangup button */}
      <button
        onClick={hangup}
        aria-label="hangup"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 15.46l-5.27-.61-2.52 2.52a15.05 15.05 0 0 1-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.18 10.82 21.55 21 20.97v-5.51z" transform="rotate(135 12 12)" />
        </svg>
      </button>
    </main>
  );
}
