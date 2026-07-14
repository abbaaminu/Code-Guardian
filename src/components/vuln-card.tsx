import { forwardRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/severity-badge";
import { severityRing, type Severity } from "@/lib/severity";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Copy, Wand2, ChevronDown, GitCompareArrows, Check } from "lucide-react";

export interface VulnCardData {
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

interface Props {
  vuln: VulnCardData;
  expanded: boolean;
  applied: boolean;
  onToggle: () => void;
  onApply: () => void;
}

function DiffPane({ label, code, tone }: { label: string; code: string; tone: "bad" | "good" }) {
  const lines = code.split("\n");
  const toneCls =
    tone === "bad"
      ? "border-critical/40 bg-critical/5"
      : "border-low/40 bg-low/5";
  const lineTone = tone === "bad" ? "bg-critical/10" : "bg-low/10";
  const marker = tone === "bad" ? "text-critical" : "text-low";
  return (
    <div className={cn("rounded-md border overflow-hidden", toneCls)}>
      <div className="flex items-center justify-between border-b border-border/40 px-2 py-1 text-[10px] uppercase tracking-widest">
        <span className={tone === "bad" ? "text-critical" : "text-low"}>{label}</span>
        <span className="text-muted-foreground">{lines.length} lines</span>
      </div>
      <pre className="overflow-auto max-h-64 font-mono text-[11px] leading-relaxed">
        <code className="block">
          {lines.map((ln, i) => (
            <div key={i} className={cn("grid grid-cols-[1.5rem_1rem_1fr]", lineTone)}>
              <span className="select-none px-1 text-right text-muted-foreground/60">{i + 1}</span>
              <span className={cn("select-none text-center", marker)}>{tone === "bad" ? "-" : "+"}</span>
              <span className="whitespace-pre pr-2">{ln || " "}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

export const VulnCard = forwardRef<HTMLDivElement, Props>(function VulnCard(
  { vuln, expanded, applied, onToggle, onApply },
  ref,
) {
  const [diffOpen, setDiffOpen] = useState(true);

  const copyPatch = async () => {
    await navigator.clipboard.writeText(vuln.fixed_code_block || "");
    toast.success("Remediation copied");
  };

  return (
    <Card
      ref={ref}
      className={cn(
        "border bg-card/70 p-4 transition-all",
        severityRing(vuln.severity),
        expanded && "glow-primary",
        applied && "opacity-70",
      )}
    >
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-2 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={vuln.severity} />
            {vuln.cwe_id && (
              <span className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {vuln.cwe_id}
              </span>
            )}
            {applied && (
              <span className="inline-flex items-center gap-1 rounded-full bg-low/20 px-2 py-0.5 text-[10px] font-semibold text-low">
                <Check className="h-3 w-3" /> Patched
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold leading-snug">{vuln.title}</h3>
          {(vuln.file_path || vuln.line_start) && (
            <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {vuln.file_path || "source"}
              {vuln.line_start && `:${vuln.line_start}${vuln.line_end && vuln.line_end !== vuln.line_start ? `-${vuln.line_end}` : ""}`}
            </div>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setDiffOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[11px] hover:bg-muted/60"
            >
              <GitCompareArrows className="h-3 w-3" />
              {diffOpen ? "Hide" : "Show"} side-by-side diff
            </button>
          </div>

          {diffOpen && (
            <div className="grid gap-2 md:grid-cols-2">
              <DiffPane label="Vulnerable" code={vuln.vulnerable_code_block || "// —"} tone="bad" />
              <DiffPane label="AI Fixed" code={vuln.fixed_code_block || "// —"} tone="good" />
            </div>
          )}

          {vuln.remediation_steps && (
            <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-[12px] leading-relaxed">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Remediation</div>
              {vuln.remediation_steps}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyPatch} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copy Remediation
            </Button>
            <Button
              size="sm"
              onClick={onApply}
              disabled={applied || !vuln.fixed_code_block}
              className="gap-1.5 bg-primary text-primary-foreground hover:opacity-90"
            >
              {applied ? <><Check className="h-3.5 w-3.5" /> Applied</> : <><Wand2 className="h-3.5 w-3.5" /> Apply Patch</>}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
});
