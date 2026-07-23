import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


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
  if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");

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

  const model = "gemini-2.5-flash";
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
  .middleware([requireSupabaseAuth])
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
      const raw = await callGemini(data.project_name, data.file_type, data.source_code, policies);
      const vulns = normalizeVulns(raw);
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
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
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

export const copilotRemediate = createServerFn({ method: "POST" })
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

    const model = "gemini-2.5-flash";
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

export const togglePolicy = createServerFn({ method: "POST" })
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
