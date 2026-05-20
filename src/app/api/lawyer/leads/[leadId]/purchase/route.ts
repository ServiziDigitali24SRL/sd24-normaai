// /api/lawyer/leads/[leadId]/purchase — POST: lawyer acquista il lead pagando
// con il proprio wallet. Atomic via wallet_debit_lead() function (locks the
// wallet row, debits, audits, all-or-nothing). After successful debit:
//   - insert lead_purchases row
//   - trigger SQL aggiorna leads.status = 'sold' automaticamente
//   - return contatti pieni (cognome + telefono + email) + storico chat
//
// Pricing: 91 € = 9100 cents (env LEAD_PRICE_CENTS può override).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const LEAD_PRICE_CENTS = parseInt(process.env.LEAD_PRICE_CENTS ?? "9100", 10);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  // Verify lawyer + verified
  const { data: lawyer } = await supabase
    .from("lawyers")
    .select("verification_status, verified")
    .eq("user_id", user.id)
    .maybeSingle();
  const isVerified = lawyer?.verification_status === "verified" || lawyer?.verified === true;
  if (!isVerified) {
    return NextResponse.json({ error: "not_verified_lawyer" }, { status: 403 });
  }

  // Already purchased? Return existing (idempotent UX).
  const { data: existingPurchase } = await supabase
    .from("lead_purchases")
    .select("id, contacts_revealed_at")
    .eq("lead_id", leadId)
    .eq("lawyer_id", user.id)
    .maybeSingle();

  if (existingPurchase) {
    return await fetchPurchasedLead(supabase, leadId, existingPurchase.id);
  }

  // Pre-check lead availability + price
  const { data: lead } = await supabase
    .from("leads")
    .select("id, status")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (lead.status !== "available") {
    return NextResponse.json({ error: "lead_unavailable", status: lead.status }, { status: 409 });
  }

  // Atomic debit via SQL function. Uses admin client (RLS bypass + RPC SECURITY DEFINER).
  const admin = createAdminClient();
  const { data: newBalance, error: debitErr } = await admin.rpc("wallet_debit_lead", {
    p_user_id: user.id,
    p_amount_cents: LEAD_PRICE_CENTS,
    p_lead_id: leadId,
    p_metadata: { source: "lead_purchase" },
  });

  if (debitErr) {
    // Postgres signals insufficient_funds via custom RAISE
    const msg = String(debitErr.message ?? "");
    if (msg.includes("insufficient_funds")) {
      return NextResponse.json(
        { error: "insufficient_funds", message: "Saldo wallet insufficiente. Ricarica almeno 250 €.", required_cents: LEAD_PRICE_CENTS },
        { status: 402 },
      );
    }
    if (msg.includes("wallet not initialized")) {
      return NextResponse.json(
        { error: "wallet_empty", message: "Wallet non ancora inizializzato. Ricarica almeno 250 €.", required_cents: LEAD_PRICE_CENTS },
        { status: 402 },
      );
    }
    console.error("[wallet_debit_lead] unexpected", debitErr);
    return NextResponse.json({ error: "debit_failed", detail: msg }, { status: 500 });
  }

  // Create purchase row (uses authenticated client — RLS allows owner write)
  const { data: purchase, error: purErr } = await admin
    .from("lead_purchases")
    .insert({
      lead_id: leadId,
      lawyer_id: user.id,
      paid_91eur_at: new Date().toISOString(),
      stripe_session_id: `wallet_${Date.now()}_${user.id.slice(0, 8)}`, // dummy non-null for UNIQUE constraint
    })
    .select()
    .single();

  if (purErr) {
    // Inconsistency: debited wallet but failed purchase row. Refund via admin transaction.
    console.error("[purchase] insert failed after debit — REFUND NEEDED", purErr);
    await admin.from("wallet_transactions").insert({
      user_id: user.id,
      kind: "refund",
      amount_cents: LEAD_PRICE_CENTS,
      balance_after_cents: (newBalance ?? 0) + LEAD_PRICE_CENTS,
      lead_id: leadId,
      metadata: { reason: "purchase_insert_failed", error: purErr.message },
    });
    await admin.from("lawyer_wallet")
      .update({ balance_cents: (newBalance ?? 0) + LEAD_PRICE_CENTS })
      .eq("user_id", user.id);
    return NextResponse.json({ error: "purchase_failed", refunded: true }, { status: 500 });
  }

  // Mark lead as sold + return contacts + chat history
  await admin.from("leads").update({ status: "sold" }).eq("id", leadId);

  return await fetchPurchasedLead(admin, leadId, purchase.id, newBalance ?? 0);
}

async function fetchPurchasedLead(
  sb: ReturnType<typeof createAdminClient>,
  leadId: string,
  purchaseId: string,
  newBalanceCents?: number,
) {
  const { data: lead } = await sb
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: "not_found_post_purchase" }, { status: 500 });

  // Fetch full chat history of the conversation that generated the lead
  const { data: messages } = await sb
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", lead.conversation_id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    purchase_id: purchaseId,
    lead: {
      id: lead.id,
      vertical: lead.vertical,
      city: lead.city,
      summary: lead.summary,
      score: lead.score,
      pdf_url: lead.pdf_url,
      contact_name: lead.contact_name,
      contact_email: lead.contact_email,
      contact_phone: lead.contact_phone,
      created_at: lead.created_at,
    },
    chat_history: messages ?? [],
    wallet_balance_cents: newBalanceCents,
  });
}
