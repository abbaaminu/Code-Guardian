import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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

function serverSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
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
  .inputValidator((input: unknown) => ScanInput.parse(input))
  .handler(async ({ data }) => {
    const supabase = serverSupabase();

    // Load enabled policies to steer the scan.
    const { data: policyRows } = await supabase.from("policies").select("name").eq("enabled", true);
    const policies = (policyRows ?? []).map((p) => p.name);

    // Create scan in scanning state.
    const { data: created, error: createErr } = await supabase
      .from("scans")
      .insert({
        project_name: data.project_name,
        file_type: data.file_type,
        status: "scanning",
        source_code: data.source_code,
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
