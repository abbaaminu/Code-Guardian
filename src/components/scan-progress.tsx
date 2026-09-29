import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SEVERITIES, type Severity } from "@/lib/severity";

/**
 * Real state of the deterministic local pass, driven by the actual
 * `POST /api/scan/instant` response (see src/lib/instant-scan.ts) — never by a
 * timer. `engine` and `counts` are what the server actually ran and found.
 */
export interface LocalEngineStage {
  status: "pending" | "running" | "done" | "failed";
  engine: "ast" | "heuristic" | null;
  counts: Record<Severity, number> | null;
  error: string | null;
}

export interface ScanProgressResult {
  id: string;
  health_score: number;
  counts: Record<Severity, number>;
}

export interface ScanProgressProps {
  phase: "running" | "done" | "failed";
  /** Which file type the engines were told to scan (shown for context). */
  fileType: string;
  local: LocalEngineStage;
  result: ScanProgressResult | null;
  error: string | null;
  onDismiss: () => void;
}

type Tone = "info" | "warn" | "danger" | "success";

interface Line {
  tone: Tone;
  text: string;
}

const toneCls: Record<Tone, string> = {
  info: "text-[#00ff88]",
  warn: "text-[#ffe066]",
  danger: "text-[#ff5566]",
  success: "text-[#7dff9a]",
};

const ENGINE_LABEL: Record<"ast" | "heuristic", string> = {
  ast: "AST + taint analysis",
  heuristic: "heuristic pattern rules",
};

function total(counts: Record<Severity, number>): number {
  return SEVERITIES.reduce((sum, sev) => sum + counts[sev], 0);
}

function breakdown(counts: Record<Severity, number>): string {
  const parts = SEVERITIES.filter((sev) => counts[sev] > 0).map(
    (sev) => `${counts[sev]} ${sev}`,
  );
  return parts.length > 0 ? parts.join(", ") : "none";
}

/**
 * Honest scan progress panel.
 *
 * The previous implementation was a scripted animation: it printed invented log
 * lines ("[DANGER] unvalidated input detected…"), invented finding counts and
 * eased a fake percentage toward 95% on a `requestAnimationFrame` loop, so it
 * could (and did) tell users about findings no engine had reported. It is
 * replaced by this panel, which reports only what the two real engines actually
 * returned:
 *
 *   engine 1 — the deterministic local pass, reported by its own HTTP response
 *   engine 2 — the Gemini pass, reported by the scan `runScan` persisted
 *
 * There is deliberately no progress percentage: each engine is a single
 * request/response serverless call with no streaming or job to poll, so a
 * percentage would have to be invented again. The elapsed clock is real, and
 * the bar is indeterminate while work is in flight.
 */
