// /api/avatar/livesession — Surface 2 (LiveAvatar Beta WebRTC sessions)
//
// POST   create session     → { session_id, ws_url, turn_servers, stun_servers, expires_at, healthcheck_url }
// GET    ?session_id=xxx    → { session_id, status, expires_at }
// DELETE ?session_id=xxx    → { session_id, deleted: true }
//
// Auth toward LiveAvatar Beta: header X-API-KEY (NOT Bearer).
// Public route (whitelisted in middleware) — auth happens via env on server side.
//
// Runtime: edge (low-latency proxy, no Buffer/Node API needed).

import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface CreateBody {
  avatar_id?: string;
  user_id?: string;
  max_duration_min?: number;
}

interface LiveAvatarCreateResponse {
  session_id?: string;
  ws_url?: string;
  turn_servers?: unknown;
  stun_servers?: unknown;
  expires_at?: string;
  healthcheck_url?: string;
  [k: string]: unknown;
}

interface LiveAvatarStatusResponse {
  session_id?: string;
  status?: string;
  expires_at?: string;
  [k: string]: unknown;
}

const DEFAULT_ENDPOINT = "https://api.liveavatar.com/v1";
const DEFAULT_AVATAR_ID = "sofia-avvocato-v1";
const DEFAULT_MAX_DURATION_MIN = 5;

const NO_STORE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE_HEADERS });
}

function envOrNull(): { apiKey: string; endpoint: string } | null {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  if (!apiKey) return null;
  const endpoint = process.env.LIVEAVATAR_API_ENDPOINT || DEFAULT_ENDPOINT;
  return { apiKey, endpoint: endpoint.replace(/\/$/, "") };
}

function envMissingResponse(): Response {
  return jsonResponse(503, {
    error: "service_unavailable",
    message:
      "LiveAvatar not configured (missing LIVEAVATAR_API_KEY). Endpoint optional via LIVEAVATAR_API_ENDPOINT.",
  });
}

function upstreamFailure(status: number, message: string, code: string): Response {
  return jsonResponse(502, {
    error: message,
    code,
    upstream_status: status,
    fallback_url: "/contatti",
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  const env = envOrNull();
  if (!env) return envMissingResponse();

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  if (!body.user_id || typeof body.user_id !== "string") {
    return jsonResponse(400, {
      error: "missing_user_id",
      message: "user_id is required.",
    });
  }

  const avatarId =
    body.avatar_id ||
    process.env.LIVEAVATAR_DEFAULT_AVATAR_ID ||
    DEFAULT_AVATAR_ID;

  const maxDurationMin =
    typeof body.max_duration_min === "number" && body.max_duration_min > 0
      ? Math.min(60, Math.floor(body.max_duration_min))
      : DEFAULT_MAX_DURATION_MIN;

  let upstream: Response;
  try {
    upstream = await fetch(`${env.endpoint}/sessions`, {
      method: "POST",
      headers: {
        "X-API-KEY": env.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        avatar_id: avatarId,
        user_id: body.user_id,
        max_duration_seconds: maxDurationMin * 60,
      }),
    });
  } catch (err) {
    return jsonResponse(502, {
      error: "upstream_unreachable",
      code: "fetch_failed",
      fallback_url: "/contatti",
      message: err instanceof Error ? err.message : "fetch failed",
    });
  }

  if (!upstream.ok) {
    const txt = await upstream.text().catch(() => "");
    return upstreamFailure(
      upstream.status,
      txt ? txt.slice(0, 500) : "liveavatar_error",
      `liveavatar_${upstream.status}`,
    );
  }

  let data: LiveAvatarCreateResponse;
  try {
    data = (await upstream.json()) as LiveAvatarCreateResponse;
  } catch {
    return upstreamFailure(upstream.status, "invalid_upstream_json", "liveavatar_parse");
  }

  return new Response(
    JSON.stringify({
      session_id: data.session_id ?? null,
      ws_url: data.ws_url ?? null,
      turn_servers: data.turn_servers ?? [],
      stun_servers: data.stun_servers ?? [],
      expires_at: data.expires_at ?? null,
      healthcheck_url: data.healthcheck_url ?? null,
    }),
    { status: 200, headers: NO_STORE_HEADERS },
  );
}

export async function GET(req: NextRequest): Promise<Response> {
  const env = envOrNull();
  if (!env) return envMissingResponse();

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return jsonResponse(400, { error: "missing_session_id" });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${env.endpoint}/sessions/${encodeURIComponent(sessionId)}/status`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": env.apiKey,
          Accept: "application/json",
        },
      },
    );
  } catch (err) {
    return jsonResponse(502, {
      error: "upstream_unreachable",
      code: "fetch_failed",
      fallback_url: "/contatti",
      message: err instanceof Error ? err.message : "fetch failed",
    });
  }

  if (!upstream.ok) {
    const txt = await upstream.text().catch(() => "");
    return upstreamFailure(
      upstream.status,
      txt ? txt.slice(0, 500) : "liveavatar_error",
      `liveavatar_${upstream.status}`,
    );
  }

  let data: LiveAvatarStatusResponse;
  try {
    data = (await upstream.json()) as LiveAvatarStatusResponse;
  } catch {
    return upstreamFailure(upstream.status, "invalid_upstream_json", "liveavatar_parse");
  }

  return new Response(
    JSON.stringify({
      session_id: data.session_id ?? sessionId,
      status: data.status ?? "unknown",
      expires_at: data.expires_at ?? null,
    }),
    { status: 200, headers: NO_STORE_HEADERS },
  );
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const env = envOrNull();
  if (!env) return envMissingResponse();

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return jsonResponse(400, { error: "missing_session_id" });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${env.endpoint}/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
        headers: {
          "X-API-KEY": env.apiKey,
          Accept: "application/json",
        },
      },
    );
  } catch (err) {
    return jsonResponse(502, {
      error: "upstream_unreachable",
      code: "fetch_failed",
      fallback_url: "/contatti",
      message: err instanceof Error ? err.message : "fetch failed",
    });
  }

  // Some APIs return 204 No Content on DELETE — accept both.
  if (!upstream.ok && upstream.status !== 204) {
    const txt = await upstream.text().catch(() => "");
    return upstreamFailure(
      upstream.status,
      txt ? txt.slice(0, 500) : "liveavatar_error",
      `liveavatar_${upstream.status}`,
    );
  }

  return new Response(
    JSON.stringify({ session_id: sessionId, deleted: true }),
    { status: 200, headers: NO_STORE_HEADERS },
  );
}
