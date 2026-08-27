import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ScanSimulator } from "@/components/scan-simulator";
import { ScanAnalytics } from "@/components/scan-analytics";
import { ReportExportDialog } from "@/components/report-export-dialog";
import { CopilotChat } from "@/components/copilot-chat";
import { RequireAuth } from "@/components/require-auth";
import {
  StatCards,
  computeScanTotals,
} from "@/components/dashboard-stat-cards";
import { ScanForm } from "@/components/dashboard-scan-form";
import { RecentScansTable } from "@/components/dashboard-recent-scans";
import {
  RouteErrorFallback,
  RoutePendingFallback,
} from "@/components/route-boundaries";
import { useScansQuery } from "@/hooks/use-scan-queries";
import { listScans, runScan } from "@/lib/scan.functions";
import type { ScanSummary } from "@/lib/scan-types";

export interface DashboardLoaderData {
  scans: ScanSummary[];
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Scan Dashboard · SecurePulse" },
      {
        name: "description",
        content:
          "Run and review AI-powered security scans across your projects.",
      },
    ],
  }),
  component: Dashboard,
  loader: async (): Promise<DashboardLoaderData> => {
    // SSR-safe loader: the auth middleware verifies a browser Bearer token that
    // `attachSupabaseAuth` attaches to client-side server-fn RPCs, so protected
    // data is never fetched from the server here. The typed query hook seeds
    // from this data and refetches on hydration. Failures degrade to an empty
    // list so `RequireAuth` (not an error boundary) drives unauthenticated UX.
    if (import.meta.env.SSR) return { scans: [] };
    try {
      const res = await listScans();
      return { scans: (res || []) as ScanSummary[] };
    } catch (err) {
      console.warn(
        "Failed to preload scan list, deferring to client fetch:",
        err,
      );
      return { scans: [] };
    }
  },
  errorComponent: RouteErrorFallback,
  pendingComponent: RoutePendingFallback,
  pendingMs: 300,
});

function Dashboard() {
  const qc = useQueryClient();
  const run = useServerFn(runScan);
  const { scans, isLoading } = useScansQuery(Route.useLoaderData().scans);

  const [completedScanId, setCompletedScanId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "failed">(
    "idle",
  );
  const [exportScan, setExportScan] = useState<ScanSummary | null>(null);
  const [copilotCode, setCopilotCode] = useState("");
  const [copilotFileType, setCopilotFileType] = useState("Python");

  const scanMutation = useMutation({
    mutationFn: async (input: {
      project_name: string;
      file_type: string;
      source_code: string;
    }) => run({ data: input }),
    onMutate: () => {
      setPhase("running");
      setCompletedScanId(null);
    },
    onSuccess: async (res) => {
      setCompletedScanId(res.id);
      setPhase("done");
      toast.success("Scan completed successfully", {
        description: `Health score: ${res.health_score ?? 80}/100`,
      });
      await qc.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (e: Error) => {
      setPhase("failed");
      toast.error("Scan error", {
        description: e.message || "Unable to complete security audit.",
      });
    },
  });

  const totals = computeScanTotals(scans);
  const showSimulator = phase !== "idle";

  return (
    <RequireAuth>
      <AppShell
        title="Scan Dashboard"
        subtitle="Paste code, upload a file, or connect a repo to audit for OWASP, CWE, and secret exposure."
        actions={
          <Link
            to="/policies"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Manage policies →
          </Link>
        }
      >
        <div className="grid-bg border-b border-border/60">
          <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
            <StatCards {...totals} />
            <ScanAnalytics scans={scans} />
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
            {showSimulator ? (
              <ScanSimulator
                running={phase === "running"}
                completed={phase === "done"}
                failed={phase === "failed"}
                scanId={completedScanId}
                onDismiss={() => {
                  setPhase("idle");
                  setCompletedScanId(null);
                }}
              />
            ) : (
              <ScanForm
                submitting={scanMutation.isPending}
                onSubmit={(v) => {
                  setCopilotCode(v.source_code);
                  setCopilotFileType(v.file_type);
                  scanMutation.mutate(v);
                }}
                onCodeChange={(code, fileType) => {
                  setCopilotCode(code);
                  setCopilotFileType(fileType);
                }}
              />
            )}

            <section className="min-h-[420px] rounded-xl border border-border/60">
              <CopilotChat
                sourceCode={copilotCode}
                fileType={copilotFileType}
                onApplyCode={(code) => setCopilotCode(code)}
              />
            </section>
          </div>

          <RecentScansTable
            scans={scans}
            isLoading={isLoading}
            onExport={(s) => setExportScan(s)}
          />
        </div>

        <ReportExportDialog
          scan={exportScan}
          open={exportScan !== null}
          onOpenChange={(v) => {
            if (!v) setExportScan(null);
          }}
        />
      </AppShell>
    </RequireAuth>
  );
}
