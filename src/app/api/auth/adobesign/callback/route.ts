import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { encryptToken } from "@/lib/oauth-crypto";

export const dynamic = "force-dynamic";

const TOKEN_URL = "https://api.adobesign.com/oauth/v2/token";

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";
  return `${base}/api/auth/adobesign/callback`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const apiAccessPoint = searchParams.get("api_access_point") || "https://api.adobesign.com/";
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";

  if (error || !code || !state) {
    return NextResponse.redirect(`${base}/?adobesign=error`);
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verifica state e ottieni user_id
  const { data: stateRecord } = await admin
    .from("adobesign_oauth_states")
    .select("user_id, created_at")
    .eq("state", state)
    .single();

  if (!stateRecord) {
    return NextResponse.redirect(`${base}/?adobesign=error`);
  }

  // Verifica scadenza state (10 minuti)
  const age = Date.now() - new Date(stateRecord.created_at).getTime();
  if (age > 10 * 60 * 1000) {
    await admin.from("adobesign_oauth_states").delete().eq("state", state);
    return NextResponse.redirect(`${base}/?adobesign=error`);
  }

  // Elimina state usato
  await admin.from("adobesign_oauth_states").delete().eq("state", state);

  // Scambia code per token
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.ADOBESIGN_CLIENT_ID!,
      client_secret: process.env.ADOBESIGN_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/?adobesign=error`);
  }

  const tokens = await tokenRes.json();

  // Recupera email utente tramite Adobe Sign API
  let userEmail: string | null = null;

  try {
    const userInfoRes = await fetch(`${apiAccessPoint}api/rest/v6/users/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      userEmail = userInfo.email || null;
    }
  } catch {}

  // Salva token nel DB (upsert)
  await admin.from("user_adobesign_tokens").upsert(
    {
      user_id: stateRecord.user_id,
      access_token: encryptToken(tokens.access_token),
      refresh_token: encryptToken(tokens.refresh_token || null),
      email: userEmail,
      api_access_point: apiAccessPoint,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return NextResponse.redirect(`${base}/?adobesign=connected`);
}
