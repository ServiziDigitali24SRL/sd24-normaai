import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";
  return `${base}/api/auth/gmail/callback`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";

  if (error || !code || !state) {
    return NextResponse.redirect(`${base}/?gmail=error`);
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify state and get user_id
  const { data: stateRecord } = await admin
    .from("gmail_oauth_states")
    .select("user_id, created_at")
    .eq("state", state)
    .single();

  if (!stateRecord) {
    return NextResponse.redirect(`${base}/?gmail=error`);
  }

  // Check state expiry (10 minutes)
  const age = Date.now() - new Date(stateRecord.created_at).getTime();
  if (age > 10 * 60 * 1000) {
    await admin.from("gmail_oauth_states").delete().eq("state", state);
    return NextResponse.redirect(`${base}/?gmail=error`);
  }

  // Delete used state
  await admin.from("gmail_oauth_states").delete().eq("state", state);

  // Exchange code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/?gmail=error`);
  }

  const tokens = await tokenRes.json();

  // Get Gmail address
  let gmailEmail: string | null = null;
  try {
    const infoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      gmailEmail = info.email || null;
    }
  } catch {}

  // Save tokens to DB (upsert)
  const expiry = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  await admin.from("user_gmail_tokens").upsert({
    user_id: stateRecord.user_id,
    gmail_email: gmailEmail,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || null,
    token_expiry: expiry,
    scope: tokens.scope || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return NextResponse.redirect(`${base}/?gmail=connected`);
}
