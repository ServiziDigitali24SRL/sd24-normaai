import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const TOKEN_URL = "https://account-d.docusign.com/oauth/token";
const USERINFO_URL = "https://account-d.docusign.com/oauth/userinfo";

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";
  return `${base}/api/auth/docusign/callback`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";

  if (error || !code || !state) {
    return NextResponse.redirect(`${base}/?docusign=error`);
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verifica state e ottieni user_id
  const { data: stateRecord } = await admin
    .from("docusign_oauth_states")
    .select("user_id, created_at")
    .eq("state", state)
    .single();

  if (!stateRecord) {
    return NextResponse.redirect(`${base}/?docusign=error`);
  }

  // Verifica scadenza state (10 minuti)
  const age = Date.now() - new Date(stateRecord.created_at).getTime();
  if (age > 10 * 60 * 1000) {
    await admin.from("docusign_oauth_states").delete().eq("state", state);
    return NextResponse.redirect(`${base}/?docusign=error`);
  }

  // Elimina state usato
  await admin.from("docusign_oauth_states").delete().eq("state", state);

  // Scambia code per token
  const basicAuth = Buffer.from(
    `${process.env.DOCUSIGN_CLIENT_ID}:${process.env.DOCUSIGN_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/?docusign=error`);
  }

  const tokens = await tokenRes.json();

  // Ottieni info utente e account
  let accountId: string | null = null;
  let accountName: string | null = null;

  try {
    const infoRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      // DocuSign userinfo restituisce accounts[]
      if (info.accounts && info.accounts.length > 0) {
        const defaultAccount =
          info.accounts.find((a: { is_default: boolean }) => a.is_default) ||
          info.accounts[0];
        accountId = defaultAccount.account_id || null;
        accountName = defaultAccount.account_name || null;
      }
    }
  } catch {}

  // Salva token nel DB (upsert)
  await admin.from("user_docusign_tokens").upsert(
    {
      user_id: stateRecord.user_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      account_id: accountId,
      account_name: accountName,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return NextResponse.redirect(`${base}/?docusign=connected`);
}
