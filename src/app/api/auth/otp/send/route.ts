// /api/auth/otp/send — POST { phone, purpose? } → invia SMS OTP via Twilio.
// Rate-limited: max 3 richieste per phone per ora (anti-abuso).
// OTP: 6 cifre, TTL 5 minuti, hash sha256 in auth_otp_codes.

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendOtpSms, validatePhoneNumber } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const OTP_TTL_MIN = 5;
const OTP_HASH_SALT = process.env.OTP_HASH_SALT ?? "normaai-otp-salt-change-prod";
const RATE_LIMIT_PER_HOUR = 3;

function hashCode(code: string): string {
  return createHash("sha256").update(code + ":" + OTP_HASH_SALT).digest("hex");
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("39") && digits.length >= 11) return "+" + digits;
  if (digits.startsWith("3") && digits.length === 10) return "+39" + digits;     // mobile IT senza prefisso
  return digits.startsWith("+") ? digits : "+" + digits;
}

interface Body {
  phone?: string;
  purpose?: "signup" | "login" | "phone_change";
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const rawPhone = (body.phone ?? "").trim();
  if (!rawPhone) return NextResponse.json({ error: "missing_phone" }, { status: 400 });

  const phone = normalizePhone(rawPhone);
  if (!validatePhoneNumber(phone)) {
    return NextResponse.json({ error: "invalid_phone", message: "Formato E.164 richiesto (es. +393331234567)" }, { status: 400 });
  }

  const purpose = body.purpose ?? "signup";
  const sb = createAdminClient();

  // Rate limit: max 3 in 60 min for this phone
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await sb
    .from("auth_otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);
  if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: "rate_limited", message: "Hai richiesto troppi codici. Riprova fra un'ora.", retry_after_min: 60 },
      { status: 429 },
    );
  }

  // Generate 6-digit OTP
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000).toISOString();

  const { error: insertErr } = await sb.from("auth_otp_codes").insert({
    phone, code_hash: codeHash, purpose, expires_at: expiresAt,
  });
  if (insertErr) {
    console.error("[otp/send] insert failed", insertErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // Send SMS via Twilio (uses TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_FROM env)
  const sent = await sendOtpSms(phone, code);
  if (!sent) {
    // Twilio failed — return generic error but DON'T leak code or accept
    console.error("[otp/send] twilio send failed for", phone);
    return NextResponse.json(
      { error: "sms_send_failed", message: "Impossibile inviare l'SMS. Controlla il numero o riprova fra qualche minuto." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    sent: true,
    phone,
    expires_in_seconds: OTP_TTL_MIN * 60,
    // In dev/staging the actual code is NEVER returned. Twilio handles delivery.
  });
}
