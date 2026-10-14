// Derived scan metrics shared by the dashboard headline cards, the recent-scans
// table, and the scan report.
//
// N1: these helpers used to live in dashboard-stat-cards.tsx, which also exports
// two components. A module that mixes component and plain-function exports
// cannot be fast-refreshed (react-refresh/only-export-components), so the pure
// derivations live here and the card module only exports components.

import { SEVERITIES, type Severity } from "@/lib/severity";
import type { ScanSummary } from "@/lib/scan-types";

/** Headline numbers rendered by `StatCards`. */
export interface ScanTotals {
  total: number;
  critical: number;
  avgHealth: number;
}

/** Derive the three headline stats from the scans list. */
export function computeScanTotals(scans: ScanSummary[]): ScanTotals {
  return {
    total: scans.length,
    critical: scans.reduce(
      (n, s) => n + (s.vulnerabilities_count?.critical ?? 0),
      0,
    ),
    avgHealth: scans.length
      ? Math.round(
          scans.reduce((n, s) => n + (s.health_score ?? 0), 0) / scans.length,
        )
      : 0,
  };
}

/** Most severe finding present in a counts map, or null when none were found. */
export function topSeverity(
  counts: Record<Severity, number> | undefined,
): Severity | null {
  if (!counts) return null;
  for (const s of SEVERITIES) if ((counts[s] ?? 0) > 0) return s;
  return null;
}
