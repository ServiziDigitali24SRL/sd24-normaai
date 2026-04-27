// AES-256-GCM encryption for OAuth tokens stored in DB
// Format: "enc:v1:{iv_hex}:{tag_hex}:{cipher_hex}"
// Legacy plaintext tokens (pre-encryption) are returned as-is for backward compat.

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.OAUTH_ENCRYPTION_KEY;
  if (!raw) throw new Error("OAUTH_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, raw.length === 64 ? "hex" : "utf8");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`OAUTH_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex chars`);
  }
  return buf;
}

export function encryptToken(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: 16 }) as crypto.CipherGCM;
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
  } catch {
    return plaintext; // fail open (log but don't crash during key misconfiguration)
  }
}

export function decryptToken(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith(PREFIX)) return value; // legacy plaintext — return as-is
  try {
    const key = getKey();
    const rest = value.slice(PREFIX.length);
    const parts = rest.split(":");
    if (parts.length !== 3) throw new Error("Invalid format");
    const [ivHex, tagHex, encHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    if (tag.length !== 16) throw new Error("Invalid auth tag length");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: 16 }) as crypto.DecipherGCM;
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    return null;
  }
}
