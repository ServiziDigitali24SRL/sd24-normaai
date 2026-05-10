// SER-167 M5/M6 — /api/community/webhook
// Bridge: social platform comment events → n8n workflow `community-event`.
//
// Auth: header X-Community-Webhook-Secret deve combaciare con
// process.env.COMMUNITY_WEBHOOK_SECRET (se env mancante → 503).
//
// Self-pause anti-disastro: prima di forwardare a n8n, conta i record
// `studio.community_responses` con sentiment='neg' nell'ultima ora; se ≥3
// auto-pausa Sofia per 24h e logga incident_detected P2 su agent_events.
//
// Forwarding: POST n8n con Basic Auth (N8N_BASIC_USER/PASS), timeout 10s.
// Ritorna lo status di n8n al client (504/502 mappati).

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { pauseStore } from "@/lib/community/pause-store";
import type { CommunityEvent, BridgeResponse } from "@/lib/community/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const N8N_URL = "https://n8n.normaai.it/webhook/community-event";
const N8N_TIMEOUT_MS = 10_000;
const NEG_WINDOW_THRESHOLD = 3;
const PAUSE_HOURS = 24;

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

type LogLevel = "info" | "warn" | "error";
function log(level: LogLevel, msg: string, ctx: Record<string, unknown> = {}): void {
  // Logging strutturato JSON line su stdout
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope: "community-webhook",
    msg,
    ...ctx,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const VALID_PLATFORMS = new Set(["instagram", "tiktok", "linkedin", "youtube"]);
const VALID_RECEIVED_VIA = new Set(["webhook", "polling", "manual"]);

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function validateBody(body: unknown): { ok: true; event: CommunityEvent } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body must be JSON object" };
  const b = body as Record<string, unknown>;

  if (!isString(b.platform) || !VALID_PLATFORMS.has(b.platform)) {
    return { ok: false, error: "invalid platform" };
  }
  if (!isString(b.comment_id) || b.comment_id.length === 0) {
    return { ok: false, error: "comment_id required" };
  }
  if (!isString(b.comment_text)) {
    return { ok: false, error: "comment_text required" };
  }
  if (!isString(b.user_handle) || b.user_handle.length === 0) {
    return { ok: false, error: "user_handle required" };
  }
  if (b.reel_id !== undefined && !isString(b.reel_id)) {
    return { ok: false, error: "reel_id must be string" };
  }
  if (!isString(b.received_via) || !VALID_RECEIVED_VIA.has(b.received_via)) {
    return { ok: false, error: "invalid received_via" };
  }

  const event: CommunityEvent = {
    platform: b.platform as CommunityEvent["platform"],
    comment_id: b.comment_id,
    comment_text: b.comment_text,
    user_handle: b.user_handle,
    received_via: b.received_via as CommunityEvent["received_via"],
  };
  if (b.reel_id !== undefined) event.reel_id = b.reel_id as string;
  return { ok: true, event };
}

function jsonResponse(payload: BridgeResponse, status: number): NextResponse {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS });
}

async function countRecentNegatives(): Promise<number> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  // schema studio.community_responses con colonne sentiment, replied_at
  const { count, error } = await admin
    .schema("studio")
    .from("community_responses")
    .select("*", { count: "exact", head: true })
    .eq("sentiment", "neg")
    .gte("replied_at", since);

  if (error) {
    log("error", "supabase neg-count query failed", { error: error.message });
    return 0; // fail-open: non bloccare per query DB rotta
  }
  return count ?? 0;
}

