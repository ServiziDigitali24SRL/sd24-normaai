// /api/users/me/delete — POST: soft-delete dell'account corrente.
// Imposta users.deleted_at = NOW(). I dati restano per 30 giorni (retention
// configurable) per consentire ripristino. Hard-delete via cron separato.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const admin = createAdminClient();

  // Mark soft-deleted
  const { error: upErr } = await admin
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", user.id);

  if (upErr) {
    console.error("[users/me/delete] update failed", upErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // Revoke active sessions
  try {
    await admin.auth.admin.signOut(user.id, "global");
  } catch (e) {
    console.error("[users/me/delete] signOut failed (non-fatal)", e);
  }

  return NextResponse.json({
    deleted: true,
    user_id: user.id,
    message: "Account disattivato. Riattivabile entro 30 giorni contattando il supporto.",
  });
}
