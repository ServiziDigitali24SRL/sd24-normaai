// GET /api/leads/preview — PUBBLICA, nessun auth richiesto
// Restituisce lead degli ultimi 7 giorni con dati anonimizzati
// Cache CDN Vercel: 60s stale-while-revalidate (riduce TTFB da 835ms a <50ms su richieste cacheate)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60; // CDN cache 60 secondi

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function anonymizeSummary(summary: string | null): string {
  if (!summary) return "Richiesta di consulenza";
  // Restituisce prime 3 parole + "..."
  const words = summary.trim().split(/\s+/);
  if (words.length <= 3) return summary;
  return words.slice(0, 3).join(" ") + "…";
}

function verticalLabel(verticalId: string | null): string {
  const map: Record<string, string> = {
    avvocato: "Diritto Civile",
    commercialista: "Fisco e Tributi",
    "consulente-del-lavoro": "Diritto del Lavoro",
    "ingegnere-geometra": "Edilizia e Tecnica",
    "consulente-finanziario": "Finanza",
    lavoro: "Diritto del Lavoro",
    fisco: "Fisco e Tributi",
    legale: "Diritto Civile",
    tecnico: "Edilizia e Tecnica",
    finanziario: "Finanza",
    generico: "Consulenza Legale",
  };
  if (!verticalId) return "Consulenza Legale";
  return map[verticalId.toLowerCase()] ?? "Consulenza Legale";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const verticale = searchParams.get("verticale") ?? null;
  const citta = searchParams.get("citta") ?? null;
  const prezzoMax = searchParams.get("prezzo_max") ? parseInt(searchParams.get("prezzo_max")!, 10) : null;

  const supabase = getSupabase();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("marketplace_leads")
    .select("id, vertical_id, consumer_city, lead_tier, price_cents, created_at, question_summary")
    .eq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (verticale) query = query.ilike("vertical_id", `%${verticale}%`);
  if (citta) query = query.ilike("consumer_city", `%${citta}%`);
  if (prezzoMax !== null) query = query.lte("price_cents", prezzoMax * 100);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ leads: [], count: 0 }, { status: 200 });
  }

  const leads = (data ?? []).map((l) => ({
    id: l.id,
    vertical: verticalLabel(l.vertical_id),
    vertical_id: l.vertical_id ?? "generico",
    city: l.consumer_city ?? null,
    tier: (l.lead_tier as string) ?? "cold",
    price_cents: l.price_cents ?? 4900,
    created_at: l.created_at,
    summary_preview: anonymizeSummary(l.question_summary),
  }));

  const res = NextResponse.json({ leads, count: leads.length });
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res;
}
