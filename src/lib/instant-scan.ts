// Browser-side caller for POST /api/scan/instant — the deterministic local
// SAST pass (AST + taint for JS/TS, heuristic rules otherwise).
//
// Used by the dashboard's progress panel: kicking this off in parallel with the
// full `runScan` server function gives the UI a *real* intermediate result
// (which engine ran, how many findings it produced) within milliseconds, while
// the AI pass is still in flight. Nothing here is simulated.
//
// Auth: the endpoint verifies a Supabase access token from the Authorization
// header — the same bearer token `attachSupabaseAuth` attaches to server-fn
// RPCs, fetched here from the shared browser client's session.

import { supabase } from "@/integrations/supabase/client";
import type { Severity } from "@/lib/severity";
import type { LocalVuln } from "@/lib/sast-engine";

export interface InstantLocalScanResult {
  findings: LocalVuln[];
  /** Which engine actually produced the findings (reported by the server). */
  engine: "ast" | "heuristic";
}

export async function runInstantLocalScan(input: {
  file_type: string;
  source_code: string;
}): Promise<InstantLocalScanResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No active session.");

  const res = await fetch("/api/scan/instant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error(
      `Local engine request failed [${res.status}]: ${(await res.text()).slice(0, 200)}`,
    );
  }
  return (await res.json()) as InstantLocalScanResult;
}

export function countBySeverity(
  findings: Array<{ severity: Severity }>,
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}
