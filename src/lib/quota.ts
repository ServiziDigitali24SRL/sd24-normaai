// NormaAI Daily Quota — 10 messages / 24h, reset midnight Europe/Rome.
//
// Two identifier strategies:
//   - Authenticated user → user_id (uuid string)
//   - Anonymous          → sha256(ip + DAILY_QUOTA_SALT)
//
// Uses Postgres function `quota_check_and_increment` (migration 002) for
// atomic INSERT-ON-CONFLICT + UPDATE + return-new-count. Day boundary is
// computed in TZ Europe/Rome (DST-safe) inside the SQL function.
//
// Limit override per env: DAILY_QUOTA_MAX (default 10).

import { createAdminClient } from "@/lib/supabase-admin";
import { createHash } from "crypto";

const DEFAULT_MAX = parseInt(process.env.DAILY_QUOTA_MAX ?? "10", 10);
const SALT = process.env.DAILY_QUOTA_SALT ?? "normaai-default-salt-change-in-prod";

export type QuotaIdentifierType = "user" | "ip_hash";

export interface QuotaCheckResult {
  allowed: boolean;
  newCount: number;
  max: number;
  identifierType: QuotaIdentifierType;
  /** Number of messages still available today (0 if blocked). */
  remaining: number;
}

/**
 * Resolve the identifier for quota tracking.
 * Caller passes the authenticated user_id (or null) and the request's IP.
 * Returns the identifier + type used to key the usage row.
 */
export function resolveIdentifier(
  userId: string | null,
  ip: string | null,
): { identifier: string; type: QuotaIdentifierType } {
  if (userId) return { identifier: userId, type: "user" };
  const ipSafe = ip ?? "unknown";
  const hash = createHash("sha256").update(ipSafe + ":" + SALT).digest("hex");
  return { identifier: hash, type: "ip_hash" };
}

/**
 * Extract client IP from a Next.js request. Tries x-forwarded-for (first hop)
 * then x-real-ip then falls back to "unknown" — Vercel sets the first.
 */
export function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

/**
 * Atomic check + increment. Returns { allowed, newCount, max, remaining }.
 * - allowed=true  → call counted, proceed
 * - allowed=false → over quota, do NOT proceed (caller returns 402/429)
 *
 * On infrastructure error (DB down, function missing), defaults to
 * { allowed: true } — fail-open so a transient DB outage doesn't kill chat.
 * This is logged for observability but does not block the user.
 */
export async function checkAndIncrementQuota(
  userId: string | null,
  ip: string | null,
  max: number = DEFAULT_MAX,
): Promise<QuotaCheckResult> {
  const { identifier, type } = resolveIdentifier(userId, ip);

  try {
    const sb = createAdminClient();
    const { data, error } = await sb.rpc("quota_check_and_increment", {
      p_identifier: identifier,
      p_identifier_type: type,
      p_max_count: max,
    });

    if (error) {
      console.error("[quota] rpc error — failing open:", error.message);
      return { allowed: true, newCount: 0, max, identifierType: type, remaining: max };
    }

    // RPC returns table row(s); supabase-js wraps in array
    const row = Array.isArray(data) ? data[0] : data;
    const newCount = (row?.new_count as number | undefined) ?? 0;
    const allowed = (row?.allowed as boolean | undefined) ?? true;

    return {
      allowed,
      newCount,
      max,
      identifierType: type,
      remaining: Math.max(0, max - newCount),
    };
  } catch (err) {
    console.error("[quota] unexpected error — failing open:", err);
    return { allowed: true, newCount: 0, max, identifierType: type, remaining: max };
  }
}

/**
 * Peek-only: returns current usage without incrementing.
 * Used by the UI to display "X / 10 messaggi oggi".
 */
export async function getCurrentQuota(
  userId: string | null,
  ip: string | null,
  max: number = DEFAULT_MAX,
): Promise<Omit<QuotaCheckResult, "allowed">> {
  const { identifier, type } = resolveIdentifier(userId, ip);
  try {
    const sb = createAdminClient();
    // Compute today's date in Europe/Rome the same way the SQL function does
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date()); // YYYY-MM-DD

    const { data } = await sb
      .from("daily_quota_usage")
      .select("count")
      .eq("identifier", identifier)
      .eq("usage_date", today)
      .maybeSingle();

    const count = data?.count ?? 0;
    return { newCount: count, max, identifierType: type, remaining: Math.max(0, max - count) };
  } catch (err) {
    console.error("[quota] peek error:", err);
    return { newCount: 0, max, identifierType: type, remaining: max };
  }
}
