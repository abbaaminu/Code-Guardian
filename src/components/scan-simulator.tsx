import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight, XCircle, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "warn" | "danger" | "success";
interface Line {
  id: number;
  tone: Tone;
  text: string;
}

// Scripted log sequence — emitted one every 300ms.
const SCRIPT: Array<{ tone: Tone; text: string }> = [
  { tone: "info", text: "initializing securepulse core engine..." },
  { tone: "info", text: "running AST analysis on file tree..." },
  { tone: "warn", text: "[WARNING] potential secret token detected on line 14." },
  { tone: "danger", text: "[DANGER] unvalidated input detected - potential SQL Injection vulnerability found." },
  { tone: "info", text: "comparing findings against OWASP Top 10 policies..." },
  { tone: "info", text: "compiling remediation recommendations..." },
  { tone: "success", text: "scan complete. health score generated: 57/100." },
];

// Filler lines kept in the same retro tone; shown if server response takes longer than the script.
const FILLERS: Array<{ tone: Tone; text: string }> = [
  { tone: "info", text: "cross-referencing CWE Top 25 signatures..." },
  { tone: "info", text: "evaluating cryptographic primitive usage..." },
  { tone: "info", text: "taint-tracking user-controlled sources..." },
  { tone: "info", text: "requesting AI patch synthesis..." },
  { tone: "info", text: "verifying fixed_code_block syntactic integrity..." },
  { tone: "info", text: "sealing audit report..." },
];

const toneCls: Record<Tone, string> = {
  info: "text-[#00ff88]",
  warn: "text-[#ffe066]",
  danger: "text-[#ff5566]",
  success: "text-[#7dff9a]",
};

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
  const [lines, setLines] = useState<Line[]>([]);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const startRef = useRef(0);
  const scriptIdx = useRef(0);
  const fillerIdx = useRef(0);

  // Reset on fresh run.
  useEffect(() => {
    if (running && !completed && !failed) {
      setLines([]);
      setProgress(0);
      idRef.current = 0;
      scriptIdx.current = 0;
      fillerIdx.current = 0;
      startRef.current = performance.now();
    }
  }, [running, completed, failed]);

  // Emit a log line every 300ms.
  useEffect(() => {
    if (!running || completed || failed) return;
    const interval = setInterval(() => {
      const next =
        scriptIdx.current < SCRIPT.length
          ? SCRIPT[scriptIdx.current++]
          : FILLERS[fillerIdx.current++ % FILLERS.length];
      setLines((prev) => [...prev, { id: idRef.current++, tone: next.tone, text: next.text }]);
    }, 300);
    return () => clearInterval(interval);
  }, [running, completed, failed]);

  // Smooth progress toward 95% while running.
  useEffect(() => {
    if (!running || completed || failed) return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const target = Math.min(95, 100 * (1 - Math.exp(-elapsed / 3800)));
      setProgress((p) => (p < target ? p + (target - p) * 0.15 : p));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, completed, failed]);

  // Snap to 100% and ensure the final scripted line is present.
  useEffect(() => {
    if (!completed) return;
    setProgress(100);
    setLines((prev) => {
      const already = new Set(prev.map((l) => l.text));
      const remaining = SCRIPT.filter((s) => !already.has(s.text)).map((s) => ({
        id: idRef.current++,
        tone: s.tone,
        text: s.text,
      }));
      return [...prev, ...remaining];
    });
  }, [completed]);

  useEffect(() => {
    if (!failed) return;
    setLines((prev) => [
      ...prev,
      { id: idRef.current++, tone: "danger", text: "[ERROR] pipeline halted. see details above." },
    ]);
  }, [failed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  const pct = Math.round(progress);

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-[#00ff88]/30 shadow-[0_0_40px_-10px_rgba(0,255,136,0.35)]"
      style={{ background: "#020604" }}
    >
      {/* CRT scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,255,136,0.9) 0px, rgba(0,255,136,0.9) 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* Terminal chrome */}
      <div className="relative flex items-center justify-between border-b border-[#00ff88]/20 bg-black/60 px-4 py-2 font-mono text-[11px]">
        <div className="flex items-center gap-2 text-[#00ff88]/80">
          <Terminal className="h-3.5 w-3.5" />
          <span>securepulse@audit-engine : ~/scan.sh</span>
        </div>
        <div className="flex items-center gap-2 uppercase tracking-widest">
          {completed ? (
            <span className="inline-flex items-center gap-1 text-[#7dff9a]">
              <CheckCircle2 className="h-3 w-3" /> completed
            </span>
          ) : failed ? (
            <span className="inline-flex items-center gap-1 text-[#ff5566]">
              <XCircle className="h-3 w-3" /> failed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[#00ff88]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ff88]" />
              </span>
              live
            </span>
          )}
        </div>
      </div>

      {/* Log stream */}
      <div
        ref={scrollRef}
        className="relative h-[320px] overflow-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed"
        style={{ textShadow: "0 0 6px rgba(0,255,136,0.35)" }}
      >
        {lines.map((l) => (
          <div key={l.id} className="flex gap-2 animate-fade-in">
            <span className="shrink-0 text-[#00ff88]/40">$</span>
            <span className={cn("whitespace-pre-wrap break-words", toneCls[l.tone])}>{l.text}</span>
          </div>
        ))}
        {running && !completed && !failed && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[#00ff88]/60">$</span>
            <span className="inline-block h-3 w-2 animate-pulse bg-[#00ff88]" />
          </div>
        )}
      </div>

      {/* Progress + status */}
      <div className="relative border-t border-[#00ff88]/20 bg-black/70 px-4 py-3 font-mono">
        <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest">
          <span className="text-[#00ff88]/70">
            {completed ? "audit sealed" : failed ? "pipeline error" : "scanning pipeline"}
          </span>
          <span className="tabular-nums text-[#00ff88]">{pct}%</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-[#00ff88]/10">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out",
              failed ? "bg-[#ff5566]" : "bg-gradient-to-r from-[#00ff88] to-[#7dff9a]",
            )}
            style={{
              width: `${pct}%`,
              boxShadow: failed ? undefined : "0 0 12px rgba(0,255,136,0.65)",
            }}
          />
          {!completed && !failed && (
            <div
              className="absolute inset-y-0 w-24 -translate-x-full animate-[scan-shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent"
              style={{ left: `${pct}%` }}
            />
          )}
        </div>

        {completed && scanId && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-[#00ff88]/40 bg-[#00ff88]/5 p-4 text-center animate-fade-in">
            <div className="text-lg font-semibold text-[#7dff9a]">Scan Completed!</div>
            <div className="text-[11px] uppercase tracking-widest text-[#00ff88]/60">
              audit report ready · findings sealed
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Button
                asChild
                size="lg"
                className="bg-[#00ff88] font-semibold text-black hover:bg-[#7dff9a] shadow-[0_0_24px_-4px_rgba(0,255,136,0.85)]"
              >
                <Link to="/scans/$id" params={{ id: scanId }}>
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

        {failed && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[#ff5566]/40 bg-[#ff5566]/5 p-3 text-[#ff5566] animate-fade-in">
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4" /> scan failed. adjust the input and retry.
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
