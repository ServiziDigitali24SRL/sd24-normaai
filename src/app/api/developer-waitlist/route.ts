import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, usecase } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { error } = await supabase.from("developer_waitlist").upsert(
      { name, email, company: company || null, usecase: usecase || null },
      { onConflict: "email" }
    );
    if (error) {
      console.error("[DEV WAITLIST] Supabase error:", error.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    // saved
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
