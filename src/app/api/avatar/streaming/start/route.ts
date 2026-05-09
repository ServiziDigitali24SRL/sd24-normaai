// /api/avatar/streaming/start — POST creates a LiveAvatar streaming session.
//
// Request:  { avatar?: "sofia"|"marco", greeting?: string }
// Response: { session_id, session_token, livekit_url }
//
// Frontend uses session_token + livekit_url with LiveAvatar SDK
// (or LiveKit JS client) to establish WebRTC stream.

import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, startSession, AVATARS, type AvatarKey } from "@/lib/liveavatar/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Body {
  avatar?: AvatarKey;
  greeting?: string;
}

// In-memory rate limit (per-IP, single instance).
// LiveAvatar trial = 1 concurrent session + each call burns ~€0.10/min.
// 10s window: prevents accidental double-tap / hot-reload spam, but does not
// block legitimate retries after the previous session was correctly stopped.
const RATE_WINDOW_MS = 10_000;
const lastStartByIp = new Map<string, number>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const now = Date.now();
    const last = lastStartByIp.get(ip) ?? 0;
    if (now - last < RATE_WINDOW_MS) {
      const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - last)) / 1000);
      return NextResponse.json(
        { error: "rate_limited", retry_after_sec: retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    lastStartByIp.set(ip, now);

    const body = (await req.json()) as Body;
    const avatarKey = body.avatar ?? "sofia";
    const cfg = AVATARS[avatarKey];

    if (!cfg.id) {
      return NextResponse.json(
        { error: "avatar_not_configured", avatar: avatarKey },
        { status: 400 },
      );
    }

    // ElevenLabs Conversational Agent integration (preferred):
    // delegates ASR+LLM+TTS to ElevenLabs; LiveAvatar = pure lip-sync renderer.
    // Falls back to LITE persona mode if env not configured.
    const elevenlabsSecretId = process.env.LIVEAVATAR_ELEVENLABS_SECRET_ID;
    const elevenlabsAgentBySofia: Record<AvatarKey, string | undefined> = {
      sofia: process.env.ELEVENLABS_AGENT_ID_SOFIA,
      marco: process.env.ELEVENLABS_AGENT_ID_MARCO,
    };
    const agentId = elevenlabsAgentBySofia[avatarKey];

    const token = await createSessionToken({
      avatar_id: cfg.id,
      ...(elevenlabsSecretId && agentId ? {
        elevenlabs_agent: { secret_id: elevenlabsSecretId, agent_id: agentId },
      } : {
        persona: {
          voice_id: cfg.voiceId,
          language: "it",
          voice_settings: {
            provider: "elevenlabs",
            speed: 1.0,
            stability: 0.75,
            similarity: 0.75,
          },
        },
      }),
      greeting: body.greeting,
    });

    // Start the actual streaming session (avatar enters "ready" state).
    // /sessions/start requires Bearer session_token and returns LiveKit access.
    const started = await startSession(token.session_id, token.session_token);

    return NextResponse.json({
      session_id: started.session_id,
      session_token: token.session_token,
      livekit_url: started.livekit_url,
      livekit_client_token: started.livekit_client_token,
      ws_url: started.ws_url,
      max_session_duration: started.max_session_duration,
      avatar: avatarKey,
    });
  } catch (err) {
    console.error("[avatar/streaming/start]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal_error" },
      { status: 500 },
    );
  }
}
