import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
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

function extractPlainText(payload: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }): string {
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const text = extractPlainText(part as { mimeType?: string; body?: { data?: string }; parts?: unknown[] });
      if (text) return text;
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  const { targetEmail } = await req.json();

  if (!targetEmail?.trim()) {
    return NextResponse.json({ error: "Indirizzo email mancante" }, { status: 400 });
  }

  // Get current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Get Gmail token
  const { data: tokenRecord } = await supabase
    .from("user_gmail_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", user.id)
    .single();

  if (!tokenRecord) {
    return NextResponse.json({ error: "Gmail non connessa" }, { status: 400 });
  }

  let accessToken = tokenRecord.access_token;

  // Refresh if expired
  if (tokenRecord.token_expiry && new Date(tokenRecord.token_expiry) < new Date()) {
    if (tokenRecord.refresh_token) {
      const newToken = await refreshAccessToken(tokenRecord.refresh_token);
      if (!newToken) {
        return NextResponse.json({ error: "Token Gmail scaduto, riconnetti" }, { status: 401 });
      }
      accessToken = newToken;

      // Update token in DB
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await admin.from("user_gmail_tokens").update({
        access_token: newToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
  }

  // Fetch message IDs matching the target email (max 30)
  const query = encodeURIComponent(`from:${targetEmail} OR to:${targetEmail}`);
  const listRes = await fetch(
    `${GMAIL_API}/messages?q=${query}&maxResults=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    return NextResponse.json({ error: "Errore accesso Gmail" }, { status: 502 });
  }

  const listData = await listRes.json();
  const messages: { id: string }[] = listData.messages || [];

  if (messages.length === 0) {
    return NextResponse.json({
      analysis: `Nessuna email trovata da/per **${targetEmail}**.`,
      count: 0,
    });
  }

  // Fetch message details (parallel, max 20)
  const toFetch = messages.slice(0, 20);
  const details = await Promise.all(
    toFetch.map(m =>
      fetch(`${GMAIL_API}/messages/${m.id}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.ok ? r.json() : null)
    )
  );

  // Build email summaries for Claude
  const emailSummaries = details
    .filter(Boolean)
    .map((msg, i) => {
      const headers: { name: string; value: string }[] = msg.payload?.headers || [];
      const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value || "(nessun oggetto)";
      const from = headers.find((h: { name: string }) => h.name === "From")?.value || "";
      const to = headers.find((h: { name: string }) => h.name === "To")?.value || "";
      const date = headers.find((h: { name: string }) => h.name === "Date")?.value || "";
      const body = extractPlainText(msg.payload || {}).slice(0, 800);

      return `Email ${i + 1}:
Da: ${from}
A: ${to}
Data: ${date}
Oggetto: ${subject}
Testo: ${body || msg.snippet || "(nessun testo)"}`;
    })
    .join("\n\n---\n\n");

  // Analyze with Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    system: `Sei NormaAI, assistente giuridico AI. Analizza questa corrispondenza email e fornisci:
1. **Riepilogo del rapporto** — chi è questa persona, che tipo di comunicazione avete
2. **Argomenti principali** — elenco breve dei temi trattati nelle email
3. **Aspetti legali rilevanti** — se ci sono contratti, obblighi, scadenze, contestazioni, richieste formali
4. **Suggerimenti pratici** — cosa fare o monitorare dal punto di vista normativo/legale
Rispondi in italiano, in modo conciso e professionale.`,
    messages: [{
      role: "user",
      content: `Analizza la seguente corrispondenza email con ${targetEmail} (${details.filter(Boolean).length} email):\n\n${emailSummaries}`,
    }],
  });

  const analysis = response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ analysis, count: details.filter(Boolean).length });
}
