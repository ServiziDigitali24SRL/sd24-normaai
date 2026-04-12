import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token non valido" }, { status: 401 });
    }

    const userId = user.id;

    // Collect all user data (GDPR art. 20 — portability)
    const [profileResult, queriesResult, leadsResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).single(),
      supabaseAdmin.from("queries").select("id, question, answer, created_at, vertical").eq("user_id", userId),
      supabaseAdmin.from("marketplace_leads").select("id, status, created_at, price").eq("professional_id", userId),
    ]);

    const exportData = {
      export_date: new Date().toISOString(),
      gdpr_article: "Art. 20 GDPR — Diritto alla portabilità dei dati",
      titolare: "Servizi Digitali 24 S.R.L.",
      contact: "privacy@normaai.it",
      profile: profileResult.data ?? null,
      queries: queriesResult.data ?? [],
      leads: leadsResult.data ?? [],
    };

    // Log DSAR request
    await supabaseAdmin.from("dsar_requests").insert({
      user_id: userId,
      request_type: "export",
      requested_at: new Date().toISOString(),
      status: "completed",
      ip_address: req.headers.get("x-forwarded-for") ?? "unknown",
    });

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="normaai-data-export-${userId}-${Date.now()}.json"`,
      },
    });
  } catch (err) {
    console.error("EXPORT account error:", err);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
