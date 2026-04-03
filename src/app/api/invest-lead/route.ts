import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone } = await req.json();
    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { error } = await supabase.from("invest_leads").insert({ name, email, phone });
    if (error) {
      console.error("[INVEST LEAD] Supabase error:", error.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    console.log(`[INVEST LEAD] saved: ${email}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
