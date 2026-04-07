import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { log } from "@/lib/logger";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    // Auth check
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

    const { leadId } = await params;

    // FIX: JSON parse con 400 su corpo malformato
    let body: { reason?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Formato richiesta non valido" }, { status: 400 });
    }

    // Tronca reason a 500 caratteri (validazione lunghezza)
    const reason = body.reason ? body.reason.slice(0, 500) : "no_reason";
    const userId = user.id; // server-verified

    if (!leadId) {
      return NextResponse.json({ error: "leadId obbligatorio" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verifica ownership e status pending
    const { data: lead, error: lErr } = await supabase
      .from("marketplace_leads")
      .select("id, status, vertical_id")
      .eq("id", leadId)
      .eq("professional_id", userId)
      .eq("status", "pending")
      .single();

    if (lErr || !lead) {
      return NextResponse.json(
        { error: "Lead non trovato, già processato o non autorizzato" },
        { status: 404 }
      );
    }

    // Aggiorna lead → rejected
    await supabase
      .from("marketplace_leads")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq("id", leadId);

    // Tenta ri-assegnazione a secondo professionista (fire-and-forget)
    const reassignUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reassign-lead`;
    fetch(reassignUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ lead_id: leadId, rejected_professional_id: userId }),
    }).catch((e) => log("warn", "reassign_lead_failed", { error: e.message, leadId }));

    log("info", "lead_rejected", { leadId, userId, reason });
    return NextResponse.json({ rejected: true, lead_id: leadId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown";
    log("error", "lead_reject_failed", { error: msg });
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
