// Typed data-access hooks for the scan/policy domain.
//
// The Supabase auth in this app verifies a browser Bearer token that is attached
// to server-fn RPCs by the client middleware `attachSupabaseAuth` (see
// src/integrations/supabase/auth-attacher.ts). That token never exists during
// SSR, so auth-protected data is fetched here on the client via react-query
// rather than from route loaders. Route loaders seed the hooks below through
// `initialData` so first paint is instant and a hydration refetch keeps things
// fresh.

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getScanReport, listPolicies, listScans } from "@/lib/scan.functions";
import { getAuditQuota } from "@/lib/billing.functions";
import type {
  Policy,
  ScanReport,
  ScanSummary,
  ScanVulnerability,
} from "@/lib/scan-types";

export interface AuditQuota {
  tier: "free" | "starter" | "pro";
  remaining: number;
}

export function useAuditQuotaQuery() {
  const fetchQuota = useServerFn(getAuditQuota);
  return useQuery({
    queryKey: ["billing-quota"],
    queryFn: () => fetchQuota(),
  });
}

export interface ScansQueryResult {
  scans: ScanSummary[];
  isLoading: boolean;
}

/**
 * N5: both list queries below deliberately fail soft (see `useScansQuery`).
 * Centralizing the log keeps one message shape, so browser logs stay filterable
 * on the `[scan-queries]` tag, and passes the raw error for the console.
 */
function logListFallback(what: "scan" | "policy", err: unknown) {
  console.warn(
    `[scan-queries] Failed to fetch remote ${what} list, returning empty array:`,
    err,
  );
}

/**
 * Dashboard "recent audits" list. Fails soft to `[]` (same as the pre-refactor
 * behavior) so an unauthenticated visitor is redirected by `RequireAuth`
 * instead of being dropped into an error boundary.
 */
export function useScansQuery(
  initialScans: ScanSummary[] = [],
): ScansQueryResult {
  const list = useServerFn(listScans);
  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["scans"],
    queryFn: async () => {
      try {
        const res = await list();
        return res ?? [];
      } catch (err) {
        logListFallback("scan", err);
        return [];
      }
    },
    initialData: initialScans,
  });
  return { scans, isLoading };
}

export interface ScanReportQueryData {
  scan: ScanReport;
  vulns: ScanVulnerability[];
}

export interface ScanReportQueryResult {
  data: ScanReportQueryData | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Re-reads the report from the server; resolves once the refetch settles. */
  refetch: () => Promise<unknown>;
}

/** Full report for `/scans/$id` (scan row + findings). */
export function useScanReportQuery(scanId: string): ScanReportQueryResult {
  const fetchReport = useServerFn(getScanReport);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["scan", scanId],
    queryFn: async () => {
      const res = await fetchReport({ data: { id: scanId } });
      return {
        scan: res.scan,
        vulns: res.vulns,
      };
    },
  });
  return { data, isLoading, isError, refetch };
}

export interface PoliciesQueryResult {
  policies: Policy[];
  isLoading: boolean;
}

/** Policies list for the policies page (soft-fails to `[]`, see useScansQuery). */
export function usePoliciesQuery(
  initialPolicies: Policy[] = [],
): PoliciesQueryResult {
  const listFn = useServerFn(listPolicies);
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      try {
        const res = await listFn();
        return res ?? [];
      } catch (err) {
        logListFallback("policy", err);
        return [];
      }
    },
    initialData: initialPolicies,
  });
  return { policies, isLoading };
}
