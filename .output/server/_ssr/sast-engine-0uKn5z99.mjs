import { o as __toESM } from "../_runtime.mjs";
import { t as require_typescript } from "../_libs/typescript+unenv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sast-engine-0uKn5z99.js
var import_typescript = /* @__PURE__ */ __toESM(require_typescript());
var TAINT_SOURCE_PATTERNS = [
	/^req\.(query|body|params|headers|cookies)\b/,
	/^request\.(query|body|params|headers|cookies)\b/,
	/^params\./,
	/^searchParams\.get\(/,
	/^event\.target\.value$/,
	/^process\.argv\b/,
	/^location\.(search|hash|href)\b/
];
var SINK_CALLEES = /* @__PURE__ */ new Set([
	"exec",
	"execSync",
	"spawn",
	"spawnSync",
	"eval",
	"Function"
]);
var SQL_CALLEE_HINT = /^(query|execute|raw|exec)$/i;
var SQL_KEYWORD = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b/i;
var SECRET_NAME_HINT = /(api[_-]?key|secret|password|passwd|token|service_role|access_key|private_key)/i;
var PLACEHOLDER_VALUE = /^(your[_-]|xxx|changeme|placeholder|example|<|\$\{|process\.env)/i;
var SANITIZER_NAME_HINT = /(sanitize|escape|purify|encodeURIComponent|parameteriz|prepare)/i;
function severityOf(cwe) {
	switch (cwe) {
		case "CWE-89":
		case "CWE-77":
		case "CWE-78":
		case "CWE-798": return "critical";
		case "CWE-79":
		case "CWE-94": return "high";
		default: return "medium";
	}
}
function scriptKindFor(fileType) {
	const ext = fileType.toLowerCase().replace(/^\./, "");
	if (ext === "tsx") return import_typescript.default.ScriptKind.TSX;
	if (ext === "jsx") return import_typescript.default.ScriptKind.JSX;
	if (ext === "ts") return import_typescript.default.ScriptKind.TS;
	return import_typescript.default.ScriptKind.JSX;
}
function isAstSupported(fileType) {
	return [
		"js",
		"jsx",
		"ts",
		"tsx",
		"mjs",
		"cjs"
	].includes(fileType.toLowerCase().replace(/^\./, ""));
}
function runAstSAST(sourceCode, fileType = "tsx") {
	const findings = [];
	const sourceFile = import_typescript.default.createSourceFile(`input.${fileType || "tsx"}`, sourceCode, import_typescript.default.ScriptTarget.Latest, true, scriptKindFor(fileType));
	const lineOf = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
	const endLineOf = (node) => sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
	const textOf = (node) => node.getText(sourceFile).trim().slice(0, 400);
	const taintedNames = /* @__PURE__ */ new Set();
	function isTaintedExpressionText(text) {
		return TAINT_SOURCE_PATTERNS.some((re) => re.test(text));
	}
	function collectTaint(node) {
		if (import_typescript.default.isVariableDeclaration(node) && node.initializer && import_typescript.default.isIdentifier(node.name)) {
			const initText = textOf(node.initializer);
			if (isTaintedExpressionText(initText) || [...taintedNames].some((n) => initText.startsWith(n + "."))) taintedNames.add(node.name.text);
		}
		import_typescript.default.forEachChild(node, collectTaint);
	}
	collectTaint(sourceFile);
	function expressionIsTainted(expr) {
		if (isTaintedExpressionText(textOf(expr))) return true;
		if (import_typescript.default.isIdentifier(expr) && taintedNames.has(expr.text)) return true;
		if (import_typescript.default.isTemplateExpression(expr)) return expr.templateSpans.some((s) => expressionIsTainted(s.expression));
		if (import_typescript.default.isBinaryExpression(expr) && expr.operatorToken.kind === import_typescript.default.SyntaxKind.PlusToken) return expressionIsTainted(expr.left) || expressionIsTainted(expr.right);
		if (import_typescript.default.isPropertyAccessExpression(expr) || import_typescript.default.isElementAccessExpression(expr)) return expressionIsTainted(expr.expression);
		return false;
	}
	function wrappedInSanitizer(expr) {
		let cur = expr.parent;
		for (let i = 0; i < 3 && cur; i++, cur = cur.parent) if (import_typescript.default.isCallExpression(cur) && SANITIZER_NAME_HINT.test(cur.expression.getText(sourceFile))) return true;
		return false;
	}
	function calleeName(expr) {
		if (import_typescript.default.isIdentifier(expr)) return expr.text;
		if (import_typescript.default.isPropertyAccessExpression(expr)) return expr.name.text;
		return expr.getText(sourceFile);
	}
	function isPlaceholderLiteral(text) {
		const unquoted = text.replace(/^["'`]|["'`]$/g, "");
		return unquoted.length === 0 || PLACEHOLDER_VALUE.test(unquoted);
	}
	function visit(node) {
		if (import_typescript.default.isVariableDeclaration(node) && node.initializer && import_typescript.default.isIdentifier(node.name)) checkSecretAssignment(node.name.text, node.initializer, node);
		if (import_typescript.default.isPropertyAssignment(node) && import_typescript.default.isIdentifier(node.name) && node.initializer) checkSecretAssignment(node.name.text, node.initializer, node);
		if (import_typescript.default.isBinaryExpression(node) && node.operatorToken.kind === import_typescript.default.SyntaxKind.EqualsToken) {
			const left = node.left;
			const name = import_typescript.default.isPropertyAccessExpression(left) ? left.name.text : import_typescript.default.isIdentifier(left) ? left.text : null;
			if (name) checkSecretAssignment(name, node.right, node);
		}
		if (import_typescript.default.isJsxAttribute(node) && node.name.getText(sourceFile) === "dangerouslySetInnerHTML") findings.push({
			title: "Dangerous HTML Rendering (XSS)",
			cwe_id: "CWE-79",
			severity: severityOf("CWE-79"),
			vulnerable_code_block: textOf(node),
			remediation_steps: "Avoid rendering unescaped raw HTML. If unavoidable, sanitize the value with DOMPurify (or an equivalent) immediately before it reaches dangerouslySetInnerHTML.",
			line_start: lineOf(node),
			line_end: endLineOf(node),
			engine: "ast",
			confidence: "high"
		});
		if (import_typescript.default.isBinaryExpression(node) && node.operatorToken.kind === import_typescript.default.SyntaxKind.EqualsToken && import_typescript.default.isPropertyAccessExpression(node.left) && node.left.name.text === "innerHTML") {
			const tainted = expressionIsTainted(node.right) && !wrappedInSanitizer(node.right);
			if (tainted || !import_typescript.default.isStringLiteralLike(node.right)) findings.push({
				title: "Dangerous DOM Sink (innerHTML)",
				cwe_id: "CWE-79",
				severity: tainted ? "critical" : "high",
				vulnerable_code_block: textOf(node),
				remediation_steps: "Use textContent for plain text, or sanitize with DOMPurify before assigning to innerHTML.",
				line_start: lineOf(node),
				line_end: endLineOf(node),
				engine: "ast",
				confidence: tainted ? "high" : "medium"
			});
		}
		if (import_typescript.default.isCallExpression(node)) {
			const name = calleeName(node.expression);
			if (SINK_CALLEES.has(name)) {
				const args = node.arguments;
				const dynamicArg = args.find((a) => !import_typescript.default.isStringLiteralLike(a));
				const taintedArg = args.find((a) => expressionIsTainted(a));
				if (taintedArg && !wrappedInSanitizer(taintedArg)) findings.push({
					title: `Command/Code Injection via ${name}() with tainted input`,
					cwe_id: name === "eval" || name === "Function" ? "CWE-94" : "CWE-78",
					severity: "critical",
					vulnerable_code_block: textOf(node),
					remediation_steps: `The argument passed to ${name}() is derived from an untrusted source (request/query/params). Never build shell commands or evaluated code from user input; use parameterized APIs (e.g. execFile with an argument array) or remove the dynamic evaluation entirely.`,
					line_start: lineOf(node),
					line_end: endLineOf(node),
					engine: "ast",
					confidence: "high"
				});
				else if (dynamicArg) findings.push({
					title: `Dynamic Code/Command Execution via ${name}()`,
					cwe_id: name === "eval" || name === "Function" ? "CWE-94" : "CWE-77",
					severity: "high",
					vulnerable_code_block: textOf(node),
					remediation_steps: `${name}() is called with a non-literal argument. Confirm the value can never contain attacker-controlled data; prefer safer built-in APIs over dynamic evaluation.`,
					line_start: lineOf(node),
					line_end: endLineOf(node),
					engine: "ast",
					confidence: "medium"
				});
			}
			if (SQL_CALLEE_HINT.test(name)) for (const arg of node.arguments) {
				const text = textOf(arg);
				if (!SQL_KEYWORD.test(text)) continue;
				if (!(import_typescript.default.isTemplateExpression(arg) && arg.templateSpans.length > 0 || import_typescript.default.isBinaryExpression(arg) && arg.operatorToken.kind === import_typescript.default.SyntaxKind.PlusToken)) continue;
				const tainted = expressionIsTainted(arg);
				findings.push({
					title: "SQL Injection via string-built query",
					cwe_id: "CWE-89",
					severity: "critical",
					vulnerable_code_block: textOf(node),
					remediation_steps: "Use parameterized queries / a query builder (e.g. `db.query('... WHERE id = $1', [id])`) instead of interpolating values into raw SQL text.",
					line_start: lineOf(node),
					line_end: endLineOf(node),
					engine: "ast",
					confidence: tainted ? "high" : "medium"
				});
			}
		}
		import_typescript.default.forEachChild(node, visit);
	}
	function checkSecretAssignment(name, valueExpr, reportNode) {
		if (!SECRET_NAME_HINT.test(name)) return;
		if (!import_typescript.default.isStringLiteralLike(valueExpr)) return;
		const text = valueExpr.getText(sourceFile);
		const unquoted = text.replace(/^["'`]|["'`]$/g, "");
		if (isPlaceholderLiteral(text) || unquoted.length < 12) return;
		findings.push({
			title: "Hardcoded Secret / API Key",
			cwe_id: "CWE-798",
			severity: severityOf("CWE-798"),
			vulnerable_code_block: textOf(reportNode),
			remediation_steps: "Move this credential to an environment variable (or a secret manager) and read it at runtime via process.env — never commit literal secrets.",
			line_start: lineOf(reportNode),
			line_end: endLineOf(reportNode),
			engine: "ast",
			confidence: "high"
		});
	}
	visit(sourceFile);
	return findings;
}
var RULES = [
	{
		title: "Hardcoded Secret / API Key",
		cwe_id: "CWE-798",
		severity: "critical",
		regex: /(?:api_key|secret|password|supabase_service_role|aws_access_key)\s*[:=]\s*["'][a-zA-Z0-9_-]{16,64}["']/i,
		remediation: "Migrate hardcoded credentials to secure environment variables. Inject them at runtime instead of committing literal values."
	},
	{
		title: "Command Injection Exposure",
		cwe_id: "CWE-78",
		severity: "critical",
		regex: /(?<![a-zA-Z0-9_])(?:os\.system|subprocess\.call|subprocess\.Popen|exec|eval|`[^`]*`)\s*\(/i,
		remediation: "Replace dynamic shell execution with safer built-in APIs and strictly sanitize/parameterize all arguments."
	},
	{
		title: "SQL built via string interpolation",
		cwe_id: "CWE-89",
		severity: "high",
		regex: /(SELECT|INSERT|UPDATE|DELETE)\b.*?(%s|f['"]|\.format\(|\+\s*\w+\s*\+)/i,
		remediation: "Use parameterized queries instead of building SQL text via string interpolation or concatenation."
	},
	{
		title: "Insecure Deserialization",
		cwe_id: "CWE-502",
		severity: "high",
		regex: /\b(pickle\.loads|yaml\.load\()\s*\(/,
		remediation: "Use safe loaders (yaml.safe_load) or avoid deserializing untrusted input entirely."
	},
	{
		title: "Overly permissive container user",
		cwe_id: "CWE-269",
		severity: "medium",
		regex: /^\s*USER\s+root\s*$/i,
		remediation: "Run the container as a non-root user; add a dedicated USER directive before the entrypoint."
	}
];
var MAX_SCAN_LINE_LENGTH = 1e5;
function runHeuristicSAST(sourceCode) {
	const lines = sourceCode.split("\n");
	const findings = [];
	lines.forEach((line, index) => {
		if (line.length > MAX_SCAN_LINE_LENGTH) return;
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) return;
		for (const rule of RULES) if (rule.regex.test(line)) findings.push({
			title: rule.title,
			cwe_id: rule.cwe_id,
			severity: rule.severity,
			vulnerable_code_block: trimmed.slice(0, 400),
			remediation_steps: rule.remediation,
			line_start: index + 1,
			line_end: index + 1,
			engine: "heuristic",
			confidence: "low"
		});
	});
	return findings;
}
function runLocalSAST(sourceCode, fileType = "") {
	if (isAstSupported(fileType)) try {
		return runAstSAST(sourceCode, fileType);
	} catch {
		return runHeuristicSAST(sourceCode);
	}
	return runHeuristicSAST(sourceCode);
}
//#endregion
export { runLocalSAST as t };
