import { Card } from "@/components/ui/card";
import { Activity, ScanLine, ShieldAlert } from "lucide-react";
import type { ScanTotals } from "@/lib/scan-metrics";

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

// N1: `DashboardTotals`, `computeScanTotals` and `topSeverity` moved to
// src/lib/scan-metrics.ts so this module only exports components.

export function StatCards({ total, critical, avgHealth }: ScanTotals) {
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
