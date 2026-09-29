import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createRemediationReportPdf } from "@/lib/pdf";

interface Props {
  scanId: string;
  projectName: string;
  appliedCount: number;
  totalFindings: number;
  /**
   * Re-reads the scan report from the database. Must be the caller's real
   * query refetch — see `scans.$id.tsx`.
   */
  onRefresh: () => Promise<unknown>;
}

export function WorkspaceActionBar({
  scanId,
  projectName,
  appliedCount,
  totalFindings,
  onRefresh,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Re-reads the persisted report. This deliberately does NOT claim the engines
  // ran again: the previous implementation slept for 1400 ms and then toasted
  // "Scan refreshed — No new findings detected." without re-running anything or
  // even re-reading the database, which could not be true. A real re-scan is
  // started from the dashboard, where the source file is available.
  const handleRefresh = async () => {
    setRefreshing(true);
    toast.loading("Refreshing report…", { id: "refresh" });
    try {
      await onRefresh();
      toast.success("Report refreshed", {
        id: "refresh",
        description: "Re-read the latest persisted findings.",
      });
    } catch (err) {
      toast.error("Could not refresh the report", {
        id: "refresh",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // H6: previous code created a text blob mislabeled as application/pdf —
      // a .pdf file no reader could open. createRemediationReportPdf builds a
      // real, spec-valid PDF (see src/lib/pdf.ts).
      const blob = createRemediationReportPdf({
        projectName,
        scanId,
        totalFindings,
        appliedCount,
        generatedAt: new Date().toISOString(),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remediation-${scanId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Remediation PDF downloaded");
    } catch (err) {
      console.error("Failed to generate remediation PDF:", err);
      toast.error("Could not generate the PDF report.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 animate-fade-in">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/70 bg-background/85 px-2 py-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="hidden items-center gap-2 border-r border-border/60 pr-3 pl-2 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Workspace
          </span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh scan report"
          className="gap-1.5 rounded-full"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {refreshing ? "Refreshing…" : "Refresh"}
          </span>
        </Button>

        <Button
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          aria-label="Download remediation PDF"
          className="gap-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {downloading ? "Preparing…" : "Remediation PDF"}
          </span>
        </Button>
      </div>
    </div>
  );
}
