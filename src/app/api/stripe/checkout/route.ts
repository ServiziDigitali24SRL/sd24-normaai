import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Lazy init — avoids build-time error when env var is missing
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

// Mappa piano → Stripe Price ID reali (da env vars)
const PRICE_MAP: Record<string, string | undefined> = {
  professionista:          process.env.STRIPE_PRICE_PROFESSIONISTA,
  professionista_annual:   process.env.STRIPE_PRICE_PROFESSIONISTA_ANNUAL,
  impresa:                 process.env.STRIPE_PRICE_IMPRESA,
  impresa_annual:          process.env.STRIPE_PRICE_IMPRESA_ANNUAL,
  api_developer:           process.env.STRIPE_PRICE_API_DEVELOPER,
  api_pro:                 process.env.STRIPE_PRICE_API_PRO,
  lead_privato:            process.env.STRIPE_PRICE_LEAD_PRIVATO,
  lead_impresa:            process.env.STRIPE_PRICE_LEAD_IMPRESA,
};

// Piani lead sono one-time payment, non subscription
const ONE_TIME_PLANS = new Set(["lead_privato", "lead_impresa"]);

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, email } = await req.json();

    const stripePriceId = PRICE_MAP[plan];
    if (!plan || !stripePriceId) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Valid: ${Object.keys(PRICE_MAP).join(", ")}` },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://normaai.eu";
    const isOneTime = ONE_TIME_PLANS.has(plan);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionParams: any = {
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata: { userId: userId || "", plan },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    };

    if (isOneTime) {
      sessionParams.mode = "payment";
    } else {
      sessionParams.mode = "subscription";
      sessionParams.subscription_data = {
        trial_period_days: 14,
        metadata: { userId: userId || "", plan },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
