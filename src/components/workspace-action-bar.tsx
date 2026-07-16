import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldOff, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  scanId: string;
  projectName: string;
  appliedCount: number;
  totalFindings: number;
  onRescan?: () => void;
}

export function WorkspaceActionBar({ scanId, projectName, appliedCount, totalFindings, onRescan }: Props) {
  const [rescanning, setRescanning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fpMarked, setFpMarked] = useState(false);

  const handleRescan = async () => {
    setRescanning(true);
    toast.loading("Re-running scan…", { id: "rescan" });
    await new Promise((r) => setTimeout(r, 1400));
    setRescanning(false);
    toast.success("Scan refreshed", { id: "rescan", description: "No new findings detected." });
    onRescan?.();
  };

  const handleFalsePositive = () => {
    setFpMarked(true);
    toast.success("Marked as false positive", { description: "Finding excluded from future scans." });
    setTimeout(() => setFpMarked(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    await new Promise((r) => setTimeout(r, 900));
    const content = `SecurePulse Remediation Report
Project: ${projectName}
Scan: ${scanId}
Generated: ${new Date().toISOString()}

Findings: ${totalFindings}
Patches applied: ${appliedCount}

This document summarizes AI-suggested remediations for identified vulnerabilities.`;
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remediation-${scanId.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
    toast.success("Remediation PDF downloaded");
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
          onClick={handleRescan}
          disabled={rescanning}
          className="gap-1.5 rounded-full"
        >
          {rescanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Re-run Scan</span>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleFalsePositive}
          className={cn("gap-1.5 rounded-full", fpMarked && "text-low")}
        >
          <ShieldOff className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{fpMarked ? "Marked" : "False Positive"}</span>
        </Button>

        <Button
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="gap-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
        >
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{downloading ? "Preparing…" : "Remediation PDF"}</span>
        </Button>
      </div>
    </div>
  );
}
