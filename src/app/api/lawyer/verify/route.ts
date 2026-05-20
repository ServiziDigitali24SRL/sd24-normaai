// /api/lawyer/verify — POST { piva, foro, iscrizione_num? }
// Triggers verification with the active provider (env LAWYER_VERIFY_PROVIDER).
// Persists audit row in lawyer_verifications + updates lawyers.verification_status.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { verifyLawyer } from "@/lib/lawyer-verify";

export const dynamic = "force-dynamic";

interface Body {
  piva?: string;
  foro?: string;
  iscrizione_num?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.piva || !body.foro) {
    return NextResponse.json({ error: "missing_fields", required: ["piva", "foro"] }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  // Ensure lawyer row exists (created during onboarding); upsert minimal fields.
  await supabase.from("lawyers").upsert({
    user_id: user.id,
    p_iva: body.piva,
    foro: body.foro,
    city: "ND",                                  // filled later if missing
    specializzazioni: ["Lavoro"],                // placeholder min 1, user updates later
    iscrizione_num: body.iscrizione_num ?? null,
    verification_status: "pending",
  }, { onConflict: "user_id" });

  const result = await verifyLawyer({
    user_id: user.id,
    piva: body.piva,
    foro: body.foro,
    iscrizione_num: body.iscrizione_num,
  });

  return NextResponse.json({
    status: result.status,
    provider: result.provider,
    reason: result.reason,
  }, {
    status: result.status === "verified" ? 200
          : result.status === "pending"  ? 202
          : result.status === "rejected" ? 422
          : 500,
  });
}
