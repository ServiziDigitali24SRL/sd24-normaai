import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { name, email, phone } = await req.json();
    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { error } = await supabase.from("invest_leads").insert({ name, email, phone });
    if (error) {
      console.error("[INVEST LEAD] Supabase error:", error.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    // saved
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
