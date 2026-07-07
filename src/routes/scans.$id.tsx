import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/severity-badge";
import { CodeBlock } from "@/components/code-block";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Copy, ShieldCheck } from "lucide-react";
import type { Severity } from "@/lib/severity";
import { severityRing } from "@/lib/severity";

interface Vuln {
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
      { name: "description", content: "Vulnerability report with AI-suggested patches and remediation steps." },
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

  const { data, isLoading } = useQuery({
    queryKey: ["scan", id],
    queryFn: async () => {
      const [{ data: scan, error: e1 }, { data: vulns, error: e2 }] = await Promise.all([
        supabase.from("scans").select("*").eq("id", id).single(),
        supabase.from("vulnerabilities").select("*").eq("scan_id", id).order("severity"),
      ]);
      if (e1) throw e1;
      if (!scan) throw notFound();
      if (e2) throw e2;
      return { scan: scan as unknown as Scan, vulns: (vulns ?? []) as unknown as Vuln[] };
    },
  });

  if (isLoading || !data) {
    return (
      <AppShell title="Audit workspace">
        <div className="p-10 text-sm text-muted-foreground">Loading report…</div>
      </AppShell>
    );
  }

  const { scan, vulns } = data;
  const highlights = vulns
    .filter((v) => v.line_start && v.line_end)
    .map((v) => ({ start: v.line_start!, end: v.line_end!, severity: v.severity }));

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Fixed code copied");
  };

  return (
    <AppShell
      title={scan.project_name}
      subtitle={`${scan.file_type} · ${new Date(scan.created_at).toLocaleString()} · ${vulns.length} findings`}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link>
        </Button>
      }
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] min-h-[calc(100vh-3.5rem)]">
        <section className="border-b border-border/60 bg-[oklch(0.14_0.02_250)] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Submitted source</div>
              <div className="text-sm font-medium">{scan.project_name}</div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Health {scan.health_score}/100
            </div>
          </div>
          <CodeBlock code={scan.source_code || "// (no source available)"} highlightLines={highlights} />
        </section>

        <aside className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Findings</h2>
            <div className="flex gap-1">
              {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
                <span key={s} className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] tabular-nums">
                  <span className="mr-1 uppercase text-muted-foreground">{s[0]}</span>
                  {scan.vulnerabilities_count?.[s] ?? 0}
                </span>
              ))}
            </div>
          </div>

          {vulns.length === 0 && (
            <Card className="border-low/40 bg-low/5 p-6 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-low" />
              <div className="mt-3 text-sm font-medium">No vulnerabilities detected</div>
              <p className="mt-1 text-xs text-muted-foreground">This code passed all enabled policies.</p>
            </Card>
          )}

          <div className="space-y-3">
            {vulns.map((v) => (
              <Card key={v.id} className={`border ${severityRing(v.severity)} bg-card/70 p-4`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={v.severity} />
                      {v.cwe_id && <span className="text-[10px] text-muted-foreground">{v.cwe_id}</span>}
                    </div>
                    <h3 className="mt-1 text-sm font-semibold leading-snug">{v.title}</h3>
                    {v.file_path && (
                      <div className="text-[11px] text-muted-foreground">{v.file_path}{v.line_start && `:${v.line_start}`}</div>
                    )}
                  </div>
                </div>

                {v.vulnerable_code_block && (
                  <div className="mb-2">
                    <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Vulnerable</div>
                    <CodeBlock code={v.vulnerable_code_block} className="text-[11.5px]" />
                  </div>
                )}

                {v.fixed_code_block && (
                  <div className="mb-2">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-widest text-primary">AI patch suggestion</div>
                      <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-[11px]" onClick={() => copy(v.fixed_code_block)}>
                        <Copy className="h-3 w-3" />Copy
                      </Button>
                    </div>
                    <CodeBlock code={v.fixed_code_block} className="text-[11.5px] border-primary/30" />
                  </div>
                )}

                {v.remediation_steps && (
                  <div className="mt-2 rounded-md border border-border/60 bg-muted/30 p-3 text-[12px] leading-relaxed">
                    <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Remediation</div>
                    {v.remediation_steps}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
