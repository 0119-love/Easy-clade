import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CONFIG_ENCRYPTION_KEY is not set -- required to store or read provider API keys / OAuth " +
        "tokens. Generate one with `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"` " +
        "and set it as an env var (never commit it).",
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("CONFIG_ENCRYPTION_KEY must be a 32-byte value, hex-encoded (64 hex characters).");
  }
  return key;
}

/** Encrypts a secret (provider API key, OAuth access/refresh token) for storage in a user's config.json. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/**
 * Decrypts a value written by encryptSecret. Values saved before encryption
 * was introduced have no "enc:v1:" prefix -- those are returned as-is so
 * configs written by earlier local dev sessions keep working; the next
 * writeConfig() call (lib/config/keysStore.ts) re-saves them encrypted.
 */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const [ivHex, authTagHex, ciphertextHex] = stored.slice(PREFIX.length).split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) return stored;
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}
