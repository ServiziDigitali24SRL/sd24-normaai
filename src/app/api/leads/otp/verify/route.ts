import { NextRequest, NextResponse } from "next/server";
import { sendLeadNotificationEmail } from "@/lib/email";
import { sendLeadSMS } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";

// ─── TIPI ─────────────────────────────────────────────────────────────────────

interface LeadData {
  vertical: string;
  userCity: string;
  summary: string;
  professionistaCategoria: string;
  leadId: string;
  price: number;
}

interface Professionista {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  professione: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Query professionisti per categoria. Filtra per città se disponibile (match parziale). */
async function getProfessionistiByCategoria(
  categoria: string,
  city?: string
): Promise<Professionista[]> {
  // B-06 fix: filtrare professionisti con piano attivo (≠ free/cancelled),
  // non filtrare su valori di "plan" che non esistono nello schema
  let url =
    `${SUPABASE_URL}/rest/v1/profiles` +
    `?role=eq.professionista` +
    `&plan=neq.free` +
    `&select=id,full_name,email,phone,professione`;

  // Filtro categoria — professione contiene la categoria (es. "avvocato")
  if (categoria) {
    url += `&professione=ilike.*${encodeURIComponent(categoria)}*`;
  }

  // Limit per non spammare troppi professionisti in una sola notifica
  url += "&limit=50";

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error("[notify] Errore query professionisti:", res.status);
    return [];
  }

  const all: Professionista[] = await res.json();

  // Priorità a professionisti nella stessa città (filtro lato app perché
  // il campo città non è indicizzato con ilike su stringa libera)
  if (city && city.trim()) {
    const cityLower = city.toLowerCase();
    const inCity = all.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(cityLower) ||
        false
    );
    // Ritorna prima quelli in città, poi gli altri fino a 20 totali
    return [...inCity, ...all.filter((p) => !inCity.includes(p))].slice(0, 20);
  }

  return all.slice(0, 20);
}

/** Notifica tutti i professionisti matching via email + WhatsApp. */
async function notifyProfessionisti(lead: LeadData): Promise<void> {
  if (!BREVO_API_KEY) return;

  const professionisti = await getProfessionistiByCategoria(
    lead.professionistaCategoria,
    lead.userCity
  );

  if (!professionisti.length) {
    console.log("[notify] Nessun professionista trovato per categoria:", lead.professionistaCategoria);
    return;
  }

  console.log(`[notify] Notifica ${professionisti.length} professionisti per lead ${lead.leadId}`);

  await Promise.allSettled(
    professionisti.map(async (p) => {
      const notifiche = [
        sendLeadNotificationEmail(p.email, p.full_name, lead.summary, lead.leadId, lead.price),
      ];
      if (p.phone) {
        notifiche.push(
          sendLeadSMS(p.phone, p.full_name, lead.summary, lead.price) as Promise<boolean>
        );
      }
      await Promise.allSettled(notifiche);
    })
  );
}

/** Email di conferma all'utente che ha fatto il lead. */
async function sendConfirmToUser(email: string, professionistaNome: string): Promise<void> {
  if (!BREVO_API_KEY) return;
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "NormaAI", email: "noreply@normaai.it" },
        to: [{ email }],
        subject: "Il tuo professionista NormaAI ti contatterà presto",
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
            <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">NormaAI</div>
            <div style="font-size:15px;color:#4A4642;margin-bottom:16px;">
              Ottimo! <strong>${professionistaNome}</strong> ha ricevuto la tua richiesta
              e ti contatterà entro <strong>24 ore lavorative</strong>.
            </div>
            <div style="background:#F0FBF0;border:1px solid #C3E6C3;border-radius:8px;padding:16px;font-size:13px;color:#2E7D32;">
              ✓ La tua richiesta è stata inviata con successo.
            </div>
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error("[OTP/VERIFY] Errore email conferma utente:", e);
  }
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId, email, otp, leadContext } = await req.json();

    if (!userId || !email || !otp) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
    }

    // Cerca OTP valido
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/lead_otp` +
        `?user_id=eq.${userId}` +
        `&email=eq.${encodeURIComponent(email)}` +
        `&used=eq.false` +
        `&order=created_at.desc&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return NextResponse.json({ error: "Errore interno" }, { status: 500 });

    const rows = await res.json();
    if (!rows?.length)
      return NextResponse.json({ error: "Codice non trovato o già usato" }, { status: 400 });

    const record = rows[0];

    // Verifica scadenza
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Codice scaduto. Richiedi un nuovo codice." },
        { status: 400 }
      );
    }

    // Verifica OTP
    if (record.otp !== otp.trim()) {
      return NextResponse.json({ error: "Codice non valido." }, { status: 400 });
    }

    // Marca OTP come usato
    const markUsedRes = await fetch(`${SUPABASE_URL}/rest/v1/lead_otp?id=eq.${record.id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ used: true }),
    });
    if (!markUsedRes.ok) {
      return NextResponse.json({ error: "Errore interno. Riprova." }, { status: 500 });
    }

    // Crea lead in marketplace_leads
    const ctx = record.lead_context ?? {};
    const verticaleNorm = (ctx.vertical ?? "generico")
      .toLowerCase()
      .replace(/[\s/]+/g, "-");
    const price = verticaleNorm === "impresa" ? 15000 : 7500;

    const leadRes = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_leads`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        consumer_id: userId,
        consumer_city: leadContext?.userCity ?? null,
        vertical_id: verticaleNorm,
        question_summary: ctx.summary ?? "",
        price_cents: price,
        lead_score: 80,
        lead_tier: "hot",
        lead_type: "privato",
        status: "pending",
      }),
    });

    const leadRows = leadRes.ok ? await leadRes.json() : [];
    const leadId: string = leadRows[0]?.id ?? "unknown";

    // Notifica professionisti + conferma utente in parallelo
    await Promise.all([
      notifyProfessionisti({
        vertical: ctx.vertical ?? "generico",
        userCity: leadContext?.userCity ?? "",
        summary: ctx.summary ?? "",
        professionistaCategoria: ctx.professionistaCategoria ?? "",
        leadId,
        price,
      }),
      sendConfirmToUser(email, ctx.professionistaNome ?? "Il professionista"),
    ]);

    return NextResponse.json({ ok: true, leadId });
  } catch (e) {
    console.error("[OTP/VERIFY] Errore:", e);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