export function ScanProgress({
  phase,
  fileType,
  local,
  result,
  error,
  onDismiss,
}: ScanProgressProps) {
  const startRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (phase === "running") {
      startRef.current = performance.now();
      setElapsedMs(0);
      const id = setInterval(() => {
        if (startRef.current !== null) {
          setElapsedMs(performance.now() - startRef.current);
        }
      }, 200);
      return () => clearInterval(id);
    }
    // Freeze the final duration once the run settles.
    if (startRef.current !== null) {
      setElapsedMs(performance.now() - startRef.current);
      startRef.current = null;
    }
  }, [phase]);

  const lines: Line[] = [
    { tone: "info", text: `input accepted · ${fileType} · engines dispatched` },
  ];

  if (local.status === "done" && local.counts) {
    const localTotal = total(local.counts);
    lines.push({
      tone: localTotal > 0 ? "warn" : "success",
      text: `engine 1 (${local.engine ? ENGINE_LABEL[local.engine] : "local"}) complete · ${localTotal} finding(s): ${breakdown(local.counts)}`,
    });
  } else if (local.status === "failed") {
    lines.push({
      tone: "warn",
      text: `engine 1 unavailable (${local.error ?? "unknown error"}) — engine 2 still runs and persists its own local findings.`,
    });
  } else {
    lines.push({
      tone: "info",
      text: "engine 1 · local deterministic pass in flight",
    });
  }

  if (phase === "running") {
    lines.push({
      tone: "info",
      text: "engine 2 · Gemini contextual pass in flight (no streaming — findings arrive with the response)",
    });
  } else if (phase === "done" && result) {
    lines.push({
      tone: "success",
      text: `engine 2 complete · health score ${result.health_score}/100 · ${total(result.counts)} finding(s) persisted: ${breakdown(result.counts)}`,
    });
  } else if (phase === "failed") {
    lines.push({
      tone: "danger",
      text: error
        ? `pipeline failed · ${error}`
        : "pipeline failed · the server returned no detail",
    });
  }

  const settled = phase !== "running";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-black/60 font-mono text-[12px]",
        phase === "failed" ? "border-[#ff5566]/40" : "border-[#00ff88]/30",
      )}
    >
      <div className="flex items-center justify-between border-b border-[#00ff88]/20 bg-black/70 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#00ff88]/80">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              phase === "running"
                ? "animate-pulse bg-[#00ff88]"
                : phase === "done"
                  ? "bg-[#7dff9a]"
                  : "bg-[#ff5566]",
            )}
          />
          {phase === "running"
            ? "audit pipeline running"
            : phase === "done"
              ? "audit pipeline complete"
              : "audit pipeline failed"}
        </div>
        <span className="tabular-nums text-[11px] text-[#00ff88]/70">
          {(elapsedMs / 1000).toFixed(1)}s
        </span>
      </div>

      <div
        ref={(el) => el?.scrollTo({ top: el.scrollHeight })}
        className="h-52 space-y-1.5 overflow-y-auto px-4 py-3"
        style={{ textShadow: "0 0 6px rgba(0,255,136,0.35)" }}
      >
        {lines.map((line) => (
          <div key={line.text} className="flex gap-2 animate-fade-in">
            <span className="shrink-0 text-[#00ff88]/40">$</span>
            <span
              className={cn(
                "whitespace-pre-wrap break-words",
                toneCls[line.tone],
              )}
            >
              {line.text}
            </span>
          </div>
        ))}
        {!settled && (
          <div className="flex items-center gap-2">
            <span className="text-[#00ff88]/40">$</span>
            <span className="inline-block h-3 w-2 animate-pulse bg-[#00ff88]" />
          </div>
        )}
      </div>
      <div className="border-t border-[#00ff88]/20 bg-black/70 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest">
          <span className="text-[#00ff88]/70">
            {settled ? "engines settled" : "engines in flight"}
          </span>
          {settled && result && (
            <span className="tabular-nums text-[#00ff88]">
              {total(result.counts)} finding(s)
            </span>
          )}
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-[#00ff88]/10">
          <div
            className={cn(
              "h-full rounded-full",
              phase === "failed"
                ? "bg-[#ff5566]"
                : phase === "done"
                  ? "w-full bg-gradient-to-r from-[#00ff88] to-[#7dff9a]"
                  : "w-1/3 animate-[scan-shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-[#00ff88]/60 to-transparent",
            )}
          />
        </div>

        {phase === "done" && result && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-[#00ff88]/40 bg-[#00ff88]/5 p-4 text-center animate-fade-in">
            <div className="text-lg font-semibold text-[#7dff9a]">
              Scan {result.id.slice(0, 8)} complete
            </div>
            <div className="text-[11px] uppercase tracking-widest text-[#00ff88]/60">
              health {result.health_score}/100 · {breakdown(result.counts)}
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Button
                asChild
                size="lg"
                className="bg-[#00ff88] font-semibold text-black shadow-[0_0_24px_-4px_rgba(0,255,136,0.85)] hover:bg-[#7dff9a]"
              >
                <Link to="/scans/$id" params={{ id: result.id }}>
                  View Interactive Audit Report
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-[#00ff88]/70 hover:bg-[#00ff88]/10 hover:text-[#7dff9a]"
              >
                Run another
              </Button>
            </div>
          </div>
        )}

        {phase === "failed" && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[#ff5566]/40 bg-[#ff5566]/5 p-3 text-[#ff5566] animate-fade-in">
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="break-words">
                {error ?? "The scan could not be completed."}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-[#ff5566] hover:bg-[#ff5566]/10"
            >
              dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
