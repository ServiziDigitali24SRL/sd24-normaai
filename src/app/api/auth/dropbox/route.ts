import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const DROPBOX_AUTH_URL = "https://www.dropbox.com/oauth2/authorize";

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";
  return `${base}/api/auth/dropbox/callback`;
}

export async function GET() {
  // Verify user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Generate CSRF state and store in DB
  const state = crypto.randomBytes(20).toString("hex");

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await admin.from("dropbox_oauth_states").insert({ state, user_id: user.id });

  // Build Dropbox OAuth URL
  const params = new URLSearchParams({
    client_id: process.env.DROPBOX_APP_KEY!,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    token_access_type: "offline",
    state,
  });

  return NextResponse.redirect(`${DROPBOX_AUTH_URL}?${params.toString()}`);
}
