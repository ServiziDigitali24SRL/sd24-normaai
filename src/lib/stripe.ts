import Stripe from "stripe";

// Lazy singleton — avoids module-level instantiation crash when
// STRIPE_SECRET_KEY is not available at build time (e.g. preview deployments).
let _stripe: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string | symbol) {
    if (!_stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
      _stripe = new Stripe(key);
    }
    return (_stripe as any)[prop as string];
  },
});
