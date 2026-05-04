// /api/lawyer/leads/[leadId] — GET a single lead.
//   - Without purchase: returns preview (no contact fields)
//   - With purchase by this lawyer: returns full lead including contacts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { data: purchase } = await supabase
    .from("lead_purchases")
    .select("id, contacts_revealed_at")
    .eq("lead_id", leadId)
    .eq("lawyer_id", user.id)
    .maybeSingle();

  if (purchase) {
    // Full access — RLS already permits owner-purchase reads via separate policy
    const { data: full } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();
    return NextResponse.json({ lead: full, purchased: true });
  }

  // Preview only
  const { data: preview } = await supabase
    .from("leads_marketplace_preview")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (!preview) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ lead: preview, purchased: false });
}
