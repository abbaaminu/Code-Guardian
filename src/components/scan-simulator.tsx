import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldCheck, ArrowRight, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "warn" | "success" | "error";
interface Line { t: number; tone: Tone; text: string }

const STAGES: Array<{ at: number; tone: Tone; text: string }> = [
  { at: 2,  tone: "info",    text: "Initializing SecurePulse Pipeline v1.0.0..." },
  { at: 6,  tone: "info",    text: "Establishing enterprise non-training tier channel..." },
  { at: 10, tone: "success", text: "Secure payload envelope negotiated (TLS 1.3, AES-256-GCM)." },
  { at: 15, tone: "info",    text: "Parsing AST for security patterns..." },
  { at: 22, tone: "info",    text: "Tokenizing source · resolving identifiers · building CFG..." },
  { at: 30, tone: "info",    text: "Running taint analysis across data-flow graph..." },
  { at: 38, tone: "warn",    text: "Potential Secrets Exposure detected in lines 12-14..." },
  { at: 46, tone: "info",    text: "Cross-referencing CWE Top 25 signatures..." },
  { at: 54, tone: "warn",    text: "Injection sink reachable from user-controlled source." },
  { at: 62, tone: "info",    text: "Evaluating cryptographic primitive usage..." },
  { at: 70, tone: "success", text: "Compliance mapping to OWASP Top 10 complete." },
  { at: 78, tone: "info",    text: "Requesting AI patch synthesis from Gemini-2.5-Flash..." },
  { at: 86, tone: "info",    text: "Verifying fixed_code_block syntactic integrity..." },
  { at: 92, tone: "success", text: "Remediation plan generated. Zero-hallucination checks passed." },
  { at: 97, tone: "info",    text: "Finalizing integrity score & sealing audit report..." },
];

const toneCls: Record<Tone, string> = {
  info: "text-[oklch(0.82_0.10_210)]",
  warn: "text-medium",
  success: "text-low",
  error: "text-critical",
};
const tag: Record<Tone, string> = { info: "INFO", warn: "WARN", success: "SUCCESS", error: "ERROR" };

export function ScanSimulator({
  running,
  completed,
  failed,
  scanId,
  onDismiss,
}: {
  running: boolean;
  completed: boolean;
  failed: boolean;
  scanId: string | null;
  onDismiss: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number>(0);
  const nextIdx = useRef(0);

  // Reset when a new run begins.
  useEffect(() => {
    if (running && !completed && !failed) {
      setProgress(0);
      setLines([]);
      nextIdx.current = 0;
      startRef.current = performance.now();
    }
  }, [running, completed, failed]);

  // Animate progress + rolling log while the scan is in-flight.
  useEffect(() => {
    if (!running || completed || failed) return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      // Ease toward 95% over ~12s while the server call completes.
      const target = Math.min(95, 100 * (1 - Math.exp(-elapsed / 4200)));
      setProgress((p) => (p < target ? p + (target - p) * 0.12 : p));

      while (
        nextIdx.current < STAGES.length &&
        STAGES[nextIdx.current].at <= (elapsed / 4200) * 95
      ) {
        const s = STAGES[nextIdx.current++];
        setLines((prev) => [...prev, { t: Date.now(), tone: s.tone, text: s.text }]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, completed, failed]);

  // Snap to 100% and drop a completion line.
  useEffect(() => {
    if (!completed) return;
    setProgress(100);
    // Flush any remaining scripted lines.
    setLines((prev) => {
      const remaining = STAGES.slice(nextIdx.current).map((s) => ({ t: Date.now(), tone: s.tone, text: s.text }));
      nextIdx.current = STAGES.length;
      return [
        ...prev,
        ...remaining,
        { t: Date.now(), tone: "success" as Tone, text: "Scan completed successfully. Audit report sealed." },
      ];
    });
  }, [completed]);

  useEffect(() => {
    if (!failed) return;
    setLines((prev) => [...prev, { t: Date.now(), tone: "error" as Tone, text: "Pipeline halted. See error details above." }]);
  }, [failed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const pct = Math.round(progress);

  return (
    <Card className="overflow-hidden border-primary/40 bg-card/70 p-0 glow-primary">
      {/* Terminal chrome */}
      <div className="flex items-center justify-between border-b border-border/60 bg-[oklch(0.13_0.02_250)] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-critical/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-medium/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-low/70" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">securepulse@pipeline · scan.sh</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
          {completed ? (
            <span className="inline-flex items-center gap-1 text-low"><CheckCircle2 className="h-3 w-3" /> completed</span>
          ) : failed ? (
            <span className="inline-flex items-center gap-1 text-critical"><XCircle className="h-3 w-3" /> failed</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              live
            </span>
          )}
        </div>
      </div>

      {/* Rolling log */}
      <div
        ref={scrollRef}
        className="h-[300px] overflow-auto bg-[oklch(0.10_0.02_250)] p-4 font-mono text-[12.5px] leading-relaxed"
      >
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2 animate-fade-in">
            <span className="shrink-0 text-muted-foreground/50 tabular-nums">
              {new Date(l.t).toLocaleTimeString(undefined, { hour12: false })}
            </span>
            <span className={cn("shrink-0 font-semibold", toneCls[l.tone])}>[{tag[l.tone]}]</span>
            <span className="text-foreground/90">{l.text}</span>
          </div>
        ))}
        {running && !completed && !failed && (
          <div className="mt-1 flex items-center gap-2 text-primary">
            <span className="text-muted-foreground/70">$</span>
            <span className="inline-block h-3 w-2 animate-pulse bg-primary" />
          </div>
        )}
      </div>

      {/* Progress + status */}
      <div className="border-t border-border/60 bg-card/80 p-4">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="font-mono uppercase tracking-widest text-muted-foreground">
            {completed ? "Audit sealed" : failed ? "Pipeline error" : "Scanning pipeline"}
          </span>
          <span className="font-mono tabular-nums text-primary">{pct}%</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted/40">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out",
              failed ? "bg-critical" : "bg-gradient-to-r from-primary via-primary to-[oklch(0.82_0.14_195)]",
            )}
            style={{ width: `${pct}%` }}
          />
          {!completed && !failed && (
            <div
              className="absolute inset-y-0 w-24 -translate-x-full animate-[scan-shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{ left: `${pct}%` }}
            />
          )}
        </div>

        {completed && scanId && (
          <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-low/40 bg-low/5 p-3 animate-fade-in sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-low/20">
                <ShieldCheck className="h-5 w-5 text-low" />
              </div>
              <div>
                <div className="text-sm font-semibold">Scan Completed successfully</div>
                <div className="text-[11px] text-muted-foreground">Findings, patches, and remediation are ready to review.</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onDismiss}>Run another</Button>
              <Button asChild size="sm" className="glow-primary">
                <Link to="/scans/$id" params={{ id: scanId }}>
                  View full report <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {failed && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-critical/40 bg-critical/5 p-3 animate-fade-in">
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-critical" /> Scan failed. Adjust the input and retry.
            </div>
            <Button variant="ghost" size="sm" onClick={onDismiss}>Dismiss</Button>
          </div>
        )}

        {!completed && !failed && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Streaming secure audit events · payload isolated from training data
          </div>
        )}
      </div>
    </Card>
  );
}
