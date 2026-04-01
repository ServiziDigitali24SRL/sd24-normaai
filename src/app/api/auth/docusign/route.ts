import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const DOCUSIGN_AUTH_URL = "https://account-d.docusign.com/oauth/auth";
const SCOPES = "signature";

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";
  return `${base}/api/auth/docusign/callback`;
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
  await admin.from("docusign_oauth_states").insert({ state, user_id: user.id });

  const params = new URLSearchParams({
    response_type: "code",
    scope: SCOPES,
    client_id: process.env.DOCUSIGN_CLIENT_ID!,
    redirect_uri: getRedirectUri(),
    state,
  });

  return NextResponse.redirect(`${DOCUSIGN_AUTH_URL}?${params.toString()}`);
}
