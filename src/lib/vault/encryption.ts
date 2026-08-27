// AES-256-GCM encryption for repository access tokens at rest.
//
// SERVER-ONLY. This module uses node:crypto and must never be imported from a
// route file or *.functions.ts that ships to the client bundle (same rule as
// client.server.ts — see the comment there). Import it only from other
// *.server.ts modules or from inside a server function handler via a dynamic
// `await import(...)`.
//
// Key management: VAULT_ENCRYPTION_KEY must be a 32-byte key, base64-encoded
// (44 base64 chars). Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Store it in your secrets manager / Vercel environment variables — never in
// source control. Rotate it by re-encrypting all vault_secrets rows with a new
// key (decrypt with old, encrypt with new) during a maintenance window; this
// module doesn't do key-versioning for you, so track which key encrypted which
// row yourself if you expect to rotate (e.g. add a `key_version` column).

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce, the recommended size for GCM

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
}

function loadKey(): Buffer {
  const raw = process.env.VAULT_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Missing VAULT_ENCRYPTION_KEY. Generate one with `node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` and set it as a server-only environment variable.",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `VAULT_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM; got ${key.length}.`,
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): EncryptedPayload {
  const key = loadKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(payload: EncryptedPayload): string {
  const key = loadKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(), // throws if the auth tag doesn't match — tamper-evident by construction
  ]);
  return plaintext.toString("utf8");
}
