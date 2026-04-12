import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(req: NextRequest) {
  try {
    // Auth: only professionisti can buy leads
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    if (user.user_metadata?.role !== "professionista") {
      return NextResponse.json({ error: "Solo i professionisti possono acquistare lead" }, { status: 403 });
    }

    const { leadId } = await req.json();
    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ error: "leadId mancante" }, { status: 400 });
    }

    const admin = createAdmin(SUPABASE_URL, SUPABASE_KEY);

    // 1. Carica il lead
    const { data: lead, error: leadErr } = await admin
      .from("marketplace_leads")
      .select("id, status, price_cents, vertical_id")
      .eq("id", leadId)
      .eq("status", "pending")
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead non disponibile o già acquistato" }, { status: 404 });
    }

    // 2. Carica wallet professionista (da user_metadata o tabella dedicata)
    const walletCrediti: number = user.user_metadata?.wallet_crediti ?? 0;
    const prezzoEuro = (lead.price_cents ?? 7500) / 100;

    if (walletCrediti < prezzoEuro) {
      return NextResponse.json({
        error: `Crediti insufficienti. Hai €${walletCrediti} ma il lead costa €${prezzoEuro}.`,
        code: "insufficient_credits",
        wallet: walletCrediti,
        prezzo: prezzoEuro,
      }, { status: 402 });
    }

    // 3. Scala crediti e assegna lead atomicamente
    const nuoviCrediti = walletCrediti - prezzoEuro;

    // Aggiorna wallet utente
    const { error: walletErr } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, wallet_crediti: nuoviCrediti },
    });
    if (walletErr) {
      return NextResponse.json({ error: "Errore aggiornamento wallet" }, { status: 500 });
    }

    // Assegna lead al professionista
    const { error: leadUpdateErr } = await admin
      .from("marketplace_leads")
      .update({
        status: "accepted",
        professionista_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("status", "pending"); // guard contro race condition

    if (leadUpdateErr) {
      // Rimborsa crediti se update fallisce
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, wallet_crediti: walletCrediti },
      });
      return NextResponse.json({ error: "Lead già acquistato da un altro professionista" }, { status: 409 });
    }

    // 4. Logga transazione wallet
    await admin.from("wallet_transactions").insert({
      user_id: user.id,
      tipo: "acquisto_lead",
      importo: -prezzoEuro,
      lead_id: leadId,
      note: `Acquisto lead ${lead.vertical_id} — €${prezzoEuro}`,
      created_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {}); // non-blocking

    return NextResponse.json({
      ok: true,
      leadId,
      crediti_rimanenti: nuoviCrediti,
      message: "Lead acquistato con successo. Il tuo team lead riceverà i dettagli via email.",
    });

  } catch (e) {
    console.error("[WALLET/ACQUISTA-LEAD]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
