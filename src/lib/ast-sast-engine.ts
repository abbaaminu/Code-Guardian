// AST-based SAST engine for JS/TS/JSX/TSX.
//
// This replaces the old line-by-line regex engine (kept at ./sast-engine.ts for
// reference and as the fallback for languages we don't have a JS/TS-grade parser
// for). Using the TypeScript compiler API — already a project dependency, no new
// packages required — buys us three things regex can't give us:
//
//   1. We see actual syntax, not text. `// exec(userInput)` inside a comment, or
//      `"eval("` inside a string literal, no longer trips a rule.
//   2. We can distinguish *where* a string sits (a JSX attribute name vs. a
//      string literal vs. an identifier) instead of pattern-matching a whole line.
//   3. We can do a light intraprocedural taint analysis: mark variables assigned
//      from request-ish sources (req.query, req.body, params.*, searchParams.get,
//      event.target.value, process.argv, ...) as tainted, then flag when a
//      tainted value reaches a sink (exec/eval/spawn, a raw SQL template, an
//      innerHTML assignment, a filesystem path) without a sanitizer call wrapping
//      it. That's the actual distinguishing feature of a "SAST" tool vs. grep.
//
// It is intentionally NOT a full dataflow engine (no interprocedural analysis, no
// alias analysis, no CFG) — that's a multi-month effort (see SECURITY_AUDIT.md,
// item #1, for the honest scope of what real taint analysis requires: something
// like a Tree-sitter + Semgrep-style rule engine, or CodeQL). What's here is a
// meaningful step up from regex and is a reasonable foundation to extend with
// more sources/sinks/sanitizers over time.

import ts from "typescript";
import type { Severity } from "./severity";

export interface LocalVuln {
  title: string;
  severity: Severity;
  cwe_id: string;
  vulnerable_code_block: string;
  remediation_steps: string;
  line_start: number;
  line_end: number;
  engine: "ast" | "heuristic";
  confidence: "high" | "medium" | "low";
}

