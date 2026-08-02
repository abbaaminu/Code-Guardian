import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { runLocalSAST } from "@/lib/sast-engine";
import { buildSarifLog } from "@/lib/sarif";

type Severity = "critical" | "high" | "medium" | "low";

const SEVERITY_SET = new Set<Severity>(["critical", "high", "medium", "low"]);

const ScanInput = z.object({
  project_name: z.string().min(1).max(120),
  file_type: z.string().min(1).max(40),
  source_code: z.string().min(1).max(60000),
});

interface VulnRaw {
  title?: unknown;
  severity?: unknown;
  cwe_id?: unknown;
  vulnerable_code_block?: unknown;
  fixed_code_block?: unknown;
  remediation_steps?: unknown;
  file_path?: unknown;
  line_start?: unknown;
  line_end?: unknown;
}

async function serverSupabase() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function safeString(v: unknown, max = 4000): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

function normalizeVulns(raw: unknown): Array<{
  title: string;
  severity: Severity;
  cwe_id: string | null;
  vulnerable_code_block: string;
  fixed_code_block: string;
  remediation_steps: string;
  file_path: string | null;
  line_start: number | null;
  line_end: number | null;
}> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is VulnRaw => typeof v === "object" && v !== null)
    .map((v) => {
      const sev = String(v.severity ?? "medium").toLowerCase() as Severity;
      return {
        title: safeString(v.title, 200) || "Unnamed finding",
        severity: SEVERITY_SET.has(sev) ? sev : "medium",
        cwe_id: safeString(v.cwe_id, 40) || null,
        vulnerable_code_block: safeString(v.vulnerable_code_block, 4000),
        fixed_code_block: safeString(v.fixed_code_block, 4000),
        remediation_steps: safeString(v.remediation_steps, 2000),
        file_path: safeString(v.file_path, 200) || null,
        line_start: typeof v.line_start === "number" ? v.line_start : null,
        line_end: typeof v.line_end === "number" ? v.line_end : null,
      };
    });
}

// Local-engine findings share the same shape once normalized, so the DB insert
// and the report/SARIF pipeline downstream don't need to know which engine
// (AST, heuristic, or Gemini) produced a given row.
function normalizeLocalFindings(
  findings: ReturnType<typeof runLocalSAST>,
  projectName: string,
): ReturnType<typeof normalizeVulns> {
  return findings.map((v) => ({
    title: v.title,
    severity: v.severity,
    cwe_id: v.cwe_id,
    vulnerable_code_block: v.vulnerable_code_block,
    fixed_code_block:
      v.engine === "ast"
        ? "/* This finding was flagged by static structural analysis; no automated one-line fix is safe to apply blindly. See remediation steps. */"
        : "/* Automated fix unavailable for this heuristic-engine finding. Follow remediation steps below. */",
    remediation_steps: v.remediation_steps,
    file_path: projectName,
    line_start: v.line_start,
    line_end: v.line_end,
  }));
}

function countBySeverity(vulns: Array<{ severity: Severity }>) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const v of vulns) counts[v.severity]++;
  return counts;
}

function computeHealthScore(counts: { critical: number; high: number; medium: number; low: number }) {
  const penalty = counts.critical * 25 + counts.high * 12 + counts.medium * 5 + counts.low * 2;
  return Math.max(0, Math.min(100, 100 - penalty));
}

