// /api/auth/otp/verify — POST { phone, code } → conferma OTP.
// Match: trova ultimo OTP non scaduto e non verificato per quel phone, confronta
// hash. Max 5 attempts per record. Su success: marca verified_at, aggiorna
// users.phone + users.phone_verified_at (se l'utente è autenticato O se si
// trova un users row con quel phone in onboarding pending).

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const OTP_HASH_SALT = process.env.OTP_HASH_SALT ?? "normaai-otp-salt-change-prod";
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code + ":" + OTP_HASH_SALT).digest("hex");
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  if (digits.startsWith("39") && digits.length >= 11) return "+" + digits;
  if (digits.startsWith("3") && digits.length === 10) return "+39" + digits;
  return digits.startsWith("+") ? digits : "+" + digits;
}

interface Body { phone?: string; code?: string; }

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.phone || !body.code) {
    return NextResponse.json({ error: "missing_fields", required: ["phone", "code"] }, { status: 400 });
  }

  const phone = normalizePhone(body.phone);
  const code = body.code.replace(/\D/g, "");
  if (code.length !== 6) {
    return NextResponse.json({ error: "invalid_code_format" }, { status: 400 });
  }

  const sb = createAdminClient();

  // Fetch the most recent non-verified, non-expired OTP for this phone
  const { data: row, error } = await sb
    .from("auth_otp_codes")
    .select("id, code_hash, attempts, expires_at, purpose")
    .eq("phone", phone)
    .is("verified_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "otp_not_found_or_expired" }, { status: 410 });
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "max_attempts_exceeded", message: "Troppi tentativi. Richiedi un nuovo codice." }, { status: 429 });
  }

  // Bump attempt counter always — defends against brute force even on miss
  const nextAttempts = row.attempts + 1;
  await sb.from("auth_otp_codes").update({ attempts: nextAttempts }).eq("id", row.id);

  const isMatch = hashCode(code) === row.code_hash;
  if (!isMatch) {
    const remaining = MAX_ATTEMPTS - nextAttempts;
    return NextResponse.json(
      { error: "invalid_code", attempts_remaining: Math.max(0, remaining) },
      { status: 401 },
    );
  }

  // Match! Mark verified
  await sb.from("auth_otp_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", row.id);

  // If the caller is authenticated, update users.phone + phone_verified_at.
  // Otherwise the verified phone is associated by the onboarding finalize endpoint.
  let updatedUserId: string | null = null;
  try {
    const userSb = await createClient();
    const { data: { user } } = await userSb.auth.getUser();
    if (user) {
      await sb.from("users").update({
        phone,
        phone_verified_at: new Date().toISOString(),
      }).eq("id", user.id);
      updatedUserId = user.id;
    }
  } catch {
    // Anon flow — verification is tracked by phone alone, finalized at signup
  }

  return NextResponse.json({
    verified: true,
    phone,
    purpose: row.purpose,
    user_updated: updatedUserId,
  });
}
