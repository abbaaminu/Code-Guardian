import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeVault } from "@/components/code-vault";
import { VulnCard, type VulnCardData } from "@/components/vuln-card";
import { WorkspaceActionBar } from "@/components/workspace-action-bar";
import { CopilotChat } from "@/components/copilot-chat";
import {
  RouteErrorFallback,
  RoutePendingFallback,
} from "@/components/route-boundaries";
import { RequireAuth } from "@/components/require-auth";
import { useScanReportQuery } from "@/hooks/use-scan-queries";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { SEVERITIES } from "@/lib/severity";
import { z } from "zod";

export interface ScanReportLoaderData {
  scanId: string;
}

export const Route = createFileRoute("/scans/$id")({
  head: ({ params }: { params: { id: string } }) => ({
    meta: [
      { title: `Audit ${params.id.slice(0, 8)} · SecurePulse` },
      {
        name: "description",
        content:
          "Interactive code audit workspace with AI-suggested patches and side-by-side diffs.",
      },
    ],
  }),
  // Reject malformed scan ids before any fetch: return `false` so the router
  // renders this route's notFoundComponent instead of a blank page. Mirrors the
  // server-side `z.uuid()` validator in getScanReport.
  parseParams: ({ id }) => {
    if (!z.string().uuid().safeParse(id).success) return false;
    return { id };
  },
  loader: async (ctx) => ({ scanId: ctx.params.id }),
  component: ScanReport,
  errorComponent: RouteErrorFallback,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary">Scan not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This audit doesn't exist or may have been deleted.
        </p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  ),
  pendingComponent: RoutePendingFallback,
  pendingMs: 300,
});

function ScanReport() {
  const { scanId } = Route.useLoaderData();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [patchedLines, setPatchedLines] = useState<Set<number>>(new Set());
  const [flashLines, setFlashLines] = useState<Set<number>>(new Set());
  const [liveCode, setLiveCode] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data, isLoading, isError, refetch } = useScanReportQuery(scanId);

  const highlights = useMemo(() => {
    if (!data) return [];
    return data.vulns
      .filter((v) => v.line_start && v.line_end)
      .map((v) => ({
        start: v.line_start!,
        end: v.line_end!,
        severity: v.severity,
        vulnId: v.id,
      }));
  }, [data]);

  if (isLoading || !data) {
    // Keep the shell frame consistent while the report loads; hard failures get
    // a retry action instead of a perpetual spinner.
    if (isError && !data) {
      return (
        <RequireAuth>
          <AppShell title="Audit workspace">
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center">
              <p className="text-sm font-medium">
                Couldn't load this scan report.
              </p>
              <p className="text-xs text-muted-foreground">
                The scan may have been removed, or your session expired.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </AppShell>
        </RequireAuth>
      );
    }
    return (
      <RequireAuth>
        <AppShell title="Audit workspace">
          <div className="p-10 text-sm text-muted-foreground">
            Loading report…
          </div>
        </AppShell>
      </RequireAuth>
    );
  }

  const { scan, vulns } = data;
  const displayedCode = liveCode ?? scan.source_code ?? "";

  const handleLineClick = (vulnId: string) => {
    setActiveId(vulnId);
    requestAnimationFrame(() => {
      cardRefs.current[vulnId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const handleToggle = (vulnId: string) => {
    setActiveId((cur) => (cur === vulnId ? null : vulnId));
  };

  const handleApply = (v: VulnCardData) => {
    if (!v.line_start || !v.line_end) {
      toast.error("No line range for this finding");
      return;
    }
    const lines = new Set<number>();
    for (let i = v.line_start; i <= v.line_end; i++) lines.add(i);
    setPatchedLines((prev) => new Set([...prev, ...lines]));
    setFlashLines(lines);
    setApplied((prev) => ({ ...prev, [v.id]: true }));
    toast.success("Patch applied", {
      description: `Lines ${v.line_start}-${v.line_end} secured`,
    });
    setTimeout(() => setFlashLines(new Set()), 1500);
  };

  const appliedCount = Object.values(applied).filter(Boolean).length;

  return (
    <RequireAuth>
      <AppShell
        title={scan.project_name}
        subtitle={`${scan.file_type} · ${new Date(scan.created_at).toLocaleString()} · ${vulns.length} findings`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Dashboard
            </Link>
          </Button>
        }
      >
        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)_minmax(380px,440px)] lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
          {/* LEFT — Code Vault */}
          <section className="min-w-0">
            <CodeVault
              code={displayedCode || "// (no source available)"}
              highlights={highlights}
              activeVulnId={activeId}
              patchedLines={new Set([...patchedLines, ...flashLines])}
              onLineClick={handleLineClick}
            />
          </section>

          {/* MIDDLE — AI Copilot Chat */}
          <section className="min-w-0 h-[calc(100vh-3.5rem)]">
            <CopilotChat
              sourceCode={displayedCode}
              fileType={scan.file_type}
              onApplyCode={(code) => {
                setLiveCode(code);
                setPatchedLines(new Set());
                setFlashLines(new Set());
              }}
            />
          </section>

          {/* RIGHT — Actionable Audit Panel */}
          <aside className="flex min-h-0 flex-col gap-3">
            <Card className="border-primary/30 bg-gradient-to-br from-card to-card/50 p-4 glow-primary">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Integrity Score
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums text-primary">
                      {scan.health_score}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                {SEVERITIES.map((s) => (
                  <div
                    key={s}
                    className="rounded-md border border-border/60 bg-muted/20 py-1.5"
                  >
                    <div className="text-sm font-bold tabular-nums">
                      {scan.vulnerabilities_count?.[s] ?? 0}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      {s}
                    </div>
                  </div>
                ))}
              </div>
              {appliedCount > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-low/40 bg-low/10 px-2.5 py-1.5 text-[11px] text-low animate-fade-in">
                  <Sparkles className="h-3.5 w-3.5" />
                  {appliedCount} patch{appliedCount === 1 ? "" : "es"} applied
                </div>
              )}
            </Card>

            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Findings ({vulns.length})
              </h2>
              <span className="text-[10px] text-muted-foreground">
                click a line to inspect
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-auto pb-6 pr-1">
              {vulns.length === 0 ? (
                <Card className="border-low/40 bg-low/5 p-8 text-center">
                  <ShieldCheck className="mx-auto h-12 w-12 text-low" />
                  <div className="mt-3 text-sm font-medium">All clear</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No vulnerabilities detected.
                  </p>
                </Card>
              ) : (
                vulns.map((v) => (
                  <VulnCard
                    key={v.id}
                    ref={(el) => {
                      cardRefs.current[v.id] = el;
                    }}
                    vuln={v}
                    expanded={activeId === v.id}
                    applied={!!applied[v.id]}
                    onToggle={() => handleToggle(v.id)}
                    onApply={() => handleApply(v)}
                  />
                ))
              )}
            </div>
          </aside>
        </div>
        <WorkspaceActionBar
          scanId={scan.id}
          projectName={scan.project_name}
          appliedCount={appliedCount}
          totalFindings={vulns.length}
        />
      </AppShell>
    </RequireAuth>
  );
}
