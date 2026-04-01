import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SEARCH_URL = "https://api.dropboxapi.com/2/files/search_v2";
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.DROPBOX_APP_KEY!,
      client_secret: process.env.DROPBOX_APP_SECRET!,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = await req.json();
  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "Inserisci un termine di ricerca" }, { status: 400 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get tokens
  const { data: tokenRow } = await admin
    .from("user_dropbox_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", user.id)
    .single();

  if (!tokenRow) {
    return NextResponse.json({ error: "Dropbox non connesso" }, { status: 401 });
  }

  let accessToken = tokenRow.access_token;

  // Refresh token if expired
  const isExpired = tokenRow.token_expiry && new Date(tokenRow.token_expiry) <= new Date();
  if (isExpired && tokenRow.refresh_token) {
    const newToken = await refreshAccessToken(tokenRow.refresh_token);
    if (!newToken) {
      return NextResponse.json({ error: "Sessione Dropbox scaduta. Riconnetti il tuo account." }, { status: 401 });
    }
    accessToken = newToken;

    // Update token in DB
    await admin
      .from("user_dropbox_tokens")
      .update({
        access_token: newToken,
        token_expiry: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  }

  // Search Dropbox
  const searchRes = await fetch(SEARCH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      options: {
        max_results: 20,
        file_status: "active",
      },
    }),
  });

  if (!searchRes.ok) {
    const errData = await searchRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: errData?.error_summary || "Errore nella ricerca Dropbox" },
      { status: searchRes.status }
    );
  }

  const searchData = await searchRes.json();

  const files = (searchData.matches || [])
    .filter((m: { metadata: { metadata: { ".tag": string } } }) => m.metadata?.metadata?.[".tag"] === "file")
    .map((m: { metadata: { metadata: { id: string; name: string; path_display: string; client_modified: string; size: number } } }) => {
      const meta = m.metadata.metadata;
      return {
        id: meta.id,
        name: meta.name,
        path: meta.path_display,
        modified: meta.client_modified,
        size: meta.size || 0,
      };
    });

  return NextResponse.json({ files });
}
