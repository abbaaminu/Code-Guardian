import { r as createServerFn, t as TSS_SERVER_FUNCTION } from "./server-Brx4YFZf.mjs";
import { n as requireSupabaseAuth } from "./auth-middleware-ABo1HzMN.mjs";
import { t as attachSupabaseAuth } from "./auth-attacher-DXvJAPwq.mjs";
import { n as objectType, r as stringType, t as booleanType } from "../_libs/zod.mjs";
import { t as mapCwe } from "./compliance-mapping-BPzS-8qT.mjs";
import { t as runLocalSAST } from "./sast-engine-0uKn5z99.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/scan.functions-DLvpL1lK.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var SEVERITY_TO_SARIF_LEVEL = {
	critical: "error",
	high: "error",
	medium: "warning",
	low: "note"
};
var SEVERITY_TO_SCORE = {
	critical: "9.5",
	high: "7.5",
	medium: "5.0",
	low: "2.5"
};
function ruleIdFor(title, cweId) {
	return `securepulse/${(cweId ?? title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "finding"}`;
}
function buildSarifLog(params) {
	const { toolVersion, scanId, projectName, findings } = params;
	const ruleIndex = /* @__PURE__ */ new Map();
	const rules = [];
	const results = findings.map((f) => {
		const cwe = f.cwe_id ?? null;
		const mapping = mapCwe(cwe);
		const ruleId = ruleIdFor(f.title, cwe);
		if (!ruleIndex.has(ruleId)) {
			ruleIndex.set(ruleId, rules.length);
			rules.push({
				id: ruleId,
				name: f.title.replace(/\s+/g, ""),
				shortDescription: { text: f.title },
				fullDescription: { text: f.remediation_steps },
				helpUri: cwe ? `https://cwe.mitre.org/data/definitions/${cwe.replace(/^CWE-/i, "")}.html` : void 0,
				properties: {
					tags: [
						"security",
						cwe ?? "unmapped",
						...mapping.owasp ? [mapping.owasp] : [],
						...mapping.pciDss.map((p) => `PCI-DSS ${p}`),
						...mapping.soc2.map((s) => `SOC2 ${s}`)
					],
					"security-severity": SEVERITY_TO_SCORE[f.severity],
					precision: "medium"
				}
			});
		}
		const line = Math.max(1, f.line_start ?? 1);
		const endLine = Math.max(line, f.line_end ?? line);
		return {
			ruleId,
			ruleIndex: ruleIndex.get(ruleId),
			level: SEVERITY_TO_SARIF_LEVEL[f.severity],
			message: { text: `${f.title}${cwe ? ` (${cwe})` : ""} — ${f.remediation_steps}` },
			locations: [{ physicalLocation: {
				artifactLocation: {
					uri: f.file_path ?? projectName,
					uriBaseId: "%SRCROOT%"
				},
				region: {
					startLine: line,
					endLine,
					snippet: { text: f.vulnerable_code_block.slice(0, 4e3) }
				}
			} }],
			partialFingerprints: { securePulseFindingHash: `${scanId}:${ruleId}:${line}` }
		};
	});
	return {
		$schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/Schemata/sarif-schema-2.1.0.json",
		version: "2.1.0",
		runs: [{
			tool: { driver: {
				name: "SecurePulse",
				informationUri: "https://securepulse.dev",
				version: toolVersion,
				rules
			} },
			originalUriBaseIds: { SRCROOT: { uri: "file:///" } },
			results
		}]
	};
}
var TokenBucket = class {
	options;
	tokens;
	lastRefillMs;
	lastUsedMs;
	constructor(options) {
		this.options = options;
		this.tokens = options.capacity;
		this.lastRefillMs = 0;
		this.lastUsedMs = 0;
	}
	/**
	* Tries to consume one token. Refills proportionally to elapsed time first.
	* `nowMs` is injectable for deterministic tests.
	*/
	tryTake(nowMs = Date.now()) {
		this.refill(nowMs);
		this.lastUsedMs = nowMs;
		if (this.tokens >= 1) {
			this.tokens -= 1;
			return true;
		}
		return false;
	}
	/** True if the bucket hasn't been touched within `timeoutMs`. */
	isIdle(nowMs, timeoutMs) {
		return nowMs - this.lastUsedMs > timeoutMs;
	}
	refill(nowMs) {
		const elapsedSeconds = (nowMs - this.lastRefillMs) / 1e3;
		if (elapsedSeconds <= 0) return;
		this.tokens = Math.min(this.options.capacity, this.tokens + elapsedSeconds * this.options.refillPerSecond);
		this.lastRefillMs = nowMs;
	}
};
var PerUserRateLimiter = class {
	options;
	maxTrackedUsers;
	idleTimeoutMs;
	buckets = /* @__PURE__ */ new Map();
	constructor(options, maxTrackedUsers = 1e4, idleTimeoutMs = 36e5) {
		this.options = options;
		this.maxTrackedUsers = maxTrackedUsers;
		this.idleTimeoutMs = idleTimeoutMs;
	}
	/**
	* Consumes one token for `key` (e.g. a Supabase user id). Returns false when
	* the user is over budget. Buckets are created lazily and pruned when the map
	* grows past `maxTrackedUsers` so memory stays bounded.
	*/
	tryTake(key, nowMs = Date.now()) {
		let bucket = this.buckets.get(key);
		if (!bucket) {
			if (this.buckets.size >= this.maxTrackedUsers) this.prune(nowMs);
			bucket = new TokenBucket(this.options);
			this.buckets.set(key, bucket);
		}
		return bucket.tryTake(nowMs);
	}
	/** Number of users currently tracked (exposed for tests/observability). */
	get trackedUserCount() {
		return this.buckets.size;
	}
	prune(nowMs) {
		for (const [key, bucket] of this.buckets) if (bucket.isIdle(nowMs, this.idleTimeoutMs)) this.buckets.delete(key);
		if (this.buckets.size >= this.maxTrackedUsers) {
			const oldest = this.buckets.keys().next();
			if (!oldest.done) this.buckets.delete(oldest.value);
		}
	}
};
/**
* Shared budget across every Gemini-backed server function. Per-user budget:
* burst of 6 calls, then 1 token every 10s (~6 calls/min sustained). Tune to
* your Gemini quota / plan — this is a ceiling against quota-burning abuse, not
* a precise billing meter.
*/
var geminiApiRateLimiter = new PerUserRateLimiter({
	capacity: 6,
	refillPerSecond: 1 / 10
});
var SEVERITY_SET = /* @__PURE__ */ new Set([
	"critical",
	"high",
	"medium",
	"low"
]);
var ScanInput = objectType({
	project_name: stringType().min(1).max(120),
	file_type: stringType().min(1).max(40),
	source_code: stringType().min(1).max(6e4)
});
async function serverSupabase() {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	return supabaseAdmin;
}
var INSERT_CHUNK_SIZE = 100;
function chunkRows(rows, size) {
	const chunks = [];
	for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
	return chunks;
}
function safeString(v, max = 4e3) {
	if (typeof v !== "string") return "";
	return v.slice(0, max);
}
function normalizeVulns(raw) {
	if (!Array.isArray(raw)) return [];
	return raw.filter((v) => typeof v === "object" && v !== null).map((v) => {
		const sev = String(v.severity ?? "medium").toLowerCase();
		return {
			title: safeString(v.title, 200) || "Unnamed finding",
			severity: SEVERITY_SET.has(sev) ? sev : "medium",
			cwe_id: safeString(v.cwe_id, 40) || null,
			vulnerable_code_block: safeString(v.vulnerable_code_block, 4e3),
			fixed_code_block: safeString(v.fixed_code_block, 4e3),
			remediation_steps: safeString(v.remediation_steps, 2e3),
			file_path: safeString(v.file_path, 200) || null,
			line_start: typeof v.line_start === "number" ? v.line_start : null,
			line_end: typeof v.line_end === "number" ? v.line_end : null
		};
	});
}
function normalizeLocalFindings(findings, projectName) {
	return findings.map((v) => ({
		title: v.title,
		severity: v.severity,
		cwe_id: v.cwe_id,
		vulnerable_code_block: v.vulnerable_code_block,
		fixed_code_block: v.engine === "ast" ? "/* This finding was flagged by static structural analysis; no automated one-line fix is safe to apply blindly. See remediation steps. */" : "/* Automated fix unavailable for this heuristic-engine finding. Follow remediation steps below. */",
		remediation_steps: v.remediation_steps,
		file_path: projectName,
		line_start: v.line_start,
		line_end: v.line_end
	}));
}
function countBySeverity(vulns) {
	const counts = {
		critical: 0,
		high: 0,
		medium: 0,
		low: 0
	};
	for (const v of vulns) counts[v.severity]++;
	return counts;
}
function computeHealthScore(counts) {
	const penalty = counts.critical * 25 + counts.high * 12 + counts.medium * 5 + counts.low * 2;
	return Math.max(0, Math.min(100, 100 - penalty));
}
async function callGemini(project, fileType, code, policies) {
	const apiKey = processModule.env.GOOGLE_API_KEY;
	if (!apiKey) throw new Error("Security audit AI engine is temporarily unconfigured.");
	const model = processModule.env.GEMINI_MODEL || "gemini-2.5-flash";
	const systemPrompt = `You are SecurePulse, an enterprise, non-training-tier code security auditor.
Analyze code for security vulnerabilities, secret exposure, and compliance violations aligned with: ${policies.join(", ") || "OWASP Top 10, CWE Top 25"}.

STRICT OUTPUT CONTRACT:
- Return ONLY a JSON object of the form: {"vulnerabilities": [ ... ]}
- Each item MUST include: title, severity (one of "critical"|"high"|"medium"|"low"), cwe_id (e.g. "CWE-89"), vulnerable_code_block (exact snippet from input), fixed_code_block (complete, compilable replacement — NO placeholders, NO "TODO", NO comments like "// your logic here"), remediation_steps (short, imperative), file_path (or null), line_start, line_end.
- The fixed_code_block MUST be a syntactically valid drop-in replacement in the same language.
- If no issues, return {"vulnerabilities": []}.
- Do NOT include any prose, markdown fences, or explanation outside the JSON.`;
	const userPrompt = `Project: ${project}
Language / File type: ${fileType}

--- CODE START ---
${code}
--- CODE END ---`;
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			systemInstruction: {
				role: "system",
				parts: [{ text: systemPrompt }]
			},
			contents: [{
				role: "user",
				parts: [{ text: userPrompt }]
			}],
			generationConfig: {
				responseMimeType: "application/json",
				temperature: .2
			}
		})
	});
	if (!res.ok) {
		const body = await res.text();
		if (res.status === 429) throw new Error("Rate limit hit — please retry in a moment.");
		throw new Error(`Gemini API error [${res.status}]: ${body.slice(0, 300)}`);
	}
	const content = (await res.json()).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
	try {
		const parsed = JSON.parse(content);
		return Array.isArray(parsed.vulnerabilities) ? parsed.vulnerabilities : [];
	} catch {
		return [];
	}
}
var runScan_createServerFn_handler = createServerRpc({
	id: "fa8336d1481611070fd84160b87a6d6d362b4d6bd6b5c4f6b107f76e6f70d307",
	name: "runScan",
	filename: "src/lib/scan.functions.ts"
}, (opts) => runScan.__executeServer(opts));
var runScan = createServerFn({ method: "POST" }).middleware([attachSupabaseAuth, requireSupabaseAuth]).inputValidator((input) => ScanInput.parse(input)).handler(runScan_createServerFn_handler, async ({ data, context }) => {
	if (!geminiApiRateLimiter.tryTake(context.userId)) throw new Error("Rate limit reached — please wait a moment before running another AI-powered scan.");
	const supabase = await serverSupabase();
	const { data: policyRows } = await supabase.from("policies").select("name").eq("enabled", true);
	const policies = (policyRows ?? []).map((p) => p.name);
	const { data: created, error: createErr } = await supabase.from("scans").insert({
		project_name: data.project_name,
		file_type: data.file_type,
		status: "scanning",
		source_code: data.source_code,
		user_id: context.userId
	}).select("id").single();
	if (createErr || !created) throw new Error(createErr?.message || "Failed to create scan");
	try {
		const localFindings = normalizeLocalFindings(runLocalSAST(data.source_code, data.file_type), data.project_name);
		const aiVulns = normalizeVulns(await callGemini(data.project_name, data.file_type, data.source_code, policies));
		const vulns = [...localFindings, ...aiVulns];
		const counts = countBySeverity(vulns);
		const health = computeHealthScore(counts);
		if (vulns.length > 0) {
			const rows = vulns.map((v) => ({
				...v,
				scan_id: created.id
			}));
			for (const chunk of chunkRows(rows, INSERT_CHUNK_SIZE)) {
				const { error: insertErr } = await supabase.from("vulnerabilities").insert(chunk);
				if (insertErr) throw new Error(insertErr.message);
			}
		}
		await supabase.from("scans").update({
			status: "completed",
			health_score: health,
			vulnerabilities_count: counts
		}).eq("id", created.id);
		return {
			id: created.id,
			health_score: health,
			counts
		};
	} catch (err) {
		await supabase.from("scans").update({ status: "failed" }).eq("id", created.id);
		throw err;
	}
});
var listScans_createServerFn_handler = createServerRpc({
	id: "87d6a9d08d157be7d0ec31ab686026892635e4529c13628a7532fd49f0d890b8",
	name: "listScans",
	filename: "src/lib/scan.functions.ts"
}, (opts) => listScans.__executeServer(opts));
var listScans = createServerFn({ method: "GET" }).middleware([attachSupabaseAuth, requireSupabaseAuth]).handler(listScans_createServerFn_handler, async ({ context }) => {
	const { data, error } = await (await serverSupabase()).from("scans").select("id, project_name, file_type, status, health_score, vulnerabilities_count, created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50);
	if (error) throw new Error(error.message);
	return data ?? [];
});
var getScanReport_createServerFn_handler = createServerRpc({
	id: "3db688898c70a5b9bc49ef4791151a2c641e2cde6cfc96136c34b4b45b8963b6",
	name: "getScanReport",
	filename: "src/lib/scan.functions.ts"
}, (opts) => getScanReport.__executeServer(opts));
var getScanReport = createServerFn({ method: "GET" }).middleware([attachSupabaseAuth, requireSupabaseAuth]).inputValidator((input) => objectType({ id: stringType().uuid() }).parse(input)).handler(getScanReport_createServerFn_handler, async ({ data, context }) => {
	const supabase = await serverSupabase();
	const [{ data: scan, error: e1 }, { data: vulns, error: e2 }] = await Promise.all([supabase.from("scans").select("*").eq("id", data.id).eq("user_id", context.userId).maybeSingle(), supabase.from("vulnerabilities").select("*").eq("scan_id", data.id).order("severity")]);
	if (e1) throw new Error(e1.message);
	if (e2) throw new Error(e2.message);
	if (!scan) throw new Error("Scan not found");
	return {
		scan,
		vulns: vulns ?? []
	};
});
var getScanSarif_createServerFn_handler = createServerRpc({
	id: "c2cd8fcf498a6c25bdda8b4a6632ec32894feb71792cf77ba76af61f8970a5ac",
	name: "getScanSarif",
	filename: "src/lib/scan.functions.ts"
}, (opts) => getScanSarif.__executeServer(opts));
var getScanSarif = createServerFn({ method: "GET" }).middleware([attachSupabaseAuth, requireSupabaseAuth]).inputValidator((input) => objectType({ id: stringType().uuid() }).parse(input)).handler(getScanSarif_createServerFn_handler, async ({ data, context }) => {
	const supabase = await serverSupabase();
	const [{ data: scan, error: e1 }, { data: vulns, error: e2 }] = await Promise.all([supabase.from("scans").select("id, project_name").eq("id", data.id).eq("user_id", context.userId).maybeSingle(), supabase.from("vulnerabilities").select("*").eq("scan_id", data.id)]);
	if (e1) throw new Error(e1.message);
	if (e2) throw new Error(e2.message);
	if (!scan) throw new Error("Scan not found");
	return buildSarifLog({
		toolVersion: "1.0.0",
		scanId: scan.id,
		projectName: scan.project_name,
		findings: (vulns ?? []).map((v) => ({
			title: v.title,
			severity: v.severity,
			cwe_id: v.cwe_id,
			vulnerable_code_block: v.vulnerable_code_block,
			remediation_steps: v.remediation_steps,
			file_path: v.file_path,
			line_start: v.line_start,
			line_end: v.line_end
		}))
	});
});
var listPolicies_createServerFn_handler = createServerRpc({
	id: "ca37418eaa19ceb3a3dd5eccd4788151293eccb99562353953f11c3c29941a99",
	name: "listPolicies",
	filename: "src/lib/scan.functions.ts"
}, (opts) => listPolicies.__executeServer(opts));
var listPolicies = createServerFn({ method: "GET" }).middleware([attachSupabaseAuth, requireSupabaseAuth]).handler(listPolicies_createServerFn_handler, async () => {
	const { data, error } = await (await serverSupabase()).from("policies").select("*").order("category").order("name");
	if (error) throw new Error(error.message);
	return data ?? [];
});
var CopilotInput = objectType({
	instruction: stringType().min(1).max(2e3),
	source_code: stringType().min(1).max(6e4),
	file_type: stringType().min(1).max(40)
});
var copilotRemediate_createServerFn_handler = createServerRpc({
	id: "bf094d02b29073046a699be718d9a643ec0d8c6ebf768626fcc60b5a49d4ce81",
	name: "copilotRemediate",
	filename: "src/lib/scan.functions.ts"
}, (opts) => copilotRemediate.__executeServer(opts));
var copilotRemediate = createServerFn({ method: "POST" }).middleware([attachSupabaseAuth, requireSupabaseAuth]).inputValidator((input) => CopilotInput.parse(input)).handler(copilotRemediate_createServerFn_handler, async ({ data, context }) => {
	if (!geminiApiRateLimiter.tryTake(context.userId)) throw new Error("Rate limit reached — please wait a moment before asking the copilot again.");
	const apiKey = processModule.env.GOOGLE_API_KEY;
	if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
	const systemPrompt = `You are SecurePulse Remediation Copilot. Rewrite the user's code per their instruction, prioritizing security best practices.

STRICT OUTPUT CONTRACT:
- Return ONLY a JSON object: {"updated_code": string, "summary": string, "changes": string[]}
- "updated_code": the ENTIRE updated source file, compilable/valid ${data.file_type}. NO markdown fences, NO placeholders, NO "TODO" comments.
- "summary": one-sentence description of what changed.
- "changes": short bullet list (max 5) of concrete edits.
- If the instruction is unsafe, unclear, or unrelated, still return the original code unchanged with an explanatory summary.`;
	const userPrompt = `Language: ${data.file_type}
Instruction: ${data.instruction}

--- CODE START ---
${data.source_code}
--- CODE END ---`;
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${processModule.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent?key=${encodeURIComponent(apiKey)}`;
	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			systemInstruction: {
				role: "system",
				parts: [{ text: systemPrompt }]
			},
			contents: [{
				role: "user",
				parts: [{ text: userPrompt }]
			}],
			generationConfig: {
				responseMimeType: "application/json",
				temperature: .2
			}
		})
	});
	if (!res.ok) {
		const body = await res.text();
		if (res.status === 429) throw new Error("Rate limit hit — please retry in a moment.");
		throw new Error(`Copilot API error [${res.status}]: ${body.slice(0, 300)}`);
	}
	const content = (await res.json()).candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
	try {
		const parsed = JSON.parse(content);
		return {
			updated_code: typeof parsed.updated_code === "string" ? parsed.updated_code : data.source_code,
			summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : "Updated code generated.",
			changes: Array.isArray(parsed.changes) ? parsed.changes.filter((c) => typeof c === "string").slice(0, 8) : []
		};
	} catch {
		return {
			updated_code: data.source_code,
			summary: "Copilot returned no parseable changes.",
			changes: []
		};
	}
});
async function requireAdminRole(supabase, userId) {
	const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
	if (error) throw new Error(error.message);
	if (data?.role !== "admin") throw new Error("Forbidden: only users with the admin role can change security policies.");
}
var togglePolicy_createServerFn_handler = createServerRpc({
	id: "876934eeaf00eb51604a2ee5805376bf02549a6d545f0d2b04411f505a045905",
	name: "togglePolicy",
	filename: "src/lib/scan.functions.ts"
}, (opts) => togglePolicy.__executeServer(opts));
var togglePolicy = createServerFn({ method: "POST" }).middleware([attachSupabaseAuth, requireSupabaseAuth]).inputValidator((input) => objectType({
	id: stringType().uuid(),
	enabled: booleanType()
}).parse(input)).handler(togglePolicy_createServerFn_handler, async ({ data, context }) => {
	const supabase = await serverSupabase();
	await requireAdminRole(supabase, context.userId);
	const { error } = await supabase.from("policies").update({ enabled: data.enabled }).eq("id", data.id);
	if (error) throw new Error(error.message);
	return { ok: true };
});
//#endregion
export { copilotRemediate_createServerFn_handler, getScanReport_createServerFn_handler, getScanSarif_createServerFn_handler, listPolicies_createServerFn_handler, listScans_createServerFn_handler, runScan_createServerFn_handler, togglePolicy_createServerFn_handler };
