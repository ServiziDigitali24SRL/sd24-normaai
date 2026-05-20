// /api/lawyer/leads — GET list of all available leads in Italy.
// New scope (May 2026): no city/specializzazione filter — every verified lawyer
// sees all available leads. Each lead can be purchased by only ONE lawyer
// (exclusive), enforced by lead.status = 'sold' on first purchase.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const { data: lawyer } = await supabase
    .from("lawyers")
    .select("user_id, verification_status, verified")
    .eq("user_id", user.id)
    .maybeSingle();

  const isVerified = lawyer?.verification_status === "verified" || lawyer?.verified === true;
  if (!isVerified) {
    return NextResponse.json({ error: "not_verified_lawyer" }, { status: 403 });
  }

  // All available leads, ordered by newest first. RLS on leads_marketplace_preview
  // hides contact fields — only preview-safe columns returned.
  const { data: leads } = await supabase
    .from("leads_marketplace_preview")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return NextResponse.json({ leads: leads ?? [], total: leads?.length ?? 0 });
}
