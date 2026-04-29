// SER-83: Field-level encryption PII — AES-256-GCM
// Chiave master da env var (Supabase Vault come backup key storage).
// Formato ciphertext: hex(iv_12b + tag_16b + ciphertext)
//
// Setup produzione:
//   1. Genera chiave: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//   2. Imposta su Vercel: PII_ENCRYPTION_KEY=<hex32bytes>
//   3. Salva backup in Supabase Vault:
//      SELECT vault.create_secret('<hex32bytes>', 'pii_encryption_key', 'NormaAI PII field encryption');

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY_HEX = process.env.PII_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // GCM standard
const TAG_LENGTH = 16;  // GCM auth tag

// Versioning prefix per key rotation (incrementa quando cambia la chiave)
const KEY_VERSION = process.env.PII_KEY_VERSION ?? "v1";
const VERSION_PREFIX_LEN = 3; // "v1:" = 3 chars

/**
 * Ritorna true se la crittografia PII è abilitata (chiave configurata).
 */
export function isPiiEncryptionEnabled(): boolean {
  return !!KEY_HEX && KEY_HEX.length === 64;
}

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error("PII_ENCRYPTION_KEY non configurata o lunghezza errata (deve essere 32 bytes hex = 64 chars)");
  }
  return Buffer.from(KEY_HEX, "hex");
}

/**
 * Cifra un campo PII.
 * Input: stringa plaintext
 * Output: "v1:<hex(iv||tag||ciphertext)>" oppure null se encryption non abilitata
 */
export function encryptPii(plaintext: string): string | null {
  if (!isPiiEncryptionEnabled()) return null;

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: iv(12) + tag(16) + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  return `${KEY_VERSION}:${combined.toString("hex")}`;
}

/**
 * Decifra un campo PII precedentemente cifrato.
 * Input: stringa nel formato "v1:<hex>"
 * Output: plaintext originale
 */
export function decryptPii(ciphertext: string): string {
  if (!ciphertext) return ciphertext;

  // Gestisci plaintext non cifrati (migrazione progressiva)
  if (!ciphertext.includes(":")) return ciphertext;

  const colonIdx = ciphertext.indexOf(":");
  const _version = ciphertext.slice(0, colonIdx);
  const hexData = ciphertext.slice(colonIdx + 1);

  const key = getKey();
  const data = Buffer.from(hexData, "hex");

  if (data.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Ciphertext troppo corto");
  }

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/**
 * Maschera un valore PII per logging/display (mostra solo primi/ultimi N chars).
 * Es: "mario.rossi@example.com" → "ma****@example.com"
 */
export function maskPii(value: string, visibleStart = 2, visibleEnd = 0): string {
  if (!value || value.length <= visibleStart + visibleEnd) return "***";
  const start = value.slice(0, visibleStart);
  const end = visibleEnd > 0 ? value.slice(-visibleEnd) : "";
  return `${start}${"*".repeat(Math.min(value.length - visibleStart - visibleEnd, 8))}${end}`;
}

/**
 * Calcola lo pseudonimo deterministico di un valore PII.
 * Utile per analytics senza esporre dati reali (es. userId → pseudoId).
 * NOTA: pseudonimizzazione != anonimizzazione (GDPR considerazione).
 */
export function pseudonymizePii(value: string, salt?: string): string {
  const { createHmac } = require("crypto") as typeof import("crypto");
  const hmacKey = salt ?? process.env.PII_PSEUDONYM_SALT ?? "normaai-pseudonym-salt";
  return createHmac("sha256", hmacKey).update(value).digest("hex").slice(0, 16);
}

/**
 * Batch encrypt: cifra più campi in un oggetto, ritorna oggetto con campi _enc aggiunti.
 * Es: batchEncryptFields({email: "a@b.c", name: "Mario"}, ["email"])
 *     → {email: "a@b.c", email_enc: "v1:...", name: "Mario"}
 */
export function batchEncryptFields<T extends Record<string, string | null | undefined>>(
  obj: T,
  fields: (keyof T)[]
): T & Record<string, string | null> {
  const result = { ...obj } as Record<string, string | null | undefined>;
  for (const field of fields) {
    const value = obj[field];
    if (value != null) {
      const encrypted = encryptPii(value);
      result[`${String(field)}_enc`] = encrypted;
    }
  }
  return result as T & Record<string, string | null>;
}
