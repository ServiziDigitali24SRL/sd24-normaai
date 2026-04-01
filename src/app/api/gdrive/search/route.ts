import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
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

  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Get Drive token
  const { data: tokenRecord } = await supabase
    .from("user_gdrive_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", user.id)
    .single();

  if (!tokenRecord) {
    return NextResponse.json({ error: "Google Drive non connesso" }, { status: 400 });
  }

  let accessToken = tokenRecord.access_token;

  // Refresh if expired
  if (tokenRecord.token_expiry && new Date(tokenRecord.token_expiry) < new Date()) {
    if (tokenRecord.refresh_token) {
      const newToken = await refreshAccessToken(tokenRecord.refresh_token);
      if (!newToken) {
        return NextResponse.json({ error: "Token Drive scaduto, riconnetti" }, { status: 401 });
      }
      accessToken = newToken;

      // Update token in DB
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await admin.from("user_gdrive_tokens").update({
        access_token: newToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
  }

  // Search files via Google Drive API
  const searchQuery = `fullText contains '${query.replace(/'/g, "\\'")}'`;
  const params = new URLSearchParams({
    q: searchQuery,
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    pageSize: "20",
    orderBy: "modifiedTime desc",
  });

  const driveRes = await fetch(`${DRIVE_API}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!driveRes.ok) {
    return NextResponse.json({ error: "Errore accesso Google Drive" }, { status: 502 });
  }

  const driveData = await driveRes.json();

  const files = (driveData.files || []).map((f: { name: string; mimeType: string; modifiedTime: string; webViewLink: string }) => ({
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
  }));

  return NextResponse.json({ files });
}
