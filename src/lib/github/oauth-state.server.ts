import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthStatePayload {
  userId: string;
  state: string;
  expiresAt: number;
}

export function createGitHubOAuthState(
  userId: string,
  secret: string,
): { state: string; cookieValue: string } {
  const state = randomBytes(32).toString("hex");
  const payload: OAuthStatePayload = {
    userId,
    state,
    expiresAt: Date.now() + STATE_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");
  return { state, cookieValue: `${encoded}.${signature}` };
}

export function verifyGitHubOAuthState(
  cookieValue: string | undefined,
  state: string | null,
  secret: string,
): string | null {
  if (!cookieValue || !state) return null;
  const separator = cookieValue.lastIndexOf(".");
  if (separator < 1) return null;

  const encoded = cookieValue.slice(0, separator);
  const suppliedSignature = Buffer.from(cookieValue.slice(separator + 1));
  const expectedSignature = Buffer.from(
    createHmac("sha256", secret).update(encoded).digest("base64url"),
  );
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as OAuthStatePayload;
    if (
      !payload.userId ||
      payload.state !== state ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      return null;
    }
    return payload.userId;
  } catch {
    return null;
  }
}
