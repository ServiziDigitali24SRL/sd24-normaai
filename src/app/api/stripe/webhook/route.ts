import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  sendWelcomeEmail,
  sendSubscriptionConfirmEmail,
  sendLeadPurchaseConfirmEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ error: "Missing webhook secret or signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};

        // Lead purchase: professionista compra lead dal marketplace
        if (meta.type === "lead_purchase" && meta.lead_id && meta.professional_id) {
          // Fetch lead info per email
          const { data: lead } = await supabase
            .from("marketplace_leads")
            .select("question_summary, price_cents")
            .eq("id", meta.lead_id)
            .single();

          await supabase
            .from("marketplace_leads")
            .update({ status: "sold", purchased_by: meta.professional_id })
            .eq("id", meta.lead_id);

          // Email conferma acquisto lead al professionista
          const customerEmail = session.customer_email ?? session.customer_details?.email;
          if (customerEmail && lead) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", meta.professional_id)
              .single();
            await sendLeadPurchaseConfirmEmail(
              customerEmail,
              profile?.full_name ?? "Professionista",
              lead.question_summary ?? "Consulenza richiesta",
              lead.price_cents ?? 0
            );
          }
          break;
        }

        // Subscription checkout
        const userId = meta.userId;
        if (userId) {
          const plan = meta.plan ?? "trial";
          const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from("profiles")
            .update({
              plan: plan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              trial_ends_at: trialEndsAt,
            })
            .eq("id", userId);

          // Email benvenuto + conferma abbonamento
          const customerEmail = session.customer_email ?? session.customer_details?.email;
          if (customerEmail) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", userId)
              .single();
            const name = profile?.full_name ?? customerEmail.split("@")[0];
            await Promise.all([
              sendWelcomeEmail(customerEmail, name, plan),
              sendSubscriptionConfirmEmail(customerEmail, name, plan, trialEndsAt),
            ]);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status = sub.status;

        const planMap: Record<string, string> = {
          active: "active",
          trialing: "trial",
          canceled: "cancelled",
          past_due: "paused",
          unpaid: "paused",
        };

        await supabase
          .from("profiles")
          .update({
            plan: planMap[status] || "free",
            subscription_ends_at:
              (sub as unknown as { current_period_end?: number }).current_period_end
                ? new Date(((sub as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString()
                : null,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("profiles")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await supabase
          .from("profiles")
          .update({ plan: "paused" })
          .eq("stripe_customer_id", customerId);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
