import { describe, expect, it } from "vitest";
import { runAstSAST } from "./ast-sast-engine";

describe("runAstSAST — false-positive avoidance (the whole point of moving off regex)", () => {
  it("does not flag eval() mentioned inside a comment", () => {
    const findings = runAstSAST(`// avoid eval(userInput) like the plague\nconst x = 1;`, "ts");
    expect(findings).toHaveLength(0);
  });

  it("does not flag eval() mentioned inside a string literal", () => {
    const findings = runAstSAST(`const msg = "never call eval() on untrusted input";`, "ts");
    expect(findings).toHaveLength(0);
  });

  it("does not flag a placeholder secret value", () => {
    const findings = runAstSAST(`const apiKey = "your_api_key_here_1234567890";`, "ts");
    expect(findings.filter((f) => f.cwe_id === "CWE-798")).toHaveLength(0);
  });

  it("does not flag a secret read from process.env", () => {
    const findings = runAstSAST(`const apiKey = process.env.STRIPE_SECRET_KEY;`, "ts");
    expect(findings.filter((f) => f.cwe_id === "CWE-798")).toHaveLength(0);
  });
});

describe("runAstSAST — real detections", () => {
  it("flags a hardcoded secret literal", () => {
    const findings = runAstSAST(`const apiKey = "sk_live_abcdefghijklmnopqrstuvwx";`, "ts");
    expect(findings.some((f) => f.cwe_id === "CWE-798" && f.severity === "critical")).toBe(true);
  });

  it("flags dangerouslySetInnerHTML via real JSX-attribute detection", () => {
    const src = `function C({ html }) { return <div dangerouslySetInnerHTML={{ __html: html }} />; }`;
    const findings = runAstSAST(src, "tsx");
    expect(findings.some((f) => f.cwe_id === "CWE-79")).toBe(true);
  });

  it("flags exec() called with a tainted (req.query-derived) argument as critical", () => {
    const src = `
      function handler(req) {
        const cmd = req.query.cmd;
        exec(cmd);
      }
    `;
    const findings = runAstSAST(src, "ts");
    const hit = findings.find((f) => f.title.includes("exec"));
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("critical");
    expect(hit?.confidence).toBe("high");
  });

  it("flags exec() with a dynamic-but-not-provably-tainted argument at lower confidence", () => {
    const src = `function run(userLabel) { exec(userLabel); }`;
    const findings = runAstSAST(src, "ts");
    const hit = findings.find((f) => f.title.includes("exec"));
    expect(hit).toBeDefined();
    expect(hit?.confidence).not.toBe("high");
  });

  it("does not flag exec() called with a pure string literal", () => {
    const findings = runAstSAST(`exec("ls -la /tmp");`, "ts");
    expect(findings.some((f) => f.title.includes("exec"))).toBe(false);
  });

  it("flags SQL built via template-literal interpolation of a tainted value", () => {
    const src = `
      function handler(req) {
        const id = req.params.id;
        db.query(\`SELECT * FROM users WHERE id = \${id}\`);
      }
    `;
    const findings = runAstSAST(src, "ts");
    const hit = findings.find((f) => f.cwe_id === "CWE-89");
    expect(hit).toBeDefined();
    expect(hit?.confidence).toBe("high");
  });

  it("does not flag a fully static SQL string", () => {
    const findings = runAstSAST(`db.query("SELECT * FROM users WHERE active = true");`, "ts");
    expect(findings.some((f) => f.cwe_id === "CWE-89")).toBe(false);
  });

  it("flags a tainted value assigned to innerHTML", () => {
    const src = `
      function render(searchParams) {
        const q = searchParams.get("q");
        el.innerHTML = q;
      }
    `;
    const findings = runAstSAST(src, "ts");
    const hit = findings.find((f) => f.title.includes("innerHTML"));
    expect(hit).toBeDefined();
    expect(hit?.severity).toBe("critical");
  });

  it("does not flag a tainted value wrapped in a sanitizer before reaching a sink", () => {
    const src = `
      function handler(req) {
        const q = req.query.q;
        exec(sanitizeShellArg(q));
      }
    `;
    const findings = runAstSAST(src, "ts");
    const hit = findings.find((f) => f.title.includes("with tainted input"));
    expect(hit).toBeUndefined();
  });
});
