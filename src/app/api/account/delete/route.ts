import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Token non valido" }, { status: 401 });
    }

    const userId = user.id;
    const now = new Date().toISOString();

    // 1. Soft-delete profile (mark deleted_at, anonymize PII)
    await supabaseAdmin.from("profiles").update({
      deleted_at: now,
      full_name: "[ELIMINATO]",
      updated_at: now,
    }).eq("id", userId);

    // 2. Anonymize queries (GDPR art. 17 — right to erasure)
    await supabaseAdmin.from("queries").update({
      user_id: null,
      question: "[ELIMINATO]",
      answer: "[ELIMINATO]",
    }).eq("user_id", userId);

    // 3. Log DSAR request
    await supabaseAdmin.from("dsar_requests").insert({
      user_id: userId,
      request_type: "delete",
      requested_at: now,
      status: "completed",
      ip_address: req.headers.get("x-forwarded-for") ?? "unknown",
    }).throwOnError();

    // 4. Delete auth user (hard delete from Supabase Auth)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return NextResponse.json(
        { error: "Errore durante l'eliminazione dell'account." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Account eliminato con successo." });
  } catch (err) {
    console.error("DELETE account error:", err);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}
