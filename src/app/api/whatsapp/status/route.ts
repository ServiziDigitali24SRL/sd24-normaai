import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ connected: false });
  }

  const { data } = await supabase
    .from("user_whatsapp_tokens")
    .select("phone_number")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    connected: !!data,
    phone: data?.phone_number || null,
  });
}