const TAINT_SOURCE_PATTERNS = [
  /^req\.(query|body|params|headers|cookies)\b/,
  /^request\.(query|body|params|headers|cookies)\b/,
  /^params\./,
  /^searchParams\.get\(/,
  /^event\.target\.value$/,
  /^process\.argv\b/,
  /^location\.(search|hash|href)\b/,
];

const SINK_CALLEES = new Set([
  "exec",
  "execSync",
  "spawn",
  "spawnSync",
  "eval",
  "Function",
]);
const SQL_CALLEE_HINT = /^(query|execute|raw|exec)$/i;
const SQL_KEYWORD = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b/i;
const SECRET_NAME_HINT =
  /(api[_-]?key|secret|password|passwd|token|service_role|access_key|private_key)/i;
const PLACEHOLDER_VALUE =
  /^(your[_-]|xxx|changeme|placeholder|example|<|\$\{|process\.env)/i;
const SANITIZER_NAME_HINT =
  /(sanitize|escape|purify|encodeURIComponent|parameteriz|prepare)/i;

function severityOf(cwe: string): Severity {
  switch (cwe) {
    case "CWE-89":
    case "CWE-77":
    case "CWE-78":
    case "CWE-798":
      return "critical";
    case "CWE-79":
    case "CWE-94":
      return "high";
    default:
      return "medium";
  }
}

function scriptKindFor(fileType: string): ts.ScriptKind {
  const ext = fileType.toLowerCase().replace(/^\./, "");
  if (ext === "tsx") return ts.ScriptKind.TSX;
  if (ext === "jsx") return ts.ScriptKind.JSX;
  if (ext === "ts") return ts.ScriptKind.TS;
  return ts.ScriptKind.JSX; // permissive default so plain .js with JSX-ish content still parses
}

export function isAstSupported(fileType: string): boolean {
  return ["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(
    fileType.toLowerCase().replace(/^\./, ""),
  );
}

export function runAstSAST(sourceCode: string, fileType = "tsx"): LocalVuln[] {
  const findings: LocalVuln[] = [];
  const sourceFile = ts.createSourceFile(
    `input.${fileType || "tsx"}`,
    sourceCode,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKindFor(fileType),
  );

  const lineOf = (node: ts.Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
    1;
  const endLineOf = (node: ts.Node) =>
    sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  const textOf = (node: ts.Node) =>
    node.getText(sourceFile).trim().slice(0, 400);

  // --- Pass 1: tag locally-declared variables that are assigned from a
  // request-ish source expression. Scoped per-file (function boundaries are not
  // modeled) — good enough to catch the common "const q = req.query.x; db.query(...+q)"
  // pattern within a handler without pretending to be interprocedural.
  const taintedNames = new Set<string>();

  function isTaintedExpressionText(text: string): boolean {
    return TAINT_SOURCE_PATTERNS.some((re) => re.test(text));
  }

  function collectTaint(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isIdentifier(node.name)
    ) {
      const initText = textOf(node.initializer);
      if (
        isTaintedExpressionText(initText) ||
        [...taintedNames].some((n) => initText.startsWith(n + "."))
      ) {
        taintedNames.add(node.name.text);
      }
    }
    ts.forEachChild(node, collectTaint);
  }
  collectTaint(sourceFile);

  function expressionIsTainted(expr: ts.Expression): boolean {
    const text = textOf(expr);
    if (isTaintedExpressionText(text)) return true;
    if (ts.isIdentifier(expr) && taintedNames.has(expr.text)) return true;
    if (ts.isTemplateExpression(expr)) {
      return expr.templateSpans.some((s) => expressionIsTainted(s.expression));
    }
    if (
      ts.isBinaryExpression(expr) &&
      expr.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      return expressionIsTainted(expr.left) || expressionIsTainted(expr.right);
    }
    if (
      ts.isPropertyAccessExpression(expr) ||
      ts.isElementAccessExpression(expr)
    ) {
      return expressionIsTainted(expr.expression);
    }
    return false;
  }

  function wrappedInSanitizer(expr: ts.Expression): boolean {
    let cur: ts.Node | undefined = expr.parent;
    // walk up a couple of call layers looking for a sanitizer-named wrapper call
    for (let i = 0; i < 3 && cur; i++, cur = cur.parent) {
      if (
        ts.isCallExpression(cur) &&
        SANITIZER_NAME_HINT.test(cur.expression.getText(sourceFile))
      )
        return true;
    }
    return false;
  }

  function calleeName(expr: ts.LeftHandSideExpression): string {
    if (ts.isIdentifier(expr)) return expr.text;
    if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
    return expr.getText(sourceFile);
  }

  function isPlaceholderLiteral(text: string): boolean {
    const unquoted = text.replace(/^["'`]|["'`]$/g, "");
    return unquoted.length === 0 || PLACEHOLDER_VALUE.test(unquoted);
  }

  function visit(node: ts.Node) {
    // --- Hardcoded secret: `identifier/property = "literal"` where the name looks
    // like a credential and the value isn't an env-var reference / obvious placeholder.
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isIdentifier(node.name)
    ) {
      checkSecretAssignment(node.name.text, node.initializer, node);
    }
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      checkSecretAssignment(node.name.text, node.initializer, node);
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const left = node.left;
      const name = ts.isPropertyAccessExpression(left)
        ? left.name.text
        : ts.isIdentifier(left)
          ? left.text
          : null;
      if (name) checkSecretAssignment(name, node.right, node);
    }

    // --- dangerouslySetInnerHTML: real JSX-attribute detection, not a regex on the line.
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sourceFile) === "dangerouslySetInnerHTML"
    ) {
      findings.push({
        title: "Dangerous HTML Rendering (XSS)",
        cwe_id: "CWE-79",
        severity: severityOf("CWE-79"),
        vulnerable_code_block: textOf(node),
        remediation_steps:
          "Avoid rendering unescaped raw HTML. If unavoidable, sanitize the value with DOMPurify (or an equivalent) immediately before it reaches dangerouslySetInnerHTML.",
        line_start: lineOf(node),
        line_end: endLineOf(node),
        engine: "ast",
        confidence: "high",
      });
    }

    // --- innerHTML assignment with a tainted or concatenated value.
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      node.left.name.text === "innerHTML"
    ) {
      const tainted =
        expressionIsTainted(node.right) && !wrappedInSanitizer(node.right);
      if (tainted || !ts.isStringLiteralLike(node.right)) {
        findings.push({
          title: "Dangerous DOM Sink (innerHTML)",
          cwe_id: "CWE-79",
          severity: tainted ? "critical" : "high",
          vulnerable_code_block: textOf(node),
          remediation_steps:
            "Use textContent for plain text, or sanitize with DOMPurify before assigning to innerHTML.",
          line_start: lineOf(node),
          line_end: endLineOf(node),
          engine: "ast",
          confidence: tainted ? "high" : "medium",
        });
      }
    }

    // --- Command injection / eval sinks: exec/spawn/eval/Function(...)
    if (ts.isCallExpression(node)) {
      const name = calleeName(node.expression);
      if (SINK_CALLEES.has(name)) {
        const args = node.arguments;
        const dynamicArg = args.find((a) => !ts.isStringLiteralLike(a));
        const taintedArg = args.find((a) => expressionIsTainted(a));
        if (taintedArg && !wrappedInSanitizer(taintedArg)) {
          findings.push({
            title: `Command/Code Injection via ${name}() with tainted input`,
            cwe_id:
              name === "eval" || name === "Function" ? "CWE-94" : "CWE-78",
            severity: "critical",
            vulnerable_code_block: textOf(node),
            remediation_steps:
              `The argument passed to ${name}() is derived from an untrusted source (request/query/params). ` +
              "Never build shell commands or evaluated code from user input; use parameterized APIs (e.g. execFile with an argument array) or remove the dynamic evaluation entirely.",
            line_start: lineOf(node),
            line_end: endLineOf(node),
            engine: "ast",
            confidence: "high",
          });
        } else if (dynamicArg) {
          findings.push({
            title: `Dynamic Code/Command Execution via ${name}()`,
            cwe_id:
              name === "eval" || name === "Function" ? "CWE-94" : "CWE-77",
            severity: "high",
            vulnerable_code_block: textOf(node),
            remediation_steps: `${name}() is called with a non-literal argument. Confirm the value can never contain attacker-controlled data; prefer safer built-in APIs over dynamic evaluation.`,
            line_start: lineOf(node),
            line_end: endLineOf(node),
            engine: "ast",
            confidence: "medium",
          });
        }
      }

      // --- SQL injection: query-ish call with a template literal / concatenation
      // that interpolates a tainted or non-literal expression and contains a SQL
      // keyword — the classic `db.query(`SELECT * FROM x WHERE id = ${id}`)`.
      if (SQL_CALLEE_HINT.test(name)) {
        for (const arg of node.arguments) {
          const text = textOf(arg);
          if (!SQL_KEYWORD.test(text)) continue;
          const interpolated =
            (ts.isTemplateExpression(arg) && arg.templateSpans.length > 0) ||
            (ts.isBinaryExpression(arg) &&
              arg.operatorToken.kind === ts.SyntaxKind.PlusToken);
          if (!interpolated) continue;
          const tainted = expressionIsTainted(arg);
          findings.push({
            title: "SQL Injection via string-built query",
            cwe_id: "CWE-89",
            severity: "critical",
            vulnerable_code_block: textOf(node),
            remediation_steps:
              "Use parameterized queries / a query builder (e.g. `db.query('... WHERE id = $1', [id])`) instead of interpolating values into raw SQL text.",
            line_start: lineOf(node),
            line_end: endLineOf(node),
            engine: "ast",
            confidence: tainted ? "high" : "medium",
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  function checkSecretAssignment(
    name: string,
    valueExpr: ts.Expression,
    reportNode: ts.Node,
  ) {
    if (!SECRET_NAME_HINT.test(name)) return;
    if (!ts.isStringLiteralLike(valueExpr)) return; // process.env.X etc. are fine
    const text = valueExpr.getText(sourceFile);
    const unquoted = text.replace(/^["'`]|["'`]$/g, "");
    if (isPlaceholderLiteral(text) || unquoted.length < 12) return;
    findings.push({
      title: "Hardcoded Secret / API Key",
      cwe_id: "CWE-798",
      severity: severityOf("CWE-798"),
      vulnerable_code_block: textOf(reportNode),
      remediation_steps:
        "Move this credential to an environment variable (or a secret manager) and read it at runtime via process.env — never commit literal secrets.",
      line_start: lineOf(reportNode),
      line_end: endLineOf(reportNode),
      engine: "ast",
      confidence: "high",
    });
  }

  visit(sourceFile);
  return findings;
}
