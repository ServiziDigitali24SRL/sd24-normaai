/**
 * vault.ts — Token resolution utility
 *
 * Gestisce due strategie di storage token OAuth:
 * 1. Supabase Vault (vault_*_id) — token migrati con migration 013
 * 2. AES-256-GCM applicativo (enc:v1:...) — token scritti dai callback OAuth
 *
 * Le READ routes usano resolveOAuthToken().
 * Le WRITE routes (on refresh) usano updateOAuthToken().
 */

import { decryptToken, encryptToken } from "@/lib/oauth-crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

/** Legge il token reale da vault o da colonna cifrata AES-256 */
export async function resolveOAuthToken(
  admin: AdminClient,
  vaultId: string | null | undefined,
  encryptedValue: string | null | undefined
): Promise<string | null> {
  // Strategia 1: Supabase Vault
  if (vaultId) {
    try {
      const { data } = await admin
        .schema("vault")
        .from("decrypted_secrets")
        .select("decrypted_secret")
        .eq("id", vaultId)
        .single();
      return (data as { decrypted_secret: string } | null)?.decrypted_secret ?? null;
    } catch {
      return null;
    }
  }

  // Strategia 2: AES-256 applicativo (enc:v1:...)
  if (encryptedValue && encryptedValue !== "[VAULT]") {
    return decryptToken(encryptedValue);
  }

  return null;
}

/** Aggiorna il token (dopo refresh): se vault_id esiste → vault, altrimenti AES-256 */
export async function updateOAuthToken(
  admin: AdminClient,
  table: string,
  whereColumn: string,
  whereValue: string,
  vaultId: string | null | undefined,
  newAccessToken: string,
  extraFields?: Record<string, unknown>
): Promise<void> {
  if (vaultId) {
    // Aggiorna il secret nel Vault
    await admin.rpc("vault_update_secret", {
      secret_id: vaultId,
      new_secret: newAccessToken,
    }).throwOnError();

    // Aggiorna campi accessori nella tabella (expiry, updated_at)
    if (extraFields) {
      await admin.from(table).update(extraFields).eq(whereColumn, whereValue);
    }
  } else {
    // Aggiorna colonna cifrata AES-256
    await admin.from(table).update({
      access_token: encryptToken(newAccessToken),
      ...extraFields,
    }).eq(whereColumn, whereValue);
  }
}
