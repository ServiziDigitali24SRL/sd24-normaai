// /api/stripe/checkout — POST creates a one-time Stripe Checkout Session.
//
// Two modes:
//   - lead_create  (9 €): user requests human lawyer, generates lead in marketplace
//   - lead_buy   (91 €): lawyer purchases a lead → unlocks contact details
//
// Both are mode=payment (one-time), no subscriptions. Webhook handles
// post-payment fulfillment in /api/stripe/webhook.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2025-06-30.basil" as Stripe.LatestApiVersion });
}

interface CheckoutBody {
  mode: "lead_create" | "lead_buy";
  conversation_id?: string;   // required for lead_create
  lead_id?: string;           // required for lead_buy
  // Optional context propagated via Stripe metadata → webhook → leads row
  contact_phone?: string;
  city?: string;
  vertical?: string;          // es. "civile", "lavoro", "famiglia"
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutBody;
    if (!["lead_create", "lead_buy"].includes(body.mode)) {
      return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";

    // Reuse existing customer if present
    const { data: u } = await supabase
      .from("users")
      .select("stripe_customer_id, role")
      .eq("id", user.id)
      .maybeSingle();

    const customerParams: { customer?: string; customer_email?: string } = u?.stripe_customer_id
      ? { customer: u.stripe_customer_id }
      : { customer_email: user.email ?? undefined };

    if (body.mode === "lead_create") {
      if (!body.conversation_id) {
        return NextResponse.json({ error: "missing_conversation_id" }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        ...customerParams,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: 900,
            product_data: {
              name: "NormaAI — Richiesta consulenza con avvocato",
              description: "Generiamo un parere PDF e lo inviamo al marketplace di avvocati qualificati.",
            },
          },
        }],
        metadata: {
          flow: "lead_create",
          user_id: user.id,
          conversation_id: body.conversation_id,
          ...(body.contact_phone ? { contact_phone: body.contact_phone } : {}),
          ...(body.city ? { city: body.city } : {}),
          ...(body.vertical ? { vertical: body.vertical } : {}),
        },
        success_url: `${origin}/lead/created?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=cancelled`,
      });

      return NextResponse.json({ url: session.url });
    }

    if (body.mode === "lead_buy") {
      if (!body.lead_id) {
        return NextResponse.json({ error: "missing_lead_id" }, { status: 400 });
      }

      // Verify caller is a verified lawyer
      if (u?.role !== "lawyer") {
        return NextResponse.json({ error: "not_a_lawyer" }, { status: 403 });
      }

      // Verify lead is still available
      const { data: lead, error: leadErr } = await supabase
        .from("leads")
        .select("id, status, summary, vertical, city")
        .eq("id", body.lead_id)
        .maybeSingle();

      if (leadErr || !lead) {
        return NextResponse.json({ error: "lead_not_found" }, { status: 404 });
      }
      if (lead.status !== "available") {
        return NextResponse.json({ error: "lead_not_available" }, { status: 409 });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        ...customerParams,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: 9100,
            product_data: {
              name: `NormaAI — Acquisto lead (${lead.vertical}, ${lead.city})`,
              description: lead.summary.slice(0, 200),
            },
          },
        }],
        metadata: {
          flow: "lead_buy",
          lawyer_id: user.id,
          lead_id: lead.id,
        },
        success_url: `${origin}/avvocato/lead/${lead.id}?purchased=1`,
        cancel_url: `${origin}/avvocato/dashboard?cancelled=1`,
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "unknown_mode" }, { status: 400 });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "internal_error" },
      { status: 500 },
    );
  }
}
