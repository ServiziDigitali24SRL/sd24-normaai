import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  sendWelcomeEmail,
  sendSubscriptionConfirmEmail,
  sendLeadPurchaseConfirmEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";
// SER-74: CRITICO — Edge Runtime consuma il body prima di constructEvent → firma fallisce silenziosamente
export const runtime = "nodejs";

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

  // CVE-08 fix: idempotency check
  try {
    const { error: insertErr } = await supabase
      .from("stripe_processed_events")
      .insert({ event_id: event.id, event_type: event.type });
    if (insertErr && insertErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch {
    // Tabella non ancora creata o errore transitorio: continua senza idempotency
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata ?? {};

        // Consumer paid for "Chiedi a un Professionista" → lead diventa available
        if (meta.source === "mobile_pay_professional" && meta.lead_id) {
          await supabase
            .from("marketplace_leads")
            .update({
              status: "available",
              stripe_payment_id: session.id,
              paid_at: new Date().toISOString(),
            })
            .eq("id", meta.lead_id)
            .eq("status", "pending_payment");
          break;
        }

        // Lead purchase: professionista compra lead dal marketplace
        if (meta.type === "lead_purchase" && meta.lead_id && meta.professional_id) {
          const { data: lead } = await supabase
            .from("marketplace_leads")
            .select("question_summary, price_cents")
            .eq("id", meta.lead_id)
            .single();

          await supabase
            .from("marketplace_leads")
            .update({
              status: "purchased",
              professional_id: meta.professional_id,
              stripe_payment_id: session.id,
              paid_at: new Date().toISOString(),
            })
            .eq("id", meta.lead_id);

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
          const isImpresaPlan = ["impresa_micro", "impresa_piccola", "impresa_media", "impresa_grande"].includes(plan);
          const trialDays = isImpresaPlan ? 7 : 14;
          const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from("profiles")
            .update({
              plan: isImpresaPlan ? "impresa" : plan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              trial_ends_at: trialEndsAt,
            })
            .eq("id", userId);

          if (isImpresaPlan) {
            const QUERY_MAP: Record<string, number> = {
              impresa_micro: 543, impresa_piccola: 1481, impresa_media: 3731, impresa_grande: 9356,
            };
            const month = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }).slice(0, 7);
            await supabase
              .from("company_profiles")
              .upsert({
                user_id: userId,
                piano: plan,
                stripe_subscription_id: session.subscription as string,
                query_incluse: QUERY_MAP[plan] ?? 543,
                query_usate_mese: 0,
                mese_corrente: month,
                trial_ends_at: trialEndsAt,
                stato: "trial",
              }, { onConflict: "user_id" });
          }

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
        const subMeta = sub.metadata ?? {};
        const subPlan = subMeta.plan ?? "";
        const isImpresaPlan = ["impresa_micro", "impresa_piccola", "impresa_media", "impresa_grande"].includes(subPlan);

        const profilePlan = isImpresaPlan ? "impresa" : (status === "canceled" ? "free" : status === "past_due" || status === "unpaid" ? "paused" : subPlan || "free");

        await supabase
          .from("profiles")
          .update({
            plan: profilePlan,
            subscription_ends_at:
              (sub as unknown as { current_period_end?: number }).current_period_end
                ? new Date(((sub as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString()
                : null,
          })
          .eq("stripe_customer_id", customerId);

        if (isImpresaPlan && status === "active") {
          await supabase
            .from("company_profiles")
            .update({ stato: "attivo" })
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("profiles")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("stripe_subscription_id", sub.id);
        await supabase
          .from("company_profiles")
          .update({ stato: "cancellato" })
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
        await supabase
          .from("company_profiles")
          .update({ stato: "sospeso" })
          .eq("stripe_subscription_id", (invoice as unknown as { subscription?: string }).subscription ?? "");
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return NextResponse.json({ received: true });
}