async function recordIncident(nNegative: number, pausedUntil: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("agent_events").insert({
      squadron: "ops",
      event_type: "incident_detected",
      severity: "P2",
      message:
        "Sofia community auto-reply paused 24h: 3+ negative sentiment in last 1h",
      payload: { n_negative_1h: nNegative, paused_until: pausedUntil },
    });
    if (error) {
      log("error", "agent_events insert failed", { error: error.message });
    }
  } catch (e) {
    log("error", "agent_events insert threw", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

function basicAuthHeader(): string | null {
  const user = process.env.N8N_BASIC_USER;
  const pass = process.env.N8N_BASIC_PASS;
  if (!user || !pass) return null;
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return `Basic ${token}`;
}

async function forwardToN8n(event: CommunityEvent): Promise<{
  ok: boolean;
  status?: number;
  body?: unknown;
  error?: string;
}> {
  const auth = basicAuthHeader();
  if (!auth) return { ok: false, error: "missing N8N_BASIC_USER/PASS env" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

  const payload = {
    platform: event.platform,
    comment_id: event.comment_id,
    comment_text: event.comment_text,
    user_handle: event.user_handle,
    reel_id: event.reel_id,
  };

  try {
    const res = await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    let body: unknown = null;
    const text = await res.text();
    if (text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    clearTimeout(timer);
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, error: err };
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth: shared secret env-gated ─────────────────────────────────────────
  const expected = process.env.COMMUNITY_WEBHOOK_SECRET;
  if (!expected) {
    log("error", "COMMUNITY_WEBHOOK_SECRET env missing");
    return jsonResponse(
      { status: "forward_failed", skipped: true, error: "service unconfigured" },
      503,
    );
  }

  const provided = req.headers.get("x-community-webhook-secret");
  if (!provided || provided !== expected) {
    log("warn", "auth failed", { provided_present: !!provided });
    return jsonResponse(
      { status: "forward_failed", skipped: true, error: "unauthorized" },
      401,
    );
  }

  // ── Body validation ───────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse(
      { status: "forward_failed", skipped: true, error: "invalid JSON body" },
      400,
    );
  }
  const validated = validateBody(raw);
  if (!validated.ok) {
    return jsonResponse(
      { status: "forward_failed", skipped: true, error: validated.error },
      400,
    );
  }
  const event = validated.event;

  // ── Pause flag globale già attivo ─────────────────────────────────────────
  if (pauseStore.isPaused()) {
    const info = pauseStore.getInfo();
    log("info", "request skipped: paused", {
      comment_id: event.comment_id,
      platform: event.platform,
      expires_at: info?.expires_at,
    });
    return jsonResponse(
      {
        status: "paused",
        skipped: true,
        error: info?.reason,
        n8n_response: info,
      },
      200,
    );
  }

  // ── Self-pause check: ≥3 sentiment='neg' nell'ultima ora ───────────────────
  const nNeg = await countRecentNegatives();
  if (nNeg >= NEG_WINDOW_THRESHOLD) {
    pauseStore.setPause(
      "3+ negative sentiment last 1h",
      PAUSE_HOURS,
      "community-webhook",
    );
    const info = pauseStore.getInfo();
    const expiresAt = info?.expires_at ?? "";
    await recordIncident(nNeg, expiresAt);
    log("warn", "auto-pause triggered", {
      n_negative_1h: nNeg,
      paused_until: expiresAt,
      comment_id: event.comment_id,
    });
    return jsonResponse(
      {
        status: "paused",
        skipped: true,
        error: "3+ negative sentiment last 1h",
        n8n_response: { expires_at: expiresAt, n_negative_1h: nNeg },
      },
      200,
    );
  }

  // ── Forward a n8n ─────────────────────────────────────────────────────────
  const result = await forwardToN8n(event);
  if (!result.ok) {
    log("error", "n8n forward failed", {
      comment_id: event.comment_id,
      n8n_status: result.status,
      error: result.error,
    });
    return jsonResponse(
      {
        status: "forward_failed",
        skipped: false,
        n8n_status: result.status,
        error: result.error ?? "n8n unreachable",
      },
      502,
    );
  }

  log("info", "n8n forward ok", {
    comment_id: event.comment_id,
    platform: event.platform,
    n8n_status: result.status,
  });
  return jsonResponse(
    {
      status: "forwarded",
      skipped: false,
      n8n_status: result.status,
      n8n_response: result.body,
    },
    result.status ?? 200,
  );
}
