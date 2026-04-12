import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { desc, email, url, ua } = await req.json();
    if (!desc?.trim()) return NextResponse.json({ error: "Missing desc" }, { status: 400 });

    const { error } = await supabase.from("bug_reports").insert({
      description: desc,
      email:       email || null,
      page_url:    url || null,
      user_agent:  ua || null,
    });
    if (error) {
      console.error("[BUG REPORT] Supabase error:", error.message);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    // saved
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
