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
import type {
  Policy,
  ScanReport,
  ScanSummary,
  ScanVulnerability,
} from "@/lib/scan-types";

export interface ScansQueryResult {
  scans: ScanSummary[];
  isLoading: boolean;
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
        return (res || []) as ScanSummary[];
      } catch (err) {
        console.warn(
          "Failed to fetch remote scan list, returning empty array:",
          err,
        );
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
  refetch: () => void;
}

/** Full report for `/scans/$id` (scan row + findings). */
export function useScanReportQuery(scanId: string): ScanReportQueryResult {
  const fetchReport = useServerFn(getScanReport);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["scan", scanId],
    queryFn: async () => {
      const res = await fetchReport({ data: { id: scanId } });
      return {
        // The server fn returns Supabase row shapes (loosely typed); bridge the
        // boundary once here so route components consume the typed contracts.
        scan: res.scan as unknown as ScanReport,
        vulns: res.vulns as unknown as ScanVulnerability[],
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
        return (res || []) as Policy[];
      } catch (err) {
        console.warn(
          "Failed to fetch remote policy list, returning empty array:",
          err,
        );
        return [];
      }
    },
    initialData: initialPolicies,
  });
  return { policies, isLoading };
}
