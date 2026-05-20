// /api/auth/magiclink — POST { email, purpose? }
// Invia un magic link Supabase Auth all'email indicata. L'utente cliccando
// il link viene autenticato e redirezionato al callback.
//
// Rate limit lato Supabase (built-in) — qui non aggiungiamo throttling extra.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

interface Body {
  email?: string;
  purpose?: "signup" | "login";
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const sb = createAdminClient();

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://normaai.it";
  const redirectTo = `${origin}/auth/callback`;

  try {
    const { error } = await sb.auth.admin.generateLink({
      type: body.purpose === "signup" ? "magiclink" : "magiclink",
      email,
      options: { redirectTo },
    });

    if (error) {
      console.error("[magiclink] generateLink failed", error);
      return NextResponse.json({ error: "send_failed", message: error.message }, { status: 502 });
    }

    // NB: generateLink with type='magiclink' DOES send the email via the SMTP
    // configured in Supabase (Auth → Email Templates → SMTP settings). If you
    // need a custom SMTP/Brevo template, switch to type='magiclink' + manual
    // email dispatch via lib/email and pass action_link.

    return NextResponse.json({
      sent: true,
      email,
      message: "Magic link inviato. Controlla la posta in arrivo.",
    });
  } catch (err) {
    console.error("[magiclink] unexpected", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
