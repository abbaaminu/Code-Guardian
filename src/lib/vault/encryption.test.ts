import { describe, expect, it, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "./encryption";

beforeAll(() => {
  process.env.VAULT_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("vault encryption", () => {
  it("round-trips a secret through encrypt/decrypt", () => {
    const token = "ghp_aVeryRealisticLookingPersonalAccessToken1234567890";
    const encrypted = encryptSecret(token);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it("throws instead of silently returning garbage when the auth tag is tampered with", () => {
    const encrypted = encryptSecret("sensitive-value");
    const tampered = { ...encrypted, authTag: encryptSecret("other").authTag };
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws a clear error when VAULT_ENCRYPTION_KEY is missing", () => {
    const saved = process.env.VAULT_ENCRYPTION_KEY;
    delete process.env.VAULT_ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow(/VAULT_ENCRYPTION_KEY/);
    process.env.VAULT_ENCRYPTION_KEY = saved;
  });
});
