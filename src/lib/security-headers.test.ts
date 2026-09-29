import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Regression guard for the response headers in vercel.json — the single place
// where the app's Content-Security-Policy is enforced (nitro's Vercel preset
// emits `.vercel/output/config.json` with routes only, no headers, and no file
// under src/ sets a CSP).
//
// Why `script-src` must include 'unsafe-inline': TanStack Start's `<Scripts />`
// always renders inline scripts into the SSR shell — the router bootstrap IIFE
// and React Fizz's `$tsr` streaming-barrier chunk loader
// (`self.$_TSR = { h() { this.hydrated = true, ... } }`). With the previous
// `script-src 'self'`, Chrome refuses both ("Executing inline script violates
// the following Content Security Policy directive") and client hydration dies
// with an uncaught TypeError before the router boots.
//
// `'unsafe-eval'` is deliberately NOT granted: no client bundle calls eval() or
// new Function(), and leaving it out keeps string-to-code XSS blocked.
const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

type HeaderRule = {
  source?: string;
  headers?: { key?: string; value?: string }[];
};

const vercelConfig = JSON.parse(
  readFileSync(path.join(repoRoot, "vercel.json"), "utf8"),
) as { headers?: HeaderRule[] };

const headerRules = vercelConfig.headers ?? [];

function headerValue(key: string): string | undefined {
  return headerRules
    .flatMap((rule) => rule.headers ?? [])
    .filter((header) => header.key?.toLowerCase() === key.toLowerCase())
    .map((header) => header.value ?? "")
    .at(0);
}

/** Returns the raw `name ...` segment of a CSP directive, or "" if absent. */
function directive(name: string): string {
  return (
    (headerValue("Content-Security-Policy") ?? "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name} `)) ?? ""
  );
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((entry) => path.join(dir, entry))
    .filter(
      (file) =>
        /\.(ts|tsx)$/.test(file) &&
        !/\.test\.tsx?$/.test(file) &&
        statSync(file).isFile(),
    );
}

describe("vercel.json Content-Security-Policy", () => {
  it("is declared once, for every route", () => {
    const rulesWithCsp = headerRules.filter((rule) =>
      (rule.headers ?? []).some(
        (header) =>
          header.key?.toLowerCase() === "content-security-policy" &&
          Boolean(header.value),
      ),
    );

    expect(rulesWithCsp).toHaveLength(1);
    expect(rulesWithCsp[0]?.source).toBe("/(.*)");
  });

  it("lets the TanStack Start inline hydration scripts execute", () => {
    const scriptSrc = directive("script-src");

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("'unsafe-inline'");
  });

  it("still denies eval, wildcards and plaintext script origins", () => {
    const scriptSrc = directive("script-src");

    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("*");
    expect(scriptSrc).not.toMatch(/https?:(?!\/\/)/);
  });

  it("does not mix a nonce/hash into the static header", () => {
    // Browsers ignore 'unsafe-inline' as soon as a nonce or hash is present, so
    // a nonce migration has to mint per-request headers instead of amending
    // this static one — otherwise hydration silently breaks again.
    const csp = headerValue("Content-Security-Policy") ?? "";

    expect(csp).not.toMatch(/'nonce-/);
    expect(csp).not.toMatch(/'sha(256|384|512)-/);
  });

  it("keeps runtime-injected styles and the existing hardening intact", () => {
    // Tailwind + sonner/Radix inject <style> tags at runtime, so style-src
    // needs 'unsafe-inline' too.
    expect(directive("style-src")).toContain("'unsafe-inline'");
    expect(directive("default-src")).toBe("default-src 'self'");
    expect(directive("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive("object-src")).toBe("object-src 'none'");
    expect(directive("base-uri")).toBe("base-uri 'self'");
    expect(directive("form-action")).toBe("form-action 'self'");

    const connectSrc = directive("connect-src");
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain("https://*.supabase.co");
    expect(connectSrc).toContain("wss://*.supabase.co");
    expect(connectSrc).toContain("https://api.github.com");
    expect(connectSrc).toContain("https://raw.githubusercontent.com");

    expect(headerValue("X-Frame-Options")).toBe("DENY");
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("is not shadowed by a <meta http-equiv> CSP in app code", () => {
    // A meta CSP narrows the header (both must allow a script for it to run),
    // so the header above must stay the only source of truth. Only the
    // *emitting* forms count — a bare mention of the header name isn't one,
    // and test files are skipped entirely (see listSourceFiles).
    const metaCsp =
      /httpEquiv[\s\S]{0,40}content-security-policy|http-equiv[\s\S]{0,40}content-security-policy|content-security-policy[\s\S]{0,40}http-equiv/i;
    const offenders = listSourceFiles(path.join(repoRoot, "src")).filter(
      (file) => metaCsp.test(readFileSync(file, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
