import { NextRequest, NextResponse } from "next/server";
import { sendOtpSms } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(
  email: string,
  otp: string,
  professionistaNome: string
): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.error("[OTP] BREVO_API_KEY non configurata");
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "NormaAI", email: "noreply@normaai.it" },
        to: [{ email }],
        subject: `Il tuo codice di conferma NormaAI: ${otp}`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;">
            <div style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">NormaAI</div>
            <div style="font-size:15px;color:#4A4642;margin-bottom:24px;">
              Hai richiesto di essere messo in contatto con <strong>${professionistaNome}</strong>.
              Inserisci questo codice per confermare:
            </div>
            <div style="background:#F7F5F2;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <div style="font-size:40px;font-weight:700;letter-spacing:0.3em;color:#1a1a1a;font-family:monospace;">${otp}</div>
            </div>
            <div style="font-size:12px;color:#9A9690;">
              Il codice scade in 10 minuti. Se non hai richiesto questo codice, ignora questa email.
            </div>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[OTP] Errore invio email:", e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email, phone, leadContext } = await req.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId e email sono obbligatori" },
        { status: 400 }
      );
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Salva OTP in Supabase
    const res = await fetch(`${SUPABASE_URL}/rest/v1/lead_otp`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        email,
        lead_context: leadContext ?? {},
        otp,
        expires_at: expiresAt,
        used: false,
      }),
    });

    if (!res.ok) {
      console.error("[OTP] Errore salvataggio Supabase:", res.status);
      return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }

    const professionistaNome = leadContext?.professionistaNome ?? "il professionista";

    // Invia OTP via email + SMS in parallelo
    const [emailSent, smsSent] = await Promise.all([
      sendOtpEmail(email, otp, professionistaNome),
      phone ? sendOtpSms(phone, otp) : Promise.resolve(false),
    ]);

    if (!emailSent && !smsSent) {
      return NextResponse.json(
        { error: "Errore invio codice. Riprova." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, channels: { email: emailSent, sms: !!phone && smsSent } });
  } catch (e) {
    console.error("[OTP] Errore:", e);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
