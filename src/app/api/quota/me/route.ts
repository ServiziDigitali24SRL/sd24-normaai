// /api/quota/me — GET current daily quota usage for the caller.
// Returns { used, max, remaining, anonymous, resets_at_tz }. Public route
// (no auth required) — for anon callers, identifies via ip_hash.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentQuota, getClientIp } from "@/lib/quota";
import { createClient as createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let userId: string | null = null;
  try {
    const sb = await createSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // anon — fall through
  }
  const ip = getClientIp(req);
  const q = await getCurrentQuota(userId, ip);

  return NextResponse.json({
    used: q.newCount,
    max: q.max,
    remaining: q.remaining,
    anonymous: q.identifierType === "ip_hash",
    resets_at_tz: "Europe/Rome",
  });
}
