// Central domain contracts shared by routes, hooks, and components.
//
// Keeping the scan/policy shapes in one place means route loaders, query hooks,
// and UI components all agree on the same explicit TypeScript interfaces
// instead of redeclaring (and drifting) per file.

import type { Severity } from "@/lib/severity";

/** Summary row of a completed scan (dashboard table + analytics). */
export interface ScanSummary {
  id: string;
  project_name: string;
  file_type: string;
  status: string;
  health_score: number;
  vulnerabilities_count: Record<Severity, number>;
  created_at: string;
}

/** A single finding produced by a scan (rendered by VulnCard). */
export interface ScanVulnerability {
  id: string;
  title: string;
  severity: Severity;
  cwe_id: string | null;
  vulnerable_code_block: string;
  fixed_code_block: string;
  remediation_steps: string;
  file_path: string | null;
  line_start: number | null;
  line_end: number | null;
}

/** Full scan record returned by `getScanReport`. */
export interface ScanReport {
  id: string;
  project_name: string;
  file_type: string;
  status: string;
  health_score: number;
  vulnerabilities_count: Record<Severity, number>;
  source_code: string;
  created_at: string;
}

/** A security policy row (policies page). */
export interface Policy {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

/** URL params for `/scans/$id`. */
export interface ScanRouteParams {
  id: string;
}
