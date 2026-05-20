// /api/onboarding/finalize — POST: finalizza l'onboarding creando l'utente
// Supabase (se non esiste già) + persiste tutti i campi profilo + se
// is_lawyer=true crea lawyers row e triggera verifica stub.
//
// Idempotent su email — se l'utente esiste già, aggiorna i campi mancanti.
//
// L'auth della session lato browser viene stabilita dal magic link che è
// stato inviato in step "email". Questa route resta callable anche se
// l'utente non è ancora loggato — usiamo admin client.

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { verifyLawyer } from "@/lib/lawyer-verify";

export const dynamic = "force-dynamic";

interface Body {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  cap?: string;
  citta?: string;
  regione?: string;
  citizenship_type?: "italiano" | "turista" | "straniero_residente";
  preferred_lang?: "it" | "en";
  preferred_voice_lang?: string;
  preferred_orb_color?: "vermiglio" | "alloro" | "ambra" | "blu";
  is_lawyer?: boolean;
  p_iva?: string;
  foro?: string;
  iscrizione_num?: string;
}

const VOICE_LANGS = ["it","en","es","ar","ro","zh","uk","bn","de","fr","ja"];

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Validation
  const email = (body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!body.first_name?.trim() || !body.last_name?.trim()) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }
  if (body.preferred_voice_lang && !VOICE_LANGS.includes(body.preferred_voice_lang)) {
    return NextResponse.json({ error: "invalid_voice_lang" }, { status: 400 });
  }
  if (body.preferred_orb_color && !["vermiglio","alloro","ambra","blu"].includes(body.preferred_orb_color)) {
    return NextResponse.json({ error: "invalid_orb_color" }, { status: 400 });
  }
  if (body.citizenship_type && !["italiano","turista","straniero_residente"].includes(body.citizenship_type)) {
    return NextResponse.json({ error: "invalid_citizenship_type" }, { status: 400 });
  }

  const sb = createAdminClient();

  // 1. Cerca user esistente per email (potrebbe essere stato creato da magic link)
  const { data: existingByEmail } = await sb
    .from("users")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  let userId: string;
  if (existingByEmail) {
    userId = existingByEmail.id;
  } else {
    // Crea via Supabase Auth admin (no password, conferma via magic link in flight)
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      email_confirm: false,        // attendiamo che l'utente clicchi il magic link
      phone: body.phone ?? undefined,
      user_metadata: { source: "onboarding_desktop" },
    });
    if (createErr || !created.user) {
      // Caso comune: email già registrata in auth.users ma non in public.users
      if (createErr?.message?.includes("already")) {
        // Recupera l'id da auth via lookup
        const { data: list } = await sb.auth.admin.listUsers();
        const existing = list?.users?.find(u => u.email === email);
        if (!existing) {
          return NextResponse.json({ error: "user_lookup_failed", detail: createErr.message }, { status: 500 });
        }
        userId = existing.id;
      } else {
        console.error("[finalize] createUser failed", createErr);
        return NextResponse.json({ error: "create_user_failed", detail: createErr?.message }, { status: 500 });
      }
    } else {
      userId = created.user.id;
    }
  }

  // 2. Upsert profilo
  const profilePatch = {
    id: userId,
    email,
    first_name: body.first_name?.trim(),
    last_name: body.last_name?.trim(),
    display_name: `${body.first_name?.trim() ?? ""} ${body.last_name?.trim() ?? ""}`.trim(),
    phone: body.phone ?? null,
    cap: body.cap ?? null,
    citta: body.citta ?? null,
    regione: body.regione ?? null,
    citizenship_type: body.citizenship_type ?? null,
    preferred_lang: body.preferred_lang ?? "it",
    preferred_voice_lang: body.preferred_voice_lang ?? "it",
    preferred_orb_color: body.preferred_orb_color ?? "vermiglio",
    role: body.is_lawyer ? "lawyer" : "user",
  };

  const { error: upsertErr } = await sb.from("users").upsert(profilePatch, { onConflict: "id" });
  if (upsertErr) {
    console.error("[finalize] users upsert failed", upsertErr);
    return NextResponse.json({ error: "profile_save_failed", detail: upsertErr.message }, { status: 500 });
  }

  // 3. Se avvocato: crea lawyers row + verifica stub
  let lawyer_verification: { status: string; provider: string; reason?: string } | null = null;
  if (body.is_lawyer && body.p_iva && body.foro) {
    await sb.from("lawyers").upsert({
      user_id: userId,
      p_iva: body.p_iva,
      foro: body.foro,
      iscrizione_num: body.iscrizione_num ?? null,
      city: body.citta ?? "ND",
      specializzazioni: ["Lavoro"],   // placeholder min 1 - aggiornabile da profilo dashboard
      verification_status: "pending",
    }, { onConflict: "user_id" });

    const result = await verifyLawyer({
      user_id: userId,
      piva: body.p_iva,
      foro: body.foro,
      iscrizione_num: body.iscrizione_num,
    });
    lawyer_verification = { status: result.status, provider: result.provider, reason: result.reason };
  }

  return NextResponse.json({
    finalized: true,
    user_id: userId,
    email,
    lawyer_verification,
    message: "Account creato. Controlla la mail per confermare via magic link e accedere.",
  });
}
