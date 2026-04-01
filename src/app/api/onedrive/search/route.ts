import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const GRAPH_API = "https://graph.microsoft.com/v1.0";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Termine di ricerca mancante" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: tokenRecord } = await supabase
    .from("user_onedrive_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", user.id)
    .single();

  if (!tokenRecord) {
    return NextResponse.json({ error: "OneDrive non connesso" }, { status: 400 });
  }

  let accessToken = tokenRecord.access_token;

  // Refresh if expired
  if (tokenRecord.token_expiry && new Date(tokenRecord.token_expiry) < new Date()) {
    if (tokenRecord.refresh_token) {
      const newToken = await refreshAccessToken(tokenRecord.refresh_token);
      if (!newToken) {
        return NextResponse.json({ error: "Token OneDrive scaduto, riconnetti" }, { status: 401 });
      }
      accessToken = newToken;

      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await admin.from("user_onedrive_tokens").update({
        access_token: newToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq("user_id", user.id);
    }
  }

  // Search OneDrive files
  const encodedQuery = encodeURIComponent(query.trim());
  const searchRes = await fetch(
    `${GRAPH_API}/me/drive/root/search(q='${encodedQuery}')?$top=20&$select=name,file,lastModifiedDateTime,webUrl`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchRes.ok) {
    return NextResponse.json({ error: "Errore accesso OneDrive" }, { status: 502 });
  }

  const searchData = await searchRes.json();
  const items: { name: string; file?: { mimeType: string }; lastModifiedDateTime?: string; webUrl?: string }[] = searchData.value || [];

  const files = items.map(item => ({
    name: item.name,
    mimeType: item.file?.mimeType || "folder",
    lastModified: item.lastModifiedDateTime || "",
    webUrl: item.webUrl || "",
  }));

  return NextResponse.json({ files });
}
