import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/leads?tab=new|history&page=1&limit=20&verticale=avvocato&citta=Roma&prezzo_max=99
 *
 * Restituisce i lead marketplace per il professionista autenticato.
 * - tab=new     → status IN (pending, awaiting_payment) [default]
 * - tab=history → status IN (completed, rejected, expired)
 * - verticale   → filtro opzionale (ILIKE match)
 * - citta       → filtro opzionale (ILIKE match)
 * - prezzo_max  → filtro opzionale (≤ valore)
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check: userId sempre da sessione, mai dal client
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = user.id;
    const tab = searchParams.get("tab") ?? "new";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    // FIX MEDIO-01: filtri opzionali
    const verticale = searchParams.get("verticale") ?? null;
    const citta = searchParams.get("citta") ?? null;
    const prezzoMax = searchParams.get("prezzo_max") ? parseFloat(searchParams.get("prezzo_max")!) : null;

    const supabase = getSupabase();

    const activeStatuses = ["pending", "awaiting_payment"];
    const historyStatuses = ["completed", "rejected", "expired"];
    const statuses = tab === "history" ? historyStatuses : activeStatuses;

    // Leggi profilo professionista per matching intelligente
    const { data: profProfile } = await supabase
      .from("professional_profiles")
      .select("vertical, city, specializations")
      .eq("user_id", userId)
      .maybeSingle();

    // Query leads con paginazione e filtri opzionali
    let query = supabase
      .from("marketplace_leads")
      .select(`
        id,
        status,
        price_cents,
        consumer_city,
        vertical_id,
        question_summary,
        lead_type,
        lead_score,
        lead_tier,
        created_at,
        paid_at,
        stripe_payment_id
      `, { count: "exact" })
      .eq("professional_id", userId)
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (verticale) query = query.ilike("vertical_id", `%${verticale}%`);
    if (citta) query = query.ilike("consumer_city", `%${citta}%`);
    if (prezzoMax !== null) query = query.lte("price_cents", prezzoMax * 100);

    const { data: leadsRaw, error: leadsErr, count } = await query;

    if (leadsErr) {
      log("error", "leads_query_failed", { error: leadsErr.message, userId });
      return NextResponse.json({ error: "Errore caricamento lead" }, { status: 500 });
    }

    // STEP 4 — matching intelligente: riordina per score professionista
    const now_ts = Date.now();
    const leads = (leadsRaw ?? []).slice().sort((a, b) => {
      function matchScore(l: typeof a) {
        const daysSince = (now_ts - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return (
          (profProfile?.vertical && l.vertical_id?.toLowerCase().includes(profProfile.vertical.toLowerCase()) ? 300 : 0) +
          (profProfile?.city && l.consumer_city?.toLowerCase().includes(profProfile.city.toLowerCase()) ? 200 : 0) +
          (l.lead_tier === "hot" ? 100 : l.lead_tier === "warm" ? 50 : 10) +
          (daysSince < 1 ? 50 : daysSince < 3 ? 30 : 0)
        );
      }
      return matchScore(b) - matchScore(a);
    });

    // FIX ALTO-01: stats via aggregazione SQL (no fetch-tutti + reduce JS)
    const { data: statsRaw, error: statsErr } = await supabase
      .rpc("get_professional_stats", { p_user_id: userId });

    const stats = statsErr || !statsRaw
      ? { pending: 0, completed: 0, total_earnings: 0 }
      : {
          pending: statsRaw.pending_count ?? 0,
          completed: statsRaw.completed_count ?? 0,
          total_earnings: statsRaw.total_spent ?? 0,
        };

    // Scade i lead scaduti on-the-fly (fire-and-forget)
    // marketplace_leads non ha expires_at — skip expire logic
    const expiredIds: string[] = [];

    if (expiredIds.length > 0) {
      supabase
        .from("marketplace_leads")
        .update({ status: "expired" })
        .in("id", expiredIds)
        .then(() => {}, (e) => log("warn", "lead_expire_failed", { error: e.message }));

      const leadsFixed = (leads ?? []).map((l) =>
        expiredIds.includes(l.id) ? { ...l, status: "expired" } : l
      );

      return NextResponse.json({ leads: leadsFixed, stats, total: count ?? 0, page, limit });
    }

    return NextResponse.json({ leads: leads ?? [], stats, total: count ?? 0, page, limit });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown";
    log("error", "leads_get_failed", { error: msg });
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
