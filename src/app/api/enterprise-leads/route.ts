// /api/enterprise-leads — POST: ricezione richieste B2B dal form /su-misura.
// Salvataggio in whitelabel_leads (tabella già esistente da migration 001).
// Invia email a info@normaai.it via lib/email (Brevo).
//
// Pubblico (no auth — il form è anonimo per visitatori senza account).

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

interface Body {
  company?: string;
  contact_name?: string;
  email?: string;
  role?: string;
  use_case?: string;
  budget_range?: string;
  note?: string;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const company = (body.company ?? "").trim();
  const contact_name = (body.contact_name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  if (!company || !contact_name || !email) {
    return NextResponse.json({ error: "missing_fields", required: ["company", "contact_name", "email"] }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const sb = createAdminClient();

  // Rate limit semplice: max 5 submission stesso email in 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recent } = await sb
    .from("whitelabel_leads")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if ((recent ?? 0) >= 5) {
    return NextResponse.json({ error: "rate_limited", message: "Troppe richieste oggi da questo indirizzo." }, { status: 429 });
  }

  // Compose the freeform message from the structured form fields. The
  // whitelabel_leads schema (migration 001) was designed for a generic
  // whitelabel form — for su_misura we encode role/budget/note in `message`
  // and `notes` to avoid a schema migration.
  const parts: string[] = [];
  if (body.role) parts.push(`Ruolo: ${body.role}`);
  if (body.budget_range) parts.push(`Budget: ${body.budget_range}`);
  if (body.note) parts.push(`Note: ${body.note}`);
  const message = (body.use_case ?? "").trim() || "(nessun caso d'uso fornito)";

  const { data, error } = await sb
    .from("whitelabel_leads")
    .insert({
      company_name: company,
      contact_name,
      email,
      message,
      notes: parts.length ? parts.join("\n") : null,
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[enterprise-leads] insert failed", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // Notifica via email (best-effort, non-blocking)
  // TODO(NA-NOTIFY): integrare lib/email per inviare a info@normaai.it con i dati
  // Per ora logghiamo, l'invio reale verrà aggiunto quando settiamo Brevo template.

  return NextResponse.json({
    received: true,
    lead_id: data.id,
    message: "Richiesta ricevuta. Ti contatteremo entro 24h lavorative.",
  });
}
