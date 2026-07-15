import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CodeVault } from "@/components/code-vault";
import { VulnCard, type VulnCardData } from "@/components/vuln-card";
import { getScanReport } from "@/lib/scan.functions";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import type { Severity } from "@/lib/severity";


interface Scan {
  id: string;
  project_name: string;
  file_type: string;
  status: string;
  health_score: number;
  vulnerabilities_count: Record<Severity, number>;
  source_code: string;
  created_at: string;
}

export const Route = createFileRoute("/scans/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Audit ${params.id.slice(0, 8)} · SecurePulse` },
      { name: "description", content: "Interactive code audit workspace with AI-suggested patches and side-by-side diffs." },
    ],
  }),
  component: ScanReport,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-sm text-muted-foreground">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">Scan not found.</div>
  ),
});

function ScanReport() {
  const { id } = Route.useParams();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [patchedLines, setPatchedLines] = useState<Set<number>>(new Set());
  const [flashLines, setFlashLines] = useState<Set<number>>(new Set());
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchReport = useServerFn(getScanReport);
  const { data, isLoading } = useQuery({
    queryKey: ["scan", id],
    queryFn: async () => {
      const res = await fetchReport({ data: { id } });
      return {
        scan: res.scan as unknown as Scan,
        vulns: res.vulns as unknown as VulnCardData[],
      };
    },
  });


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
    return (
      <AppShell title="Audit workspace">
        <div className="p-10 text-sm text-muted-foreground">Loading report…</div>
      </AppShell>
    );
  }

  const { scan, vulns } = data;

  const handleLineClick = (vulnId: string) => {
    setActiveId(vulnId);
    requestAnimationFrame(() => {
      cardRefs.current[vulnId]?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    toast.success("Patch applied", { description: `Lines ${v.line_start}-${v.line_end} secured` });
    setTimeout(() => setFlashLines(new Set()), 1500);
  };

  const appliedCount = Object.values(applied).filter(Boolean).length;

  return (
    <AppShell
      title={scan.project_name}
      subtitle={`${scan.file_type} · ${new Date(scan.created_at).toLocaleString()} · ${vulns.length} findings`}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Dashboard</Link>
        </Button>
      }
    >
      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(420px,480px)]">
        {/* LEFT — Code Vault */}
        <section className="min-w-0">
          <CodeVault
            code={scan.source_code || "// (no source available)"}
            highlights={highlights}
            activeVulnId={activeId}
            patchedLines={new Set([...patchedLines, ...flashLines])}
            onLineClick={handleLineClick}
          />
        </section>

        {/* RIGHT — Actionable Audit Panel */}
        <aside className="flex min-h-0 flex-col gap-3">
          <Card className="border-primary/30 bg-gradient-to-br from-card to-card/50 p-4 glow-primary">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Integrity Score</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums text-primary">{scan.health_score}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
              {(["critical","high","medium","low"] as Severity[]).map((s) => (
                <div key={s} className="rounded-md border border-border/60 bg-muted/20 py-1.5">
                  <div className="text-sm font-bold tabular-nums">{scan.vulnerabilities_count?.[s] ?? 0}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{s}</div>
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
            <span className="text-[10px] text-muted-foreground">click a line to inspect</span>
          </div>

          <div className="flex-1 space-y-3 overflow-auto pb-6 pr-1">
            {vulns.length === 0 ? (
              <Card className="border-low/40 bg-low/5 p-8 text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-low" />
                <div className="mt-3 text-sm font-medium">All clear</div>
                <p className="mt-1 text-xs text-muted-foreground">No vulnerabilities detected.</p>
              </Card>
            ) : (
              vulns.map((v) => (
                <VulnCard
                  key={v.id}
                  ref={(el) => { cardRefs.current[v.id] = el; }}
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
    </AppShell>
  );
}
