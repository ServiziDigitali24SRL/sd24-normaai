import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase-server";

// Lazy init — avoids build-time error when env var is missing
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2025-06-30.basil" as Stripe.LatestApiVersion });
}

// Mappa piano → Stripe Price ID reali (da env vars)
const PRICE_MAP: Record<string, string | undefined> = {
  professionista:          process.env.STRIPE_PRICE_PROFESSIONISTA,
  professionista_annual:   process.env.STRIPE_PRICE_PROFESSIONISTA_ANNUAL,
  impresa:                 process.env.STRIPE_PRICE_IMPRESA,
  impresa_annual:          process.env.STRIPE_PRICE_IMPRESA_ANNUAL,
  impresa_micro:           process.env.STRIPE_PRICE_IMPRESA_MICRO,
  impresa_piccola:         process.env.STRIPE_PRICE_IMPRESA_PICCOLA,
  impresa_media:           process.env.STRIPE_PRICE_IMPRESA_MEDIA,
  impresa_grande:          process.env.STRIPE_PRICE_IMPRESA_GRANDE,
  piccola_impresa:         process.env.STRIPE_PRICE_PICCOLA_IMPRESA,
  piccola_impresa_annual:  process.env.STRIPE_PRICE_PICCOLA_IMPRESA_ANNUAL,
  cittadino_pro:           process.env.STRIPE_PRICE_CITTADINO_PRO,
  api_developer:           process.env.STRIPE_PRICE_API_DEVELOPER,
  api_pro:                 process.env.STRIPE_PRICE_API_PRO,
  lead_privato:            process.env.STRIPE_PRICE_LEAD_PRIVATO,
  lead_impresa:            process.env.STRIPE_PRICE_LEAD_IMPRESA,
};

// Piani impresa con trial 7gg
const IMPRESA_TRIAL_PLANS = new Set(["impresa_micro", "impresa_piccola", "impresa_media", "impresa_grande"]);

// Piani lead sono one-time payment, non subscription
const ONE_TIME_PLANS = new Set(["lead_privato", "lead_impresa"]);

export async function POST(req: NextRequest) {
  try {
    const { plan, returnPath } = await req.json();

    // B-11 fix: ignora userId/email dal body; prendi SEMPRE dall'utente autenticato
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });
    }
    const userId = user.id;
    const email = user.email ?? "";

    const stripePriceId = PRICE_MAP[plan];
    if (!plan || !stripePriceId) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Valid: ${Object.keys(PRICE_MAP).join(", ")}` },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";
    const isOneTime = ONE_TIME_PLANS.has(plan);

    // Riusa stripe_customer_id esistente se presente (H-18 fix)
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    const existingCustomerId = profile?.stripe_customer_id as string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata: { userId, plan },
      // Se viene passato returnPath (es. /mobile/archivio), Stripe redirige lì.
      // Whitelist: solo path interni che iniziano con /, no protocolli esterni.
      success_url: `${origin}${
        typeof returnPath === "string" && returnPath.startsWith("/") && !returnPath.startsWith("//")
          ? `${returnPath}${returnPath.includes("?") ? "&" : "?"}payment=success`
          : "/?checkout=success"
      }`,
      cancel_url: `${origin}${
        typeof returnPath === "string" && returnPath.startsWith("/") && !returnPath.startsWith("//")
          ? `${returnPath}${returnPath.includes("?") ? "&" : "?"}payment=cancelled`
          : "/?checkout=cancel"
      }`,
    };
    if (existingCustomerId) {
      sessionParams.customer = existingCustomerId;
    } else {
      sessionParams.customer_email = email || undefined;
    }

    if (isOneTime) {
      sessionParams.mode = "payment";
    } else {
      sessionParams.mode = "subscription";
      if (IMPRESA_TRIAL_PLANS.has(plan)) {
        sessionParams.subscription_data = {
          trial_period_days: 7,
          metadata: { userId: userId || "", plan },
        };
      } else if (plan !== "cittadino_pro") {
        sessionParams.subscription_data = {
          trial_period_days: 14,
          metadata: { userId: userId || "", plan },
        };
      } else {
        sessionParams.subscription_data = { metadata: { userId: userId || "", plan } };
      }
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