async function callGemini(project: string, fileType: string, code: string, policies: string[]): Promise<unknown[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Security audit AI engine is temporarily unconfigured.");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
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
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Rate limit hit — please retry in a moment.");
    throw new Error(`Gemini API error [${res.status}]: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
  try {
    const parsed = JSON.parse(content) as { vulnerabilities?: unknown };
    return Array.isArray(parsed.vulnerabilities) ? parsed.vulnerabilities : [];
  } catch {
    return [];
  }
}

export const runScan = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => ScanInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = await serverSupabase();

    // Load enabled policies to steer the scan.
    const { data: policyRows } = await supabase.from("policies").select("name").eq("enabled", true);
    const policies = (policyRows ?? []).map((p) => p.name);

    // Create scan in scanning state, tagged to the signed-in user.
    const { data: created, error: createErr } = await supabase
      .from("scans")
      .insert({
        project_name: data.project_name,
        file_type: data.file_type,
        status: "scanning",
        source_code: data.source_code,
        user_id: context.userId,
      })
      .select("id")
      .single();
    if (createErr || !created) throw new Error(createErr?.message || "Failed to create scan");

    try {
      // 1. Deterministic local engine first: real AST + taint analysis for
      // JS/TS/JSX/TSX, heuristic pattern rules for everything else. Zero
      // latency, zero API cost, and it still runs if the AI engine is down.
      const localFindings = normalizeLocalFindings(runLocalSAST(data.source_code, data.file_type), data.project_name);

      // 2. AI engine for complex, contextual, business-logic vulnerabilities
      // that structural analysis alone can't reason about.
      const rawAiFindings = await callGemini(data.project_name, data.file_type, data.source_code, policies);
      const aiVulns = normalizeVulns(rawAiFindings);

      const vulns = [...localFindings, ...aiVulns];
      const counts = countBySeverity(vulns);
      const health = computeHealthScore(counts);

      if (vulns.length > 0) {
        const rows = vulns.map((v) => ({ ...v, scan_id: created.id }));
        const { error: insertErr } = await supabase.from("vulnerabilities").insert(rows);
        if (insertErr) throw new Error(insertErr.message);
      }

      await supabase
        .from("scans")
        .update({
          status: "completed",
          health_score: health,
          vulnerabilities_count: counts,
        })
        .eq("id", created.id);

      return { id: created.id, health_score: health, counts };
    } catch (err) {
      await supabase.from("scans").update({ status: "failed" }).eq("id", created.id);
      throw err;
    }
  });

export const listScans = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = await serverSupabase();
    const { data, error } = await supabase
      .from("scans")
      .select("id, project_name, file_type, status, health_score, vulnerabilities_count, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getScanReport = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = await serverSupabase();
    const [{ data: scan, error: e1 }, { data: vulns, error: e2 }] = await Promise.all([
      supabase.from("scans").select("*").eq("id", data.id).eq("user_id", context.userId).maybeSingle(),
      supabase.from("vulnerabilities").select("*").eq("scan_id", data.id).order("severity"),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (!scan) throw new Error("Scan not found");
    return { scan, vulns: vulns ?? [] };
  });

// Exports the full finding set for a scan as SARIF 2.1.0 — consumable by
// `github/codeql-action/upload-sarif`, VS Code's SARIF Viewer, and most DevOps
// security dashboards. Ownership-checked the same way as getScanReport; SARIF
// often gets piped straight into CI artifacts, so we don't want it leaking
// another user's findings just because they knew a scan id.
export const getScanSarif = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const supabase = await serverSupabase();
    const [{ data: scan, error: e1 }, { data: vulns, error: e2 }] = await Promise.all([
      supabase.from("scans").select("id, project_name").eq("id", data.id).eq("user_id", context.userId).maybeSingle(),
      supabase.from("vulnerabilities").select("*").eq("scan_id", data.id),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (!scan) throw new Error("Scan not found");

    return buildSarifLog({
      toolVersion: "1.0.0",
      scanId: scan.id,
      projectName: scan.project_name,
      findings: (vulns ?? []).map((v) => ({
        title: v.title,
        severity: v.severity as Severity,
        cwe_id: v.cwe_id,
        vulnerable_code_block: v.vulnerable_code_block,
        remediation_steps: v.remediation_steps,
        file_path: v.file_path,
        line_start: v.line_start,
        line_end: v.line_end,
      })),
    });
  });

export const listPolicies = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await serverSupabase();
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .order("category")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

const CopilotInput = z.object({
  instruction: z.string().min(1).max(2000),
  source_code: z.string().min(1).max(60000),
  file_type: z.string().min(1).max(40),
});

// SECURITY FIX: this endpoint proxies to the Gemini API using the server's own
// API key. It previously had no auth middleware at all, so anyone who found the
// URL could burn your Gemini quota/budget for free with no rate limiting tied
// to an account. Requiring a signed-in Supabase user is the minimum bar here;
// consider adding per-user rate limiting on top if abuse becomes a problem.
export const copilotRemediate = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => CopilotInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
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

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit hit — please retry in a moment.");
      throw new Error(`Copilot API error [${res.status}]: ${body.slice(0, 300)}`);
    }
    const payload = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
    try {
      const parsed = JSON.parse(content) as { updated_code?: unknown; summary?: unknown; changes?: unknown };
      return {
        updated_code: typeof parsed.updated_code === "string" ? parsed.updated_code : data.source_code,
        summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 500) : "Updated code generated.",
        changes: Array.isArray(parsed.changes)
          ? parsed.changes.filter((c): c is string => typeof c === "string").slice(0, 8)
          : [],
      };
    } catch {
      return { updated_code: data.source_code, summary: "Copilot returned no parseable changes.", changes: [] };
    }
  });

// SECURITY FIX: previously had no auth middleware — any anonymous visitor could
// toggle any org's enabled security policies. Now requires a signed-in user.
// NOTE: there's no roles/permissions table in the current schema, so this still
// doesn't distinguish "signed in" from "should be allowed to change policy for
// this org." Once multi-tenancy/RBAC exists (see supabase/migrations), gate this
// on an admin/owner role rather than just authentication.
export const togglePolicy = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = await serverSupabase();
    const { error } = await supabase
      .from("policies")
      .update({ enabled: data.enabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
