import { NextRequest, NextResponse } from "next/server";

// Cron job: chiamato ogni mattina alle 08:00 dal VPS Hetzner (Docker)
// Comando cron: curl -X GET https://normaai-app.vercel.app/api/scadenze/notify -H "x-cron-secret: $CRON_SECRET"
// oppure da Vercel Cron: "0 8 * * *" (UTC+1 → 08:00 Italia in ora solare, 07:00 UTC)

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

interface UserDocument {
  id: string;
  user_id: string;
  nome_file: string;
  scadenze_estratte: Array<{ tipo: string; data: string; descrizione: string; stato?: string }>;
  profiles: { email: string; full_name?: string } | null;
}

function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

const TIPO_ICONS: Record<string, string> = {
  Pagamento: "💳", Fiscale: "🧾", Legale: "⚖️", "Permesso soggiorno": "🌍",
  Contrattuale: "📋", Garanzia: "🛡️", Prescrizione: "⏰", Altro: "📅",
};

async function sendNotificationEmail(
  email: string,
  nome: string,
  scadenze: Array<{ tipo: string; data: string; descrizione: string; giorni: number }>
): Promise<boolean> {
  if (!BREVO_API_KEY) return false;
  const scadenzeHtml = scadenze.map((s) => {
    const urgency = s.giorni <= 1 ? "#C00" : s.giorni <= 7 ? "#9B6B00" : "#2E7D32";
    const label = s.giorni === 0 ? "Oggi!" : s.giorni === 1 ? "Domani!" : `tra ${s.giorni} giorni`;
    return `
      <div style="border:1px solid #E5E1D8;border-radius:8px;padding:14px 16px;margin-bottom:8px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:14px;font-weight:600;color:#1a1a1a;">${TIPO_ICONS[s.tipo] ?? "📅"} ${s.descrizione}</span>
          <span style="font-size:12px;font-weight:700;color:${urgency};">${label}</span>
        </div>
        <div style="font-size:12px;color:#6B6763;margin-top:4px;">${s.tipo} · ${formatDate(s.data)}</div>
      </div>`;
  }).join("");

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "NormaAI", email: "noreply@normaai.it" },
        to: [{ email, name: nome || email }],
        subject: `⏰ ${scadenze.length} scadenz${scadenze.length === 1 ? "a" : "e"} in arrivo — NormaAI`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#FAFAF8;">
            <div style="font-size:24px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">NormaAI</div>
            <div style="font-size:13px;color:#9A9690;margin-bottom:24px;">Il tuo assistente legale</div>
            <div style="font-size:16px;color:#4A4642;margin-bottom:16px;">
              Ciao${nome ? " " + nome.split(" ")[0] : ""}, hai <strong>${scadenze.length} scadenz${scadenze.length === 1 ? "a" : "e"}</strong> in avvicinarsi:
            </div>
            ${scadenzeHtml}
            <div style="margin-top:24px;text-align:center;">
              <a href="https://normaai.it" style="background:#E8340A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
                Gestisci le scadenze →
              </a>
            </div>
            <div style="margin-top:24px;font-size:11px;color:#9A9690;text-align:center;">
              NormaAI · <a href="https://normaai.it" style="color:#9A9690;">normaai.it</a>
            </div>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[NOTIFY] Errore Brevo:", e);
    return false;
  }
}

export async function GET(req: NextRequest) {
  // B-17 fix: cron secret OBBLIGATORIO (500 se mancante in env, 401 se errato)
  if (!CRON_SECRET) {
    console.error("[scadenze/notify] CRON_SECRET non configurato in env");
    return NextResponse.json({ error: "Cron secret non configurato" }, { status: 500 });
  }
  const headerSecret = req.headers.get("x-cron-secret");
  // Vercel Cron aggiunge Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization") || "";
  const bearerSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (headerSecret !== CRON_SECRET && bearerSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: "Supabase non configurato" }, { status: 500 });
  }

  const REMINDER_DAYS = [1, 7, 14];
  let notified = 0;
  let errors = 0;

  try {
    // Carica tutti i documenti con scadenze (join profiles per email)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_documents?scadenze_estratte=neq.[]&select=id,user_id,nome_file,scadenze_estratte,profiles(email,full_name)`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const docs: UserDocument[] = await res.json();

    // Raggruppa per utente
    const byUser: Record<string, { email: string; nome: string; scadenze: Array<{ tipo: string; data: string; descrizione: string; giorni: number }> }> = {};

    for (const doc of docs) {
      const email = doc.profiles?.email;
      if (!email) continue;
      const nome = doc.profiles?.full_name ?? "";

      for (const s of doc.scadenze_estratte) {
        if (s.stato === "gestita") continue;
        const giorni = daysUntil(s.data);
        if (!REMINDER_DAYS.includes(giorni)) continue;

        if (!byUser[doc.user_id]) {
          byUser[doc.user_id] = { email, nome, scadenze: [] };
        }
        byUser[doc.user_id].scadenze.push({ ...s, giorni });
      }
    }

    // Invia email per utente
    for (const [, userData] of Object.entries(byUser)) {
      if (userData.scadenze.length === 0) continue;
      // Ordina per urgenza
      userData.scadenze.sort((a, b) => a.giorni - b.giorni);
      const ok = await sendNotificationEmail(userData.email, userData.nome, userData.scadenze);
      if (ok) notified++;
      else errors++;
    }

    return NextResponse.json({
      ok: true,
      notified,
      errors,
      processed: Object.keys(byUser).length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[NOTIFY] Errore:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
