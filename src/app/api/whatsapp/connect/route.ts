import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { phoneId, accessToken } = await req.json();

  if (!phoneId?.trim() || !accessToken?.trim()) {
    return NextResponse.json(
      { error: "Phone ID e Access Token sono obbligatori" },
      { status: 400 }
    );
  }

  // Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Verify token by calling Meta Cloud API
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId.trim()}`,
      {
        headers: { Authorization: `Bearer ${accessToken.trim()}` },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            err?.error?.message ||
            "Credenziali WhatsApp non valide. Controlla Phone ID e Access Token.",
        },
        { status: 400 }
      );
    }

    const data = await res.json();
    const phoneNumber =
      data.display_phone_number || data.verified_name || phoneId;

    // Save to Supabase using service role
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await admin.from("user_whatsapp_tokens").upsert(
      {
        user_id: user.id,
        phone_id: phoneId.trim(),
        access_token: accessToken.trim(),
        phone_number: phoneNumber,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (dbError) {
      console.error("Errore salvataggio token WhatsApp:", dbError);
      return NextResponse.json(
        { error: "Errore salvataggio credenziali" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, phone: phoneNumber });
  } catch {
    return NextResponse.json(
      { error: "Errore di connessione a Meta API" },
      { status: 502 }
    );
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await admin.from("user_whatsapp_tokens").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
