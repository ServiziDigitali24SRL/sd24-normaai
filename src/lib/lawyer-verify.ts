// NormaAI Lawyer Verification — provider-agnostic client.
//
// IMPORTANT: There is NO public API from CNF (Consiglio Nazionale Forense) or
// Cassa Forense to verify lawyer registration automatically. The practical
// options are:
//
//   1. Paid service (€0.50–2 per lookup): InfoCamere, Visure.it, ReView Italia
//      → set LAWYER_VERIFY_PROVIDER=infocamere + LAWYER_VERIFY_API_KEY
//   2. Manual admin verification (admin panel) → meta_admin
//   3. Stub (dev only): always returns verified=true → LAWYER_VERIFY_PROVIDER=stub_dev
//
// Default is stub_dev — explicit opt-in required for prod.
//
// All verification attempts are stored in `lawyer_verifications` table for
// audit (provider, raw response, status, timestamp). Even with stub, this
// gives admin visibility.

import { createAdminClient } from "@/lib/supabase-admin";

export type VerifyProvider = "stub_dev" | "cnf" | "cassa_forense" | "infocamere" | "manual_admin";

export interface VerifyInput {
  user_id: string;
  piva: string;
  foro: string;
  iscrizione_num?: string;
}

export interface VerifyResult {
  status: "verified" | "rejected" | "pending" | "error";
  provider: VerifyProvider;
  reason?: string;
  response_raw?: Record<string, unknown>;
}

const ACTIVE_PROVIDER = (process.env.LAWYER_VERIFY_PROVIDER ?? "stub_dev") as VerifyProvider;

/**
 * Run verification with the active provider and persist the result.
 * Returns the result so the caller can decide next steps (update lawyers row,
 * email user, etc.).
 */
export async function verifyLawyer(input: VerifyInput): Promise<VerifyResult> {
  let result: VerifyResult;

  switch (ACTIVE_PROVIDER) {
    case "stub_dev":
      result = await verifyStub(input);
      break;
    case "infocamere":
      result = await verifyInfocamere(input);
      break;
    case "manual_admin":
      result = { status: "pending", provider: "manual_admin", reason: "Awaiting admin review" };
      break;
    case "cnf":
    case "cassa_forense":
      // Not implemented yet — would require scraping or paid wrapper.
      result = { status: "pending", provider: ACTIVE_PROVIDER, reason: "Provider not yet integrated" };
      break;
    default:
      result = { status: "error", provider: ACTIVE_PROVIDER, reason: "Unknown provider" };
  }

  // Persist audit trail (idempotent — multiple attempts allowed)
  try {
    const sb = createAdminClient();
    await sb.from("lawyer_verifications").insert({
      user_id: input.user_id,
      provider: result.provider,
      piva: input.piva,
      foro: input.foro,
      iscrizione_num: input.iscrizione_num ?? null,
      status: result.status,
      response_raw: result.response_raw ?? null,
      error_message: result.status === "error" || result.status === "rejected" ? result.reason : null,
      verified_at: result.status === "verified" ? new Date().toISOString() : null,
    });

    // If verified, also update lawyers.verification_status
    if (result.status === "verified") {
      await sb.from("lawyers").update({
        verification_status: "verified",
        verified: true,
        verified_at: new Date().toISOString(),
      }).eq("user_id", input.user_id);
    } else if (result.status === "pending") {
      await sb.from("lawyers").update({
        verification_status: "pending",
      }).eq("user_id", input.user_id);
    } else if (result.status === "rejected") {
      await sb.from("lawyers").update({
        verification_status: "rejected",
        verified: false,
      }).eq("user_id", input.user_id);
    }
  } catch (err) {
    console.error("[verifyLawyer] persist failed", err);
  }

  return result;
}

// ─── Stub provider ─────────────────────────────────────────────────────────
async function verifyStub(input: VerifyInput): Promise<VerifyResult> {
  // Quick sanity checks even in stub: P.IVA = 11 digits, foro non-empty
  const pivaClean = (input.piva ?? "").replace(/\D/g, "");
  if (pivaClean.length !== 11) {
    return { status: "rejected", provider: "stub_dev", reason: "P.IVA non valida (11 cifre richieste)" };
  }
  if (!input.foro?.trim()) {
    return { status: "rejected", provider: "stub_dev", reason: "Foro mancante" };
  }
  return {
    status: "verified",
    provider: "stub_dev",
    reason: "DEV STUB — sempre verifica positivo. Sostituire con provider reale prima del lancio.",
    response_raw: { stub: true, piva: pivaClean, foro: input.foro },
  };
}

// ─── InfoCamere provider (placeholder, requires API key + integration) ─────
async function verifyInfocamere(input: VerifyInput): Promise<VerifyResult> {
  const apiKey = process.env.LAWYER_VERIFY_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      provider: "infocamere",
      reason: "LAWYER_VERIFY_API_KEY not configured",
    };
  }

  // TODO: real implementation. InfoCamere wraps Registro Imprese — does not
  // cover lawyer-specific data (CNF iscrizione). For full albo coverage we
  // need a dedicated wrapper (Visure.it has one for €1.5 per lookup).
  // Returning pending here so the caller knows manual review is required.
  return {
    status: "pending",
    provider: "infocamere",
    reason: "InfoCamere integration TODO — manual review queued",
    response_raw: { piva: input.piva, todo: "implement" },
  };
}
