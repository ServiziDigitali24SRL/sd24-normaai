import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ connected: false });
  }

  const { data } = await supabase
    .from("user_onedrive_tokens")
    .select("email, token_expiry")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    connected: !!data,
    email: data?.email || null,
  });
}
