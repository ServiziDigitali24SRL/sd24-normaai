export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/mobile/pay-professional
 * Body: { question: string, userId?: string }
 *
 * Creates a Stripe Checkout session for 9€ "Chiedi a un Professionista".
 * On success → lead is stored in Supabase and visible to subscribed lawyers.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = (body.question ?? "").slice(0, 500).trim();
    const userId: string | null = body.userId ?? null;

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "https://normaai.it";

    // Store pending lead in Supabase (status: pending_payment)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert pending lead. Column is `consumer_id` (matches chat/route.ts and
    // leads/otp/verify/route.ts). Previous `consumer_user_id` did not exist on
    // the table → insert failed silently → users paid 9€ but the webhook had
    // no lead_id to finalize.
    const { data: lead, error: leadInsertErr } = await supabase
      .from("marketplace_leads")
      .insert({
        question_summary: question,
        consumer_id: userId,
        lead_type: "privato",
        status: "pending_payment",
        price_cents: 900,
        vertical_id: "normaai",
      })
      .select("id")
      .single();

    if (leadInsertErr || !lead?.id) {
      console.error("[pay-professional] lead insert failed", leadInsertErr);
      return NextResponse.json(
        { error: "Impossibile creare la richiesta. Riprova." },
        { status: 500 }
      );
    }
    const leadId: string = lead.id;

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: 900, // 9€ in centesimi
            product_data: {
              name: "Chiedi a un Professionista",
              description: "La tua richiesta sarà visibile agli avvocati iscritti a NormaAI.",
              images: ["https://normaai.it/og-image.png"],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        lead_id: leadId,
        user_id: userId ?? "",
        source: "mobile_pay_professional",
      },
      success_url: `${origin}/mobile?payment=success&lead=${leadId}`,
      cancel_url: `${origin}/mobile?payment=cancelled`,
      allow_promotion_codes: false,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[pay-professional]", err);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
