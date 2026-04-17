import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { log } from "@/lib/logger";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

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
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

    const { leadId } = await params;

    let body: { email?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Formato richiesta non valido" }, { status: 400 });
    }

    const { email } = body;
    const userId = user.id;

    if (!leadId) {
      return NextResponse.json({ error: "leadId obbligatorio" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch lead con colonne reali del DB
    const { data: lead, error: lErr } = await supabase
      .from("marketplace_leads")
      .select("id, status, price_cents, consumer_city, question_summary, lead_type")
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

    // Crea Stripe Checkout Session
    const stripe = getStripe();
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(
        {
          payment_method_types: ["card"],
          customer_email: email || undefined,
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "eur",
                product_data: {
                  name: `Lead NormaAI — ${lead.question_summary?.substring(0, 60) ?? "Consulenza legale"}`,
                  description: `Accesso completo alla richiesta del cliente. Città: ${lead.consumer_city || "N/D"}`,
                },
                unit_amount: lead.price_cents, // già in centesimi
              },
              quantity: 1,
            },
          ],
          metadata: {
            lead_id: leadId,
            professional_id: userId,
            type: "lead_purchase",
          },
          success_url: `${origin}/dashboard/leads/${leadId}?payment=success`,
          cancel_url: `${origin}/dashboard/leads?payment=cancelled`,
        },
        { timeout: 15000 }
      );
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : "unknown";
      log("error", "stripe_checkout_failed", { error: msg, leadId, userId });
      return NextResponse.json(
        { error: "Servizio pagamenti temporaneamente non disponibile. Riprova." },
        { status: 503 }
      );
    }

    // Aggiorna status → awaiting_payment
    await supabase
      .from("marketplace_leads")
      .update({ status: "awaiting_payment", stripe_payment_id: session.id })
      .eq("id", leadId);

    log("info", "lead_accepted", { leadId, userId, price_cents: lead.price_cents });
    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown";
    log("error", "lead_accept_failed", { error: msg });
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
