import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/mobile/buy-lead
 * Body: { leadId: string }
 *
 * Creates a Stripe Checkout session for a professional (avvocato/professionista)
 * to purchase a lead from the marketplace. 9€ per lead.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const leadId: string = (body.leadId ?? "").trim();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://normaai.it";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the lead exists and is available
    const { data: lead, error: leadError } = await supabase
      .from("marketplace_leads")
      .select("id, question_summary, status, price_cents")
      .eq("id", leadId)
      .eq("status", "available")
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead non trovato o non disponibile" }, { status: 404 });
    }

    const priceInCents = lead.price_cents ?? 900;

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: priceInCents,
            product_data: {
              name: "Lead NormaAI — Acquisto contatto cliente",
              description: `Richiesta: ${(lead.question_summary ?? "").slice(0, 120)}`,
              images: ["https://normaai.it/og-image.png"],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        lead_id: leadId,
        source: "mobile_buy_lead",
      },
      success_url: `${origin}/mobile/leads?payment=success&lead=${leadId}`,
      cancel_url: `${origin}/mobile/leads?payment=cancelled`,
      allow_promotion_codes: false,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[buy-lead]", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
