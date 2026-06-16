// POST /api/invest-lead — Lead investitori/incubatori dal form gated Business Plan.
//   Inserisce in `invest_leads` (service role) e ritorna l'URL del BP da scaricare.
//   Route pubblica (vedi isPublicApiRoute nel middleware).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const BP_URL = "/pitch/bp/NormaAI-Business-Plan-2026.pdf";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  // Honeypot anti-bot: se compilato, fingiamo successo senza salvare.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, bpUrl: BP_URL });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const organization = body.organization ? String(body.organization).trim() : null;
  const role = body.role ? String(body.role).trim() : null;
  const message = body.message ? String(body.message).trim() : null;

  if (name.length < 2) {
    return NextResponse.json({ error: "Inserisci il tuo nome" }, { status: 422 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email non valida" }, { status: 422 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("invest_leads").insert({
      name,
      email,
      organization,
      role,
      message,
      source: "pitch_bp_form",
      user_agent: req.headers.get("user-agent") ?? null,
    });

    if (error) {
      console.error("[invest-lead] insert error:", error.message);
      return NextResponse.json({ error: "Errore nel salvataggio" }, { status: 500 });
    }
  } catch (e) {
    console.error("[invest-lead] unexpected:", e);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bpUrl: BP_URL });
}
