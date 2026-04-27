/**
 * scripts/reencrypt-oauth-tokens.ts
 *
 * Re-encrypts all OAuth tokens in `connectors_tokens` from an old key to a new key.
 * Used when rotating OAUTH_ENC_KEY (e.g. after a suspected key compromise).
 *
 * USAGE:
 *   # Dry run — prints how many tokens would be updated, touches nothing:
 *   OLD_OAUTH_ENC_KEY=<old_hex_key> OAUTH_ENC_KEY=<new_hex_key> \
 *     SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
 *     npx tsx scripts/reencrypt-oauth-tokens.ts --dry-run
 *
 *   # Live run — actually updates the DB:
 *   OLD_OAUTH_ENC_KEY=<old_hex_key> OAUTH_ENC_KEY=<new_hex_key> \
 *     SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> \
 *     npx tsx scripts/reencrypt-oauth-tokens.ts
 *
 * REQUIREMENTS:
 *   - OLD_OAUTH_ENC_KEY: 64-char hex key used to encrypt existing tokens
 *   - OAUTH_ENC_KEY: 64-char hex key to encrypt tokens with (new key)
 *   - SUPABASE_URL: Supabase project URL (NEXT_PUBLIC_SUPABASE_URL works too)
 *   - SUPABASE_SERVICE_ROLE_KEY: service role key with full table access
 *
 * SAFETY:
 *   - Always run --dry-run first to verify count
 *   - Script processes records in pages of 100 to avoid memory issues
 *   - Errors on individual rows are logged but do not abort the whole run
 *   - A row is skipped (not re-encrypted) if decryption with OLD key fails
 */

import crypto from "crypto";

// ── AES-256-GCM helpers ───────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // bytes
const IV_LENGTH = 12;  // bytes
const PREFIX = "enc:v1:";

function parseKey(envVar: string, label: string): Buffer {
  const raw = process.env[envVar];
  if (!raw) throw new Error(`${envVar} is not set`);
  const buf = Buffer.from(raw, raw.length === 64 ? "hex" : "utf8");
  if (buf.length !== KEY_LENGTH) throw new Error(`${label} must be ${KEY_LENGTH * 2} hex chars`);
  return buf;
}

function decryptWithKey(value: string, key: Buffer): string | null {
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext — return as-is
  const rest = value.slice(PREFIX.length);
  const parts = rest.split(":");
  if (parts.length !== 3) return null;
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  if (tag.length !== 16) return null;
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: 16 }) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: 16 }) as crypto.CipherGCM;
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

// ── Supabase REST helpers ─────────────────────────────────────────────────────

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

interface TokenRow {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
}

async function fetchPage(offset: number, limit: number): Promise<TokenRow[]> {
  const url = `${SUPABASE_URL}/rest/v1/connectors_tokens?select=id,access_token,refresh_token&offset=${offset}&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Range: `${offset}-${offset + limit - 1}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase fetch error: ${res.status} ${await res.text()}`);
  return res.json() as Promise<TokenRow[]>;
}

async function updateRow(id: string, payload: Partial<Pick<TokenRow, "access_token" | "refresh_token">>): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/connectors_tokens?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Supabase update error for id=${id}: ${res.status} ${await res.text()}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  const oldKey = parseKey("OLD_OAUTH_ENC_KEY", "OLD_OAUTH_ENC_KEY");
  const newKey = parseKey("OAUTH_ENC_KEY", "OAUTH_ENC_KEY");

  console.log(`[reencrypt] mode=${isDryRun ? "DRY-RUN" : "LIVE"}`);

  let offset = 0;
  const PAGE = 100;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  while (true) {
    const rows = await fetchPage(offset, PAGE);
    if (!rows.length) break;

    for (const row of rows) {
      totalProcessed++;
      const patch: Partial<Pick<TokenRow, "access_token" | "refresh_token">> = {};
      let needsUpdate = false;

      for (const field of ["access_token", "refresh_token"] as const) {
        const val = row[field];
        if (!val || !val.startsWith(PREFIX)) {
          // null or legacy plaintext — skip
          continue;
        }
        let plaintext: string | null;
        try {
          plaintext = decryptWithKey(val, oldKey);
        } catch {
          console.warn(`[reencrypt] WARN: id=${row.id} field=${field} — decryption failed, skipping`);
          totalErrors++;
          continue;
        }
        if (plaintext === null) {
          console.warn(`[reencrypt] WARN: id=${row.id} field=${field} — decryption returned null, skipping`);
          totalErrors++;
          continue;
        }
        patch[field] = encryptWithKey(plaintext, newKey);
        needsUpdate = true;
      }

      if (!needsUpdate) {
        totalSkipped++;
        continue;
      }

      if (isDryRun) {
        totalUpdated++;
        continue;
      }

      try {
        await updateRow(row.id, patch);
        totalUpdated++;
      } catch (err) {
        console.error(`[reencrypt] ERROR: id=${row.id} — ${(err as Error).message}`);
        totalErrors++;
      }
    }

    offset += rows.length;
    if (rows.length < PAGE) break;
  }

  console.log(`[reencrypt] done — processed=${totalProcessed} updated=${totalUpdated} skipped=${totalSkipped} errors=${totalErrors}`);
  if (isDryRun) {
    console.log(`[reencrypt] DRY-RUN: ${totalUpdated} token(s) would be re-encrypted. Run without --dry-run to apply.`);
  }
}

main().catch((err) => {
  console.error("[reencrypt] FATAL:", err);
  process.exit(1);
});
