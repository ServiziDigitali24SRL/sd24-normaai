import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

    const supabase = getAdmin();
    const { data } = await supabase
      .from("company_profiles")
      .select("piano, query_incluse, query_usate_mese, mese_corrente, trial_ends_at, stato")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return NextResponse.json({ error: "Company profile not found" }, { status: 404 });

    return NextResponse.json({
      piano: data.piano,
      query_incluse: data.query_incluse,
      query_usate_mese: data.query_usate_mese,
      mese_corrente: data.mese_corrente,
      trial_ends_at: data.trial_ends_at,
      stato: data.stato,
      pct_used: Math.min(100, Math.round((data.query_usate_mese / data.query_incluse) * 100)),
    });
  } catch (e) {
    console.error("query-count error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
