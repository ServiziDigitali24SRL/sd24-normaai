import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code?.trim()) {
    return NextResponse.json({ error: "Inserisci un codice promozionale." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check user plan — solo piani non-free
  const { data: profile } = await admin
    .from("profiles")
    .select("piano, wallet_credits")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profilo non trovato." }, { status: 404 });
  }

  if (profile.piano === "free" || !profile.piano) {
    return NextResponse.json(
      { error: "I codici promozionali sono disponibili solo per gli abbonati." },
      { status: 403 }
    );
  }

  // Fetch promo code
  const { data: promo } = await admin
    .from("promo_codes")
    .select("id, credits_cents, expires_at, max_uses, used_count, is_active")
    .eq("code", code.trim().toUpperCase())
    .single();

  if (!promo) {
    return NextResponse.json({ error: "Codice non valido." }, { status: 404 });
  }

  if (!promo.is_active) {
    return NextResponse.json({ error: "Questo codice non è più attivo." }, { status: 400 });
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ error: "Questo codice è scaduto." }, { status: 400 });
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ error: "Questo codice ha raggiunto il limite massimo di utilizzi." }, { status: 400 });
  }

  // Check if already redeemed by this user
  const { data: existing } = await admin
    .from("promo_redemptions")
    .select("id")
    .eq("promo_code_id", promo.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Hai già utilizzato questo codice." }, { status: 409 });
  }

  // Apply promo: update wallet_credits, increment used_count, insert redemption
  const currentCredits = profile.wallet_credits ?? 0;

  const [creditsResult, , redemptionResult] = await Promise.all([
    admin
      .from("profiles")
      .update({ wallet_credits: currentCredits + promo.credits_cents })
      .eq("id", user.id),
    admin
      .from("promo_codes")
      .update({ used_count: promo.used_count + 1 })
      .eq("id", promo.id),
    admin
      .from("promo_redemptions")
      .insert({ promo_code_id: promo.id, user_id: user.id }),
  ]);

  if (creditsResult.error || redemptionResult.error) {
    console.error("Errore applicazione promo:", creditsResult.error, redemptionResult.error);
    return NextResponse.json({ error: "Errore durante l'applicazione del codice. Riprova." }, { status: 500 });
  }

  const creditsAdded = promo.credits_cents;
  const newBalance = currentCredits + creditsAdded;
  const euros = creditsAdded / 100;

  return NextResponse.json({
    success: true,
    credits_added: creditsAdded,
    new_balance: newBalance,
    message: `€${euros.toFixed(0)} aggiunti al tuo wallet!`,
  });
}
