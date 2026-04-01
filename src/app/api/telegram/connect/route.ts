import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { botToken } = await req.json();

  if (!botToken?.trim()) {
    return NextResponse.json(
      { error: "Bot Token obbligatorio" },
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

  // Verify token with Telegram Bot API
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken.trim()}/getMe`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Token non valido. Controlla il token ricevuto da @BotFather." },
        { status: 400 }
      );
    }

    const data = await res.json();
    if (!data.ok || !data.result) {
      return NextResponse.json(
        { error: "Risposta non valida da Telegram" },
        { status: 400 }
      );
    }

    const botUsername = data.result.username || data.result.first_name || "bot";

    // Save to Supabase using service role
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await admin
      .from("user_telegram_tokens")
      .upsert(
        {
          user_id: user.id,
          bot_token: botToken.trim(),
          bot_username: botUsername,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      console.error("Errore salvataggio token Telegram:", dbError);
      return NextResponse.json(
        { error: "Errore salvataggio credenziali" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, botUsername });
  } catch {
    return NextResponse.json(
      { error: "Errore di connessione a Telegram API" },
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

  await admin.from("user_telegram_tokens").delete().eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
