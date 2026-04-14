/**
 * NormaAI — Twilio: SMS OTP + WhatsApp notifiche
 * Usa Twilio REST API direttamente (no npm package).
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const SMS_FROM = process.env.TWILIO_PHONE_FROM ?? ""; // es. +39... o numero virtuale Twilio
const WA_FROM = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886"; // Twilio sandbox default

function twilioHeaders() {
  const creds = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
  return {
    Authorization: `Basic ${creds}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

function formEncode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

async function sendMessage(to: string, from: string, body: string): Promise<boolean> {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.error("[twilio] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN non configurati");
    return false;
  }
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: twilioHeaders(),
      body: formEncode({ To: to, From: from, Body: body }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("[twilio] Error:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[twilio] Fetch error:", e);
    return false;
  }
}

// ─── SMS ─────────────────────────────────────────────────────────────────────

/**
 * Invia OTP via SMS.
 * @param phone Numero E.164 es. +393331234567
 */
export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  if (!SMS_FROM) {
    console.error("[twilio] TWILIO_PHONE_FROM non configurato");
    return false;
  }
  const body = `NormaAI — Il tuo codice di verifica è: ${otp}\nValido 10 minuti. Non condividerlo.`;
  return sendMessage(phone, SMS_FROM, body);
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────

/**
 * Notifica un professionista via WhatsApp quando arriva un nuovo lead.
 * @param phone Numero E.164 es. +393331234567
 */
export async function sendLeadWhatsApp(
  phone: string,
  professionalName: string,
  leadSummary: string,
  price: number
): Promise<boolean> {
  const priceFormatted = (price / 100).toFixed(2);
  const body =
    `🔔 *NormaAI* — Nuovo lead disponibile!\n\n` +
    `Ciao ${professionalName}, un cliente ha richiesto assistenza:\n\n` +
    `_"${leadSummary.slice(0, 200)}${leadSummary.length > 200 ? "…" : ""}"_\n\n` +
    `💶 Prezzo lead: €${priceFormatted}\n\n` +
    `👉 Vai su https://normaai.it per acquistarlo.`;
  return sendMessage(`whatsapp:${phone}`, WA_FROM, body);
}

/**
 * Invia OTP via WhatsApp (alternativa a SMS).
 */
export async function sendOtpWhatsApp(phone: string, otp: string): Promise<boolean> {
  const body =
    `🔐 *NormaAI* — Il tuo codice di verifica è:\n\n*${otp}*\n\nValido 10 minuti. Non condividerlo con nessuno.`;
  return sendMessage(`whatsapp:${phone}`, WA_FROM, body);
}
