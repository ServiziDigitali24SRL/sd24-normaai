import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

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

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
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

  // Get Outlook token
  const { data: tokenRecord } = await supabase
    .from("user_outlook_tokens")
    .select("access_token, refresh_token, token_expiry")
    .eq("user_id", user.id)
    .single();

  if (!tokenRecord) {
    return NextResponse.json({ error: "Outlook non connesso" }, { status: 400 });
  }

  let accessToken = tokenRecord.access_token;

  // Refresh if expired
  if (tokenRecord.token_expiry && new Date(tokenRecord.token_expiry) < new Date()) {
    if (tokenRecord.refresh_token) {
      const newToken = await refreshAccessToken(tokenRecord.refresh_token);
      if (!newToken) {
        return NextResponse.json({ error: "Token Outlook scaduto, riconnetti" }, { status: 401 });
      }
      accessToken = newToken;

      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await admin.from("user_outlook_tokens").update({
        access_token: newToken,
        token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
      }).eq("user_id", user.id);
    }
  }

  // Search messages with this person using Microsoft Graph
  const filter = encodeURIComponent(
    `(from/emailAddress/address eq '${targetEmail}') or (toRecipients/any(r:r/emailAddress/address eq '${targetEmail}'))`
  );
  const messagesRes = await fetch(
    `${GRAPH_API}/me/messages?$filter=${filter}&$top=30&$orderby=receivedDateTime desc&$select=subject,from,toRecipients,receivedDateTime,body,bodyPreview`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!messagesRes.ok) {
    // Fallback: use search instead of filter
    const searchQuery = encodeURIComponent(`"${targetEmail}"`);
    const searchRes = await fetch(
      `${GRAPH_API}/me/messages?$search=${searchQuery}&$top=30&$select=subject,from,toRecipients,receivedDateTime,body,bodyPreview`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ error: "Errore accesso Outlook" }, { status: 502 });
    }

    const searchData = await searchRes.json();
    return processMessages(searchData.value || [], targetEmail);
  }

  const messagesData = await messagesRes.json();
  return processMessages(messagesData.value || [], targetEmail);
}

async function processMessages(
  messages: {
    subject?: string;
    from?: { emailAddress?: { address?: string; name?: string } };
    toRecipients?: { emailAddress?: { address?: string; name?: string } }[];
    receivedDateTime?: string;
    body?: { content?: string; contentType?: string };
    bodyPreview?: string;
  }[],
  targetEmail: string
) {
  if (messages.length === 0) {
    return NextResponse.json({
      analysis: `Nessuna email trovata da/per **${targetEmail}**.`,
      count: 0,
    });
  }

  // Build email summaries for Claude
  const emailSummaries = messages
    .slice(0, 20)
    .map((msg, i) => {
      const from = msg.from?.emailAddress?.address || msg.from?.emailAddress?.name || "";
      const to = msg.toRecipients?.map(r => r.emailAddress?.address).join(", ") || "";
      const date = msg.receivedDateTime || "";
      const subject = msg.subject || "(nessun oggetto)";

      let body = "";
      if (msg.body?.content) {
        body = msg.body.contentType === "html"
          ? stripHtml(msg.body.content).slice(0, 800)
          : msg.body.content.slice(0, 800);
      } else {
        body = msg.bodyPreview || "(nessun testo)";
      }

      return `Email ${i + 1}:
Da: ${from}
A: ${to}
Data: ${date}
Oggetto: ${subject}
Testo: ${body}`;
    })
    .join("\n\n---\n\n");

  // Analyze with Claude
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1200,
    system: `Sei NormaAI, assistente giuridico AI. Analizza questa corrispondenza email e fornisci:
1. **Riepilogo del rapporto** — chi e' questa persona, che tipo di comunicazione avete
2. **Argomenti principali** — elenco breve dei temi trattati nelle email
3. **Aspetti legali rilevanti** — se ci sono contratti, obblighi, scadenze, contestazioni, richieste formali
4. **Suggerimenti pratici** — cosa fare o monitorare dal punto di vista normativo/legale
Rispondi in italiano, in modo conciso e professionale.`,
    messages: [{
      role: "user",
      content: `Analizza la seguente corrispondenza email Outlook con ${targetEmail} (${messages.slice(0, 20).length} email):\n\n${emailSummaries}`,
    }],
  });

  const analysis = response.content[0].type === "text" ? response.content[0].text : "";

  return NextResponse.json({ analysis, count: messages.slice(0, 20).length });
}
