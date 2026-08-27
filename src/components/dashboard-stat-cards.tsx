import { Card } from "@/components/ui/card";
import { Activity, ScanLine, ShieldAlert } from "lucide-react";
import { SEVERITIES, type Severity } from "@/lib/severity";
import type { ScanSummary } from "@/lib/scan-types";

// L1: static UI metadata hoisted out of the render path so it isn't recreated
// on every render.
const STAT_CARD_META = [
  { label: "Repos scanned", icon: ScanLine, tint: "text-primary" },
  {
    label: "Active critical exploits",
    icon: ShieldAlert,
    tint: "text-critical",
  },
  { label: "Avg code health score", icon: Activity, tint: "text-primary" },
] as const;

export interface DashboardTotals {
  total: number;
  critical: number;
  avgHealth: number;
}

/** Derive the three headline stats from the scans list. */
export function computeScanTotals(scans: ScanSummary[]): DashboardTotals {
  return {
    total: scans.length,
    critical: scans.reduce(
      (n, s) => n + (s.vulnerabilities_count?.critical ?? 0),
      0,
    ),
    avgHealth: scans.length
      ? Math.round(
          scans.reduce((n, s) => n + (s.health_score ?? 0), 0) / scans.length,
        )
      : 0,
  };
}

export function StatCards({ total, critical, avgHealth }: DashboardTotals) {
  const values = [total, critical, `${avgHealth}/100`] as const;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {STAT_CARD_META.map((c, i) => (
        <Card key={c.label} className="border-border/60 bg-card/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {c.label}
            </span>
            <c.icon className={`h-4 w-4 ${c.tint}`} />
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">
            {values[i]}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function HealthBar({ score }: { score: number }) {
  // M10: clamp so an out-of-range/NaN health score can't render a broken bar
  // (negative/oversized widths) or a bogus color bucket.
  const clamped = Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : 0;
  const color =
    clamped >= 80
      ? "bg-low"
      : clamped >= 50
        ? "bg-medium"
        : clamped >= 30
          ? "bg-high"
          : "bg-critical";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="tabular-nums text-xs text-muted-foreground">
        {clamped}
      </span>
    </div>
  );
}

export function topSeverity(
  counts: Record<Severity, number> | undefined,
): Severity | null {
  if (!counts) return null;
  for (const s of SEVERITIES) if ((counts[s] ?? 0) > 0) return s;
  return null;
}
