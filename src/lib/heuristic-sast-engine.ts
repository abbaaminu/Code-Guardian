// Line-based heuristic fallback engine.
//
// This is what `sast-engine.ts` used to be, kept for languages we don't have an
// AST-grade parser wired up for yet (Python, Solidity, Go, Dockerfiles, shell,
// etc). For JS/TS/JSX/TSX, prefer `ast-sast-engine.ts` — it understands syntax
// instead of matching text and produces far fewer false positives.
//
// Findings from this engine are tagged `engine: "heuristic"` and a lower
// confidence so the UI/report can visually distinguish "the parser proved this"
// from "a pattern matched a line" — treat the latter as a lead to verify, not a
// certainty.

import type { Severity } from "./severity";
import type { LocalVuln } from "./ast-sast-engine";

interface HeuristicRule {
  title: string;
  cwe_id: string;
  severity: Severity;
  regex: RegExp;
  remediation: string;
}

const RULES: HeuristicRule[] = [
  {
    title: "Hardcoded Secret / API Key",
    cwe_id: "CWE-798",
    severity: "critical",
    // H2: the original `[a-zA-Z0-9_\-]{16,}` allowed the engine to backtrack
    // over every suffix length when the closing quote was absent, which is
    // quadratic on long strings. Bounding the secret length to {16,64} keeps
    // the scan linear-time.
    regex:
      /(?:api_key|secret|password|supabase_service_role|aws_access_key)\s*[:=]\s*["'][a-zA-Z0-9_-]{16,64}["']/i,
    remediation:
      "Migrate hardcoded credentials to secure environment variables. Inject them at runtime instead of committing literal values.",
  },
  {
    title: "Command Injection Exposure",
    cwe_id: "CWE-78",
    severity: "critical",
    // H2: `` `.*` `` in the original could backtrack quadratically on a long
    // line with many backticks. `[^`]*` is equivalent for this rule and scans
    // in linear time.
    regex:
      /(?<![a-zA-Z0-9_])(?:os\.system|subprocess\.call|subprocess\.Popen|exec|eval|`[^`]*`)\s*\(/i,
    remediation:
      "Replace dynamic shell execution with safer built-in APIs and strictly sanitize/parameterize all arguments.",
  },
  {
    title: "SQL built via string interpolation",
    cwe_id: "CWE-89",
    severity: "high",
    // H2 (ReDoS): the original `/.*(%s|f['"]|\.format\(|\+\s*\w+\s*\+)/`
    // combined a greedy `.*` with a trailing alternation, so on an interpolated
    // SQL line without a match the engine re-tested every alternative at every
    // suffix position — quadratic blowup on long inputs. Lazy `.*?` finds the
    // earliest alternative instead and is linear-time.
    regex:
      /(SELECT|INSERT|UPDATE|DELETE)\b.*?(%s|f['"]|\.format\(|\+\s*\w+\s*\+)/i,
    remediation:
      "Use parameterized queries instead of building SQL text via string interpolation or concatenation.",
  },
  {
    title: "Insecure Deserialization",
    cwe_id: "CWE-502",
    severity: "high",
    regex: /\b(pickle\.loads|yaml\.load\()\s*\(/,
    remediation:
      "Use safe loaders (yaml.safe_load) or avoid deserializing untrusted input entirely.",
  },
  {
    title: "Overly permissive container user",
    cwe_id: "CWE-269",
    severity: "medium",
    regex: /^\s*USER\s+root\s*$/i,
    remediation:
      "Run the container as a non-root user; add a dedicated USER directive before the entrypoint.",
  },
];

// Defense-in-depth (H2): the rule regexes above are all linear-time now, but
// don't even run them against absurdly long single lines (e.g. pasted minified
// bundles). Everything shorter still gets the full scan.
const MAX_SCAN_LINE_LENGTH = 100_000;

export function runHeuristicSAST(sourceCode: string): LocalVuln[] {
  const lines = sourceCode.split("\n");
  const findings: LocalVuln[] = [];

  lines.forEach((line, index) => {
    if (line.length > MAX_SCAN_LINE_LENGTH) return;

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return;

    for (const rule of RULES) {
      if (rule.regex.test(line)) {
        findings.push({
          title: rule.title,
          cwe_id: rule.cwe_id,
          severity: rule.severity,
          vulnerable_code_block: trimmed.slice(0, 400),
          remediation_steps: rule.remediation,
          line_start: index + 1,
          line_end: index + 1,
          engine: "heuristic",
          confidence: "low",
        });
      }
    }
  });

  return findings;
}
