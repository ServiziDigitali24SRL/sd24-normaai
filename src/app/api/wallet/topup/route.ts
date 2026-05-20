// /api/wallet/topup — POST { amount_eur: number } → Stripe Checkout Session url
// Validations:
//   - caller is authenticated
//   - caller is a verified lawyer
//   - amount_eur is integer, >= 250, multiple of 250
// Webhook /api/stripe/webhook with meta.flow='wallet_topup' credits the wallet.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

interface Body {
  amount_eur?: number;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const amount = body.amount_eur;
  if (!amount || !Number.isInteger(amount) || amount < 250 || amount % 250 !== 0) {
    return NextResponse.json(
      { error: "invalid_amount", message: "Amount deve essere intero >= 250 e multiplo di 250 (250, 500, 750, 1000...)" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  // Verify caller is a verified lawyer (basic check from lawyers row)
  const { data: lawyer } = await supabase
    .from("lawyers")
    .select("verification_status, verified")
    .eq("user_id", user.id)
    .maybeSingle();

  const isBasicVerified = lawyer?.verification_status === "verified" || lawyer?.verified === true;
  if (!isBasicVerified) {
    return NextResponse.json(
      { error: "not_verified", message: "Devi essere un avvocato verificato per ricaricare il wallet." },
      { status: 403 },
    );
  }

  // Strict gate: wallet top-up requires verification by a REAL provider, not
  // the dev stub. Policy (user request 2026-05-20): onboarding trusts the
  // self-declared lawyer (stub_dev) so they can browse the marketplace, but
  // before spending real money on lead purchases we need an authoritative
  // verification via InfoCamere / Visure.it / Cassa Forense.
  //
  // TODO(NA-WALLET-VERIFY): integrate Visure.it API. Until then, this gate
  // accepts manual_admin as an escape hatch — admin can run the verification
  // and insert a row in lawyer_verifications with provider='manual_admin'.
  const REAL_PROVIDERS = ["infocamere", "cnf", "cassa_forense", "manual_admin"];
  const { data: realVerif } = await supabase
    .from("lawyer_verifications")
    .select("id, provider, verified_at")
    .eq("user_id", user.id)
    .eq("status", "verified")
    .in("provider", REAL_PROVIDERS)
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Dev-only override: explicitly disable strict check via env var. NEVER set
  // ALLOW_STUB_WALLET=1 in production — it allows topup with only the stub
  // verification, defeating fraud controls.
  const allowStubTopup = process.env.ALLOW_STUB_WALLET === "1";

  if (!realVerif && !allowStubTopup) {
    return NextResponse.json(
      {
        error: "real_verification_required",
        message: "Per ricaricare il wallet ti serve una verifica completa dell'iscrizione all'albo. Ti ricontatteremo via email entro 24h con i passi successivi.",
        next_step: "manual_admin_review",
      },
      { status: 403 },
    );
  }

  // Stripe customer reuse
  const { data: u } = await supabase
    .from("users")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .maybeSingle();

  const customerParams: { customer?: string; customer_email?: string } = u?.stripe_customer_id
    ? { customer: u.stripe_customer_id }
    : { customer_email: u?.email ?? user.email ?? undefined };

  const stripe = getStripe();
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    ...customerParams,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: amount * 100,
        product_data: {
          name: `NormaAI — Ricarica wallet ${amount} €`,
          description: `Crediti per acquisto lead nel marketplace. ${Math.floor(amount / 91)} lead acquistabili (91€ ciascuno).`,
        },
      },
    }],
    metadata: {
      flow: "wallet_topup",
      user_id: user.id,
    },
    success_url: `${origin}/avvocato/dashboard?topup=ok&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/avvocato/dashboard?topup=cancelled`,
  });

  return NextResponse.json({ url: session.url, session_id: session.id });
}
