import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Lazy init — avoids build-time error when env var is missing
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key);
}

const PRICE_MAP: Record<string, string> = {
  price_cittadino: "price_cittadino",
  price_impresa: "price_impresa",
  price_professionista: "price_professionista",
  price_developer: "price_developer",
  price_developer_pro: "price_developer_pro",
};

export async function POST(req: NextRequest) {
  try {
    const { priceId, userId, email } = await req.json();

    if (!priceId || !PRICE_MAP[priceId]) {
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") || "https://normaai.it";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [{ price: PRICE_MAP[priceId], quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: userId || "", plan: priceId },
      },
      metadata: { userId: userId || "", plan: priceId },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
