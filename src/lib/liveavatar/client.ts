// LiveAvatar (by HeyGen) — real-time WebRTC streaming avatar.
//
// Flow:
//   1. Backend route POST /api/avatar/streaming/start
//      → calls POST https://api.liveavatar.com/v1/sessions/token
//      → returns { session_id, session_token } to frontend
//   2. Frontend LiveAvatar SDK connects via WebRTC using session_token
//   3. Frontend sends "speak text" events via SDK → avatar speaks in real-time
//
// Auth: X-API-KEY header.
// Docs: https://docs.liveavatar.com/api-reference

const BASE = "https://api.liveavatar.com/v1";
const API_KEY = process.env.LIVEAVATAR_API_KEY ?? "";

export interface AvatarPersona {
  voice_id?: string;       // default: ElevenLabs Italian voice from settings
  context_id?: string;     // optional knowledge base ID
  language?: string;       // "it" / "en" / etc.
  voice_settings?: {
    provider?: "elevenlabs" | "heygen";
    speed?: number;        // 0.5–2.0
    stability?: number;    // 0–1
    similarity?: number;   // 0–1
  };
}

export interface CreateSessionInput {
  avatar_id: string;       // LiveAvatar UUID (post-migration da HeyGen)
  persona?: AvatarPersona;
  /**
   * Optional initial system message for the avatar
   * (otherwise it stays idle until first speak).
   */
  greeting?: string;
  /**
   * If set, drive conversation via ElevenLabs Conversational AI Agent.
   * LiveAvatar becomes a pure lip-sync renderer; ElevenLabs handles ASR + LLM + TTS.
   * Doc: https://elevenlabs.io/docs/eleven-agents/guides/integrations/live-avatar
   */
  elevenlabs_agent?: {
    secret_id: string;
    agent_id: string;
  };
}

export interface SessionToken {
  session_id: string;
  session_token: string;   // short-lived JWT (used as Bearer for /sessions/start)
}

export interface StartedSession {
  session_id: string;
  livekit_url: string;
  livekit_client_token: string;
  ws_url?: string;
  max_session_duration?: number;
}

/**
 * Create a session token for an authenticated LiveAvatar session.
 * Token is short-lived (~5 min); start streaming immediately.
 */
export async function createSessionToken(input: CreateSessionInput): Promise<SessionToken> {
  if (!API_KEY) throw new Error("liveavatar_no_api_key");

  const r = await fetch(`${BASE}/sessions/token`, {
    method: "POST",
    headers: {
      "X-API-KEY": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // mode: LITE = speak-text mode. With elevenlabs_agent_config we delegate
      // ASR+LLM+TTS to an ElevenLabs Conversational Agent and LiveAvatar just
      // renders lip-sync from the agent's audio output (PCM 24000 required).
      mode: "LITE",
      avatar_id: input.avatar_id,
      ...(input.elevenlabs_agent ? {
        elevenlabs_agent_config: {
          secret_id: input.elevenlabs_agent.secret_id,
          agent_id: input.elevenlabs_agent.agent_id,
        },
      } : {
        avatar_persona: input.persona ? {
          voice_id: input.persona.voice_id,
          context_id: input.persona.context_id,
          language: input.persona.language ?? "it",
          voice_settings: input.persona.voice_settings ? {
            provider: input.persona.voice_settings.provider ?? "elevenlabs",
            speed: input.persona.voice_settings.speed ?? 1.0,
            stability: input.persona.voice_settings.stability ?? 0.75,
            similarity: input.persona.voice_settings.similarity ?? 0.75,
          } : undefined,
        } : undefined,
      }),
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`liveavatar_${r.status}_${body.slice(0, 200)}`);
  }
  const j = await r.json() as { code: number; data?: { session_id: string; session_token: string; livekit_url?: string } };
  if (j.code !== 1000 || !j.data) {
    throw new Error(`liveavatar_bad_response_${j.code}`);
  }
  return {
    session_id: j.data.session_id,
    session_token: j.data.session_token,
  };
}

/**
 * Start the actual streaming session.
 * Auth: Bearer session_token (NOT X-API-KEY — /start uses the JWT issued by /token).
 * Returns LiveKit URL + client token needed by the frontend SDK.
 */
export async function startSession(
  session_id: string,
  session_token: string,
): Promise<StartedSession> {
  const r = await fetch(`${BASE}/sessions/start`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id }),
  });
  if (!r.ok) throw new Error(`liveavatar_start_${r.status}`);
  const j = await r.json() as {
    code: number;
    data?: {
      session_id: string;
      livekit_url: string;
      livekit_client_token: string;
      ws_url?: string;
      max_session_duration?: number;
    };
  };
  if (j.code !== 1000 || !j.data) {
    throw new Error(`liveavatar_start_bad_${j.code}`);
  }
  return j.data;
}

/** Stop session (cleanup quota). */
export async function stopSession(session_id: string): Promise<void> {
  await fetch(`${BASE}/sessions/stop`, {
    method: "POST",
    headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ session_id }),
  }).catch(() => { /* fire-and-forget */ });
}

/** Keep-alive ping (session expires after ~3 min idle). */
export async function keepAlive(session_id: string): Promise<void> {
  await fetch(`${BASE}/sessions/keep_alive`, {
    method: "POST",
    headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ session_id }),
  }).catch(() => { /* idempotent */ });
}

/**
 * Avatar IDs configured per NormaAI personas.
 * Da popolare dopo migrazione da HeyGen → LiveAvatar (i UUID cambiano).
 * Override via env: LIVEAVATAR_AVATAR_ID_SOFIA / _MARCO.
 */
export const AVATARS = {
  sofia: {
    id: process.env.LIVEAVATAR_AVATAR_ID_SOFIA ?? "",
    voiceId: process.env.LIVEAVATAR_VOICE_ID_SOFIA ?? "EXAVITQu4vr4xnSDxMaL", // ElevenLabs IT default
    label: "Sofia",
  },
  marco: {
    id: process.env.LIVEAVATAR_AVATAR_ID_MARCO ?? "",
    voiceId: process.env.LIVEAVATAR_VOICE_ID_MARCO ?? "",
    label: "Marco",
  },
} as const;

export type AvatarKey = keyof typeof AVATARS;
