import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ADOBESIGN_AUTH_URL = "https://secure.adobesign.com/public/oauth/v2";
const SCOPES = "agreement_read:account";

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";
  return `${base}/api/auth/adobesign/callback`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const state = crypto.randomBytes(20).toString("hex");

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await admin.from("adobesign_oauth_states").insert({ state, user_id: user.id });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ADOBESIGN_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state,
  });

  return NextResponse.redirect(`${ADOBESIGN_AUTH_URL}?${params.toString()}`);
}
