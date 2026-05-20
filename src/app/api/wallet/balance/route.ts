// /api/wallet/balance — GET { balance_eur, balance_cents, transactions: [...] }
// for the authenticated lawyer. Returns 0 if no wallet row yet.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { data: wallet } = await supabase
    .from("lawyer_wallet")
    .select("balance_cents, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const balance = wallet?.balance_cents ?? 0;

  const { data: tx } = await supabase
    .from("wallet_transactions")
    .select("id, kind, amount_cents, balance_after_cents, lead_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    balance_cents: balance,
    balance_eur: balance / 100,
    updated_at: wallet?.updated_at ?? null,
    transactions: (tx ?? []).map(t => ({
      id: t.id,
      kind: t.kind,
      amount_eur: t.amount_cents / 100,
      balance_after_eur: t.balance_after_cents / 100,
      lead_id: t.lead_id,
      created_at: t.created_at,
    })),
  });
}
