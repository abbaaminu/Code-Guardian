import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader) return false;

  const fields = new Map(
    signatureHeader.split(";").map((part) => {
      const separator = part.indexOf("=");
      return separator < 0
        ? [part.trim(), ""]
        : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
    }),
  );
  const timestamp = fields.get("ts");
  if (!timestamp || !/^\d+$/.test(timestamp)) return false;
  const timestampSeconds = Number(timestamp);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`)
    .digest();
  const signatures = signatureHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("h1="))
    .map((part) => part.slice(3))
    .filter((signature) => /^[a-f\d]{64}$/i.test(signature));
  return signatures.some((signature) => {
    const supplied = Buffer.from(signature, "hex");
    return (
      supplied.length === expected.length && timingSafeEqual(expected, supplied)
    );
  });
}
