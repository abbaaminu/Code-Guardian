import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  FileJson,
  FileCode2,
  Printer,
  ShieldCheck,
  Download,
} from "lucide-react";
import type { Severity } from "@/lib/severity";
import { getScanReport, getScanSarif } from "@/lib/scan.functions";
import { summarizeCompliance } from "@/lib/compliance-mapping";
import type { ScanSummary } from "@/lib/scan-types";

/**
 * The scan shape the export dialog needs. Alias of the canonical `ScanSummary`
 * domain type, kept under its historical name for stable call sites.
 */
export type ExportScan = ScanSummary;

const SEV_TINT: Record<Severity, string> = {
  critical: "bg-critical/15 text-critical border-critical/40",
  high: "bg-high/15 text-high border-high/40",
  medium: "bg-medium/15 text-medium border-medium/40",
  low: "bg-low/15 text-low border-low/40",
};

function total(c: Record<Severity, number> | undefined) {
  if (!c) return 0;
  return (c.critical ?? 0) + (c.high ?? 0) + (c.medium ?? 0) + (c.low ?? 0);
}

function verdict(score: number) {
  if (score >= 85) return { label: "Production ready", tone: "text-low" };
  if (score >= 65)
    return { label: "Minor remediation advised", tone: "text-medium" };
  if (score >= 40) return { label: "Requires remediation", tone: "text-high" };
  return { label: "Do not deploy", tone: "text-critical" };
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ReportExportDialog({
  scan,
  open,
  onOpenChange,
}: {
  scan: ExportScan | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [busy, setBusy] = useState<"pdf" | "json" | "sarif" | null>(null);
  const getReport = useServerFn(getScanReport);
  const getSarif = useServerFn(getScanSarif);

  // Fetched lazily (only while the dialog is open) so the compliance summary
  // and SARIF export are computed from the scan's ACTUAL findings, not the
  // hardcoded "OWASP Top 10 mapped / CWE Top 25 cross-referenced" bullet list
  // this dialog used to show regardless of what was actually found.
  const reportQuery = useQuery({
    queryKey: ["scan-report", scan?.id],
    queryFn: () => getReport({ data: { id: scan!.id } }),
    enabled: open && !!scan,
  });

  if (!scan) return null;
  const v = verdict(scan.health_score);
  const counts = scan.vulnerabilities_count ?? {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const findings = total(counts);
  const vulns = reportQuery.data?.vulns ?? [];
  const compliance = summarizeCompliance(vulns.map((vv) => vv.cwe_id));

  const downloadJson = async () => {
    setBusy("json");
    try {
      const payload = {
        report_type: "SecurePulse Executive Summary",
        generated_at: new Date().toISOString(),
        scan: {
          id: scan.id,
          project: scan.project_name,
          language: scan.file_type,
          status: scan.status,
          created_at: scan.created_at,
          integrity_score: scan.health_score,
          verdict: v.label,
          findings_total: findings,
          findings_by_severity: counts,
        },
        // Computed from this scan's actual CWE ids — see compliance-mapping.ts —
        // rather than a static claim that every scan "maps to" every framework.
        compliance: {
          owasp_categories: compliance.owaspCategories,
          cwe_top_25_hits: compliance.cweTop25Hits,
          pci_dss_requirements: compliance.pciDssRequirements,
          soc2_criteria: compliance.soc2Criteria,
        },
        findings: vulns.map((vv) => ({
          title: vv.title,
          severity: vv.severity,
          cwe_id: vv.cwe_id,
          file_path: vv.file_path,
          line_start: vv.line_start,
          line_end: vv.line_end,
        })),
      };
      downloadBlob(
        JSON.stringify(payload, null, 2),
        "application/json",
        `securepulse-${scan.project_name.replace(/\s+/g, "-")}-${scan.id.slice(0, 8)}.json`,
      );
    } finally {
      setBusy(null);
    }
  };

  const downloadSarif = async () => {
    setBusy("sarif");
    try {
      const sarif = await getSarif({ data: { id: scan.id } });
      downloadBlob(
        JSON.stringify(sarif, null, 2),
        "application/json",
        `securepulse-${scan.project_name.replace(/\s+/g, "-")}-${scan.id.slice(0, 8)}.sarif`,
      );
    } finally {
      setBusy(null);
    }
  };

  const printPdf = async () => {
    setBusy("pdf");
    // Ensure the compliance summary has loaded before the browser print dialog
    // captures the DOM, so the printed PDF isn't missing the section.
    if (reportQuery.isLoading) await reportQuery.refetch();
    setBusy(null);
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <div className="border-b border-border/60 bg-gradient-to-br from-card to-card/60 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Audit executive summary
            </DialogTitle>
            <DialogDescription>
              Printable snapshot of repository integrity and compliance posture.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div
          id="printable-report"
          className="max-h-[65vh] space-y-5 overflow-auto px-6 py-6"
        >
          <section className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Project
              </div>
              <div className="text-lg font-semibold tracking-tight">
                {scan.project_name}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {scan.file_type} · {new Date(scan.created_at).toLocaleString()}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                Scan ID · {scan.id}
              </div>
            </div>
            <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-center glow-primary">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Integrity
              </div>
              <div className="text-3xl font-bold tabular-nums text-primary">
                {scan.health_score}
              </div>
              <div className={`text-[10px] font-medium ${v.tone}`}>
                {v.label}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Findings by severity
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["critical", "high", "medium", "low"] as Severity[]).map(
                (s) => (
                  <div
                    key={s}
                    className={`rounded-md border px-3 py-2 ${SEV_TINT[s]}`}
                  >
                    <div className="text-lg font-bold tabular-nums">
                      {counts[s] ?? 0}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest opacity-80">
                      {s}
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {findings} total finding{findings === 1 ? "" : "s"} across
              enforced policy set.
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border/60 bg-muted/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Compliance
              </div>
              {reportQuery.isLoading ? (
                <div className="mt-1.5 text-xs text-muted-foreground">
                  Computing from findings…
                </div>
              ) : (
                <ul className="mt-1.5 space-y-0.5 text-xs">
                  <li>
                    · OWASP:{" "}
                    {compliance.owaspCategories.length
                      ? compliance.owaspCategories.join(", ")
                      : "no mapped categories"}
                  </li>
                  <li>· CWE Top 25 hits: {compliance.cweTop25Hits}</li>
                  <li>
                    · PCI-DSS:{" "}
                    {compliance.pciDssRequirements.length
                      ? compliance.pciDssRequirements.join(", ")
                      : "none triggered"}
                  </li>
                  <li>
                    · SOC 2:{" "}
                    {compliance.soc2Criteria.length
                      ? compliance.soc2Criteria.join(", ")
                      : "none triggered"}
                  </li>
                </ul>
              )}
            </div>
            <div className="rounded-md border border-border/60 bg-muted/20 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Pipeline
              </div>
              <ul className="mt-1.5 space-y-0.5 text-xs">
                <li>
                  · Status · <span className="font-medium">{scan.status}</span>
                </li>
                <li>· Engines · structural (AST/heuristic) + AI</li>
              </ul>
            </div>
          </section>

          <section className="rounded-md border border-border/60 bg-card/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
            This executive summary is generated from the latest scan snapshot.
            For per-finding remediation, side-by-side diffs, and AI-suggested
            patches, open the interactive workspace.
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-card/40 px-6 py-3 print:hidden">
          <p className="text-[10px] text-muted-foreground">
            SecurePulse · confidential
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadJson}
              disabled={busy !== null}
            >
              {busy === "json" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Packaging…
                </>
              ) : (
                <>
                  <FileJson className="mr-1.5 h-3.5 w-3.5" />
                  Export JSON
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSarif}
              disabled={busy !== null}
            >
              {busy === "sarif" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Building…
                </>
              ) : (
                <>
                  <FileCode2 className="mr-1.5 h-3.5 w-3.5" />
                  Export SARIF
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={printPdf}
              disabled={busy !== null}
              className="glow-primary"
            >
              {busy === "pdf" ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Rendering PDF…
                </>
              ) : (
                <>
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print / Save as PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const ExportIcon = Download;
