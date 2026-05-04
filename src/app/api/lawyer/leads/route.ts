// /api/lawyer/leads — GET list of available leads matching the lawyer's
// specializzazioni and city. Excludes leads the lawyer has already purchased.

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
    .select("user_id, city, specializzazioni, verified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!lawyer || !lawyer.verified) {
    return NextResponse.json({ error: "not_verified_lawyer" }, { status: 403 });
  }

  // List available leads. RLS allows verified lawyers to read available leads
  // (without contact fields — the marketplace_preview view exposes only safe cols).
  const { data: leads } = await supabase
    .from("leads_marketplace_preview")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  // Filter client-side by city + specializzazioni overlap (pgvector-style hybrid
  // could do this server-side later)
  const lawyerCity = (lawyer.city ?? "").toLowerCase();
  const lawyerSpecs: string[] = (lawyer.specializzazioni ?? []).map((s: string) => s.toLowerCase());

  type LeadPreview = {
    id: string; vertical: string; city: string; summary: string;
    score: number; pdf_url: string; created_at: string; expires_at: string;
  };

  const filtered = (leads as LeadPreview[] | null ?? []).filter(l => {
    const matchCity = (l.city ?? "").toLowerCase() === lawyerCity;
    const matchSpec = lawyerSpecs.some(s => (l.vertical ?? "").toLowerCase().includes(s) ||
                                              s.includes((l.vertical ?? "").toLowerCase()));
    return matchCity || matchSpec;   // any match
  });

  // Exclude already-purchased leads
  const { data: bought } = await supabase
    .from("lead_purchases")
    .select("lead_id")
    .eq("lawyer_id", user.id);
  const boughtIds = new Set((bought ?? []).map(p => p.lead_id));

  const available = filtered.filter(l => !boughtIds.has(l.id));

  return NextResponse.json({ leads: available, total: available.length });
}
