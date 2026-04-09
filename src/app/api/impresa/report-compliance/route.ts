import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Endpoint chiamato dal cron mensile (1° del mese ore 08:00) o manualmente
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Verifica Bearer token per chiamata da cron
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!isCron) {
    // Verifica auth utente normale
    try {
      const { createClient: createServerClient } = await import("@/lib/supabase-server");
      const authClient = await createServerClient();
      const { data: { user } } = await authClient.auth.getUser();
      if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    } catch {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const company_id = body.company_id;
  if (!company_id) return NextResponse.json({ error: "company_id required" }, { status: 400 });

  const supabase = getAdmin();

  // Load company data
  const { data: company } = await supabase
    .from("company_profiles")
    .select("ragione_sociale, settore, n_dipendenti, piano, query_usate_mese, query_incluse")
    .eq("id", company_id)
    .maybeSingle();

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  // Load recent chat queries for this company (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: cpUser } = await supabase.from("company_profiles").select("user_id").eq("id", company_id).single();
  const { data: queries } = await supabase
    .from("audit_risposte")
    .select("query, created_at")
    .eq("user_id", cpUser?.user_id ?? "")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(50);

  // Build AI prompt
  const querySummary = queries && queries.length > 0
    ? queries.slice(0, 10).map((q: { query: string }) => `• ${q.query.slice(0, 100)}`).join("\n")
    : "Nessuna query registrata questo mese";

  const prompt = `Genera un report di compliance mensile sintetico per ${company.ragione_sociale ?? "un'azienda italiana"} (settore: ${company.settore ?? "non specificato"}, ${company.n_dipendenti ?? "N/A"} dipendenti).

Query normative effettuate questo mese (campione):
${querySummary}

Il report deve includere:
1. Riepilogo utilizzo NormaAI (${company.query_usate_mese ?? 0}/${company.query_incluse ?? 0} query utilizzate)
2. Principali aree normative consultate
3. Eventuali rischi normativi rilevati
4. Azioni consigliate per il mese successivo
5. Scadenze normative imminenti da monitorare

Formato: testo strutturato in italiano, max 500 parole. Includi disclaimer che è un report generato da AI.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const reportText = msg.content[0]?.type === "text" ? msg.content[0].text : "Errore nella generazione del report.";
    const month = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 7);

    // Save report
    await supabase.from("company_documents").insert({
      company_id,
      titolo: `Report Compliance ${month}`,
      tipo_documento: "report_compliance",
      contenuto: reportText,
      stato: "generato",
      uploaded_by: null,
    });

    return NextResponse.json({ ok: true, report: reportText, month });
  } catch (e) {
    console.error("report-compliance error:", e);
    return NextResponse.json({ error: "Errore generazione report" }, { status: 500 });
  }
}

// GET: retrieve last report for a company
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company_id = searchParams.get("company_id");
  if (!company_id) return NextResponse.json({ error: "company_id required" }, { status: 400 });

  const { data } = await getAdmin()
    .from("company_documents")
    .select("id, titolo, contenuto, created_at")
    .eq("company_id", company_id)
    .eq("tipo_documento", "report_compliance")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json(data ?? null);
}
