/**
 * NormaAI — Email Transazionali via Brevo REST API
 * Nessuna libreria esterna necessaria, solo fetch nativo.
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER = { name: "NormaAI", email: "noreply@normaai.it" };
const BASE_URL = "https://api.brevo.com/v3/smtp/email";

interface EmailPayload {
  to: string;
  name?: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, name, subject, html }: EmailPayload): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.error("[email] BREVO_API_KEY non configurata");
    return false;
  }

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: to, name: name ?? to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Brevo error:", res.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Fetch error:", err);
    return false;
  }
}

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string, role: string): Promise<boolean> {
  const roleLabel =
    role === "professionista" ? "Professionista" :
    role === "impresa" ? "Impresa" : "Cittadino";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#0f172a;padding:32px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">NormaAI</h1>
        <p style="color:#94a3b8;margin:8px 0 0">La norma è uguale per tutti.</p>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 16px">Benvenuto, ${name}!</h2>
        <p>Il tuo account <strong>${roleLabel}</strong> è attivo.</p>
        <p>Puoi accedere subito alla piattaforma e iniziare a fare domande sulla normativa italiana.</p>
        <div style="margin:32px 0;text-align:center">
          <a href="https://normaai.it" style="background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Accedi a NormaAI →
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#64748b;font-size:14px">
          Hai bisogno di aiuto? Rispondi a questa email o scrivi a
          <a href="mailto:supporto@normaai.it">supporto@normaai.it</a>
        </p>
      </div>
    </div>
  `;

  return sendEmail({ to, name, subject: `Benvenuto su NormaAI, ${name}!`, html });
}

export async function sendLeadNotificationEmail(
  to: string,
  professionalName: string,
  leadSummary: string,
  leadId: string,
  price: number
): Promise<boolean> {
  const priceFormatted = (price / 100).toFixed(2);
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#0f172a;padding:32px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">NormaAI</h1>
        <p style="color:#94a3b8;margin:8px 0 0">Nuovo lead disponibile</p>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 16px">Ciao ${professionalName},</h2>
        <p>È disponibile un nuovo lead che potrebbe interessarti:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0;color:#475569;font-style:italic">"${leadSummary}"</p>
        </div>
        <p><strong>Prezzo lead:</strong> €${priceFormatted}</p>
        <div style="margin:32px 0;text-align:center">
          <a href="https://normaai.it?lead=${leadId}" style="background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Visualizza e Acquista Lead →
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#64748b;font-size:14px">
          Non vuoi ricevere notifiche lead?
          <a href="https://normaai.it/profilo">Gestisci le preferenze</a>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    name: professionalName,
    subject: "Nuovo lead disponibile su NormaAI",
    html,
  });
}

export async function sendSubscriptionConfirmEmail(
  to: string,
  name: string,
  plan: string,
  trialEndsAt?: string
): Promise<boolean> {
  const planLabel =
    plan === "professionista" ? "Professionista (€29/mese)" :
    plan === "impresa" ? "Impresa (€149/mese)" :
    plan === "trial" ? "Trial gratuito 14 giorni" : plan;

  const trialInfo = trialEndsAt
    ? `<p>Il tuo periodo di prova gratuito termina il <strong>${new Date(trialEndsAt).toLocaleDateString("it-IT")}</strong>.</p>`
    : "";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#0f172a;padding:32px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">NormaAI</h1>
        <p style="color:#94a3b8;margin:8px 0 0">Abbonamento attivato</p>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 16px">Abbonamento confermato!</h2>
        <p>Ciao <strong>${name}</strong>, il tuo abbonamento è stato attivato con successo.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0"><strong>Piano attivo:</strong> ${planLabel}</p>
        </div>
        ${trialInfo}
        <p>Hai ora accesso completo a tutte le funzionalità del piano.</p>
        <div style="margin:32px 0;text-align:center">
          <a href="https://normaai.it" style="background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Vai alla piattaforma →
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="color:#64748b;font-size:14px">
          Per gestire il tuo abbonamento:
          <a href="https://normaai.it/profilo">Area personale</a>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    name,
    subject: `Abbonamento ${planLabel} attivato — NormaAI`,
    html,
  });
}

export async function sendLeadPurchaseConfirmEmail(
  to: string,
  professionalName: string,
  clientQuestion: string,
  price: number
): Promise<boolean> {
  const priceFormatted = (price / 100).toFixed(2);
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#0f172a;padding:32px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">NormaAI</h1>
        <p style="color:#94a3b8;margin:8px 0 0">Lead acquistato</p>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 16px">Lead acquistato con successo!</h2>
        <p>Ciao <strong>${professionalName}</strong>, hai acquistato il seguente lead per <strong>€${priceFormatted}</strong>:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
          <p style="margin:0;color:#475569;font-style:italic">"${clientQuestion}"</p>
        </div>
        <p>I dettagli completi del cliente sono ora disponibili nella tua dashboard.</p>
        <div style="margin:32px 0;text-align:center">
          <a href="https://normaai.it?modal=dashboard" style="background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Vai alla Dashboard →
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    name: professionalName,
    subject: "Lead acquistato — NormaAI",
    html,
  });
}
