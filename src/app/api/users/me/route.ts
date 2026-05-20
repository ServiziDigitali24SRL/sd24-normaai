// /api/users/me — GET current user profile. Returns 401 if not authenticated.
// Used by /lead/new to prefill the contact form and by /impostazioni to render.
//
// PATCH updates user preferences and profile fields (whitelisted columns only).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { data: profile } = await sb
    .from("users")
    .select("id, email, first_name, last_name, phone, phone_verified_at, email_verified_at, cap, citta, comune, regione, citizenship_type, preferred_lang, preferred_voice_lang, preferred_orb_color, role")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    ...profile,
  });
}

// Whitelist of patchable columns. Verified fields (phone_verified_at,
// email_verified_at) are NOT in this list — they can only be set by the OTP
// verify endpoint and the Supabase auth callback respectively.
const PATCHABLE = new Set([
  "first_name", "last_name", "phone",
  "cap", "citta", "comune", "regione",
  "citizenship_type",
  "preferred_lang", "preferred_voice_lang", "preferred_orb_color",
]);

const ENUM_VALIDATORS: Record<string, (v: unknown) => boolean> = {
  citizenship_type: (v) => v === null || v === "" || ["italiano", "turista", "straniero_residente"].includes(String(v)),
  preferred_lang: (v) => ["it", "en"].includes(String(v)),
  preferred_voice_lang: (v) => ["it","en","es","ar","ro","zh","uk","bn","de","fr","ja"].includes(String(v)),
  preferred_orb_color: (v) => ["vermiglio", "alloro", "ambra", "blu"].includes(String(v)),
};

export async function PATCH(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!PATCHABLE.has(k)) continue;
    const validator = ENUM_VALIDATORS[k];
    if (validator && !validator(v)) {
      return NextResponse.json({ error: "invalid_value", field: k }, { status: 400 });
    }
    // Treat empty strings as NULL for nullable text columns
    patch[k] = v === "" ? null : v;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ updated: false, message: "Nessun campo da aggiornare" });
  }

  const { error } = await sb.from("users").update(patch).eq("id", user.id);
  if (error) {
    console.error("[users/me PATCH] update failed", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ updated: true, fields: Object.keys(patch) });
}
