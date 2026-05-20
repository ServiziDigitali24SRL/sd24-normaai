// /api/stripe/webhook — handles checkout.session.completed for the 2 flows:
//   - flow=lead_create  → user paid 9 €, create row in `leads` + notify lawyers
//   - flow=lead_buy     → lawyer paid 91 €, create row in `lead_purchases`
//                         (trigger marks lead.status = 'sold' automatically)
//
// Idempotency: best-effort via `stripe_processed_events` table (ignored if
// table not present — safe to skip in dev).

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendLeadNotificationEmail, sendLeadPurchaseConfirmEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verify failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Idempotency (best-effort)
  try {
    const { error } = await supabase
      .from("stripe_processed_events")
      .insert({ event_id: event.id, event_type: event.type });
    if (error?.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch { /* table may not exist */ }

  try {
    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true, ignored: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    // ── FLOW: lead_create (user paid 9 €) ─────────────────────────────────
    if (meta.flow === "lead_create" && meta.user_id && meta.conversation_id) {
      // Fetch conversation summary
      const { data: conv } = await supabase
        .from("conversations")
        .select("summary_text, parere_pdf_url")
        .eq("id", meta.conversation_id)
        .maybeSingle();

      const { data: u } = await supabase
        .from("users")
        .select("email, display_name")
        .eq("id", meta.user_id)
        .maybeSingle();

      // Compute simple score (placeholder — Lead Quality Agent will do better)
      const score = 60;

      // Create lead row
      const { data: lead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          user_id: meta.user_id,
          conversation_id: meta.conversation_id,
          pdf_url: conv?.parere_pdf_url ?? "",
          score,
          vertical: meta.vertical ?? "civile",
          city: meta.city ?? "ND",
          summary: (conv?.summary_text ?? "").slice(0, 500) || "Richiesta consulenza legale",
          contact_name: u?.display_name ?? "",
          contact_email: u?.email ?? "",
          contact_phone: meta.contact_phone ?? "",
          paid_9eur_at: new Date().toISOString(),
          stripe_session_id: session.id,
          status: "available",
        })
        .select()
        .single();

      if (leadErr) {
        console.error("[stripe/webhook] lead insert failed", leadErr);
        return NextResponse.json({ error: "lead_insert_failed" }, { status: 500 });
      }

      // Trigger PDF generation (server-side, async — fire-and-forget)
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";
      fetch(`${origin}/api/leads/${lead.id}/pdf`, {
        method: "POST",
        headers: { "x-internal-secret": process.env.INTERNAL_SECRET ?? "" },
      }).catch(() => { /* fire-and-forget */ });

      // Notify matching lawyers (filter by vertical + city)
      const { data: lawyers } = await supabase
        .from("lawyers")
        .select("user_id, city, specializzazioni")
        .eq("verified", true)
        .eq("notifications_paused", false);

      const matched = (lawyers ?? []).filter(l =>
        l.city === lead.city &&
        Array.isArray(l.specializzazioni) &&
        l.specializzazioni.some((s: string) =>
          s.toLowerCase().includes((lead.vertical ?? "").toLowerCase())
        )
      );

      for (const law of matched) {
        const { data: lawyerUser } = await supabase
          .from("users")
          .select("email, display_name")
          .eq("id", law.user_id)
          .maybeSingle();
        if (!lawyerUser?.email) continue;

        await sendLeadNotificationEmail(
          lawyerUser.email,
          lawyerUser.display_name ?? "Avvocato",
          `${lead.summary} (${lead.vertical}, ${lead.city})`,
          lead.id,
          9100,
        );
        await supabase.from("lawyer_notifications").insert({
          lawyer_id: law.user_id,
          lead_id: lead.id,
          channel: "email",
        });
      }

      return NextResponse.json({ received: true, lead_id: lead.id, notified: matched.length });
    }

    // ── FLOW: wallet_topup (lawyer ricarica wallet, 250€+ multipli di 250) ──
    if (meta.flow === "wallet_topup" && meta.user_id && session.amount_total) {
      const amountCents = session.amount_total; // Stripe già in cents
      const { data: newBalance, error: topupErr } = await supabase.rpc("wallet_topup", {
        p_user_id: meta.user_id,
        p_amount_cents: amountCents,
        p_stripe_session: session.id,
        p_metadata: { source: "stripe_checkout", session_id: session.id },
      });

      if (topupErr) {
        console.error("[stripe/webhook] wallet_topup failed", topupErr);
        return NextResponse.json({ error: "wallet_topup_failed" }, { status: 500 });
      }

      return NextResponse.json({
        received: true,
        flow: "wallet_topup",
        user_id: meta.user_id,
        amount_cents: amountCents,
        new_balance_cents: newBalance,
      });
    }

    // ── FLOW: lead_buy (lawyer paid 91 €) ─────────────────────────────────
    if (meta.flow === "lead_buy" && meta.lawyer_id && meta.lead_id) {
      const { data: purchase, error: purErr } = await supabase
        .from("lead_purchases")
        .insert({
          lead_id: meta.lead_id,
          lawyer_id: meta.lawyer_id,
          paid_91eur_at: new Date().toISOString(),
          stripe_session_id: session.id,
        })
        .select()
        .single();

      if (purErr) {
        console.error("[stripe/webhook] purchase insert failed", purErr);
        return NextResponse.json({ error: "purchase_insert_failed" }, { status: 500 });
      }

      // Confirmation email to lawyer
      const { data: lawyerUser } = await supabase
        .from("users")
        .select("email, display_name")
        .eq("id", meta.lawyer_id)
        .maybeSingle();
      const { data: lead } = await supabase
        .from("leads")
        .select("summary, contact_name")
        .eq("id", meta.lead_id)
        .maybeSingle();

      if (lawyerUser?.email && lead) {
        await sendLeadPurchaseConfirmEmail(
          lawyerUser.email,
          lawyerUser.display_name ?? "Avvocato",
          lead.summary ?? "",
          9100,
        );
      }

      return NextResponse.json({ received: true, purchase_id: purchase.id });
    }

    return NextResponse.json({ received: true, unhandled: meta.flow ?? "no_flow" });
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }
}
