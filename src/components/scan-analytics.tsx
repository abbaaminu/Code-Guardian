import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { TrendingUp, Layers } from "lucide-react";
import type { Severity } from "@/lib/severity";

interface ScanRow {
  id: string;
  project_name: string;
  file_type: string;
  status: string;
  health_score: number;
  vulnerabilities_count: Record<Severity, number>;
  created_at: string;
}

const SEV_COLORS: Record<Severity, string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
};

function totalVulns(c: Record<Severity, number> | undefined) {
  if (!c) return 0;
  return (c.critical ?? 0) + (c.high ?? 0) + (c.medium ?? 0) + (c.low ?? 0);
}

export function ScanAnalytics({ scans }: { scans: ScanRow[] }) {
  const trend = useMemo(() => {
    // Group by day (last 14 days). If no scans, seed with zeros so the chart still renders.
    const days: { key: string; label: string; date: Date }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        date: d,
      });
    }
    const byDay: Record<string, { critical: number; high: number; medium: number; low: number }> = {};
    for (const s of scans) {
      const key = new Date(s.created_at).toISOString().slice(0, 10);
      const bucket = (byDay[key] ??= { critical: 0, high: 0, medium: 0, low: 0 });
      bucket.critical += s.vulnerabilities_count?.critical ?? 0;
      bucket.high += s.vulnerabilities_count?.high ?? 0;
      bucket.medium += s.vulnerabilities_count?.medium ?? 0;
      bucket.low += s.vulnerabilities_count?.low ?? 0;
    }
    return days.map((d) => ({
      label: d.label,
      ...(byDay[d.key] ?? { critical: 0, high: 0, medium: 0, low: 0 }),
    }));
  }, [scans]);

  const byLanguage = useMemo(() => {
    const map: Record<string, { critical: number; high: number; medium: number; low: number }> = {};
    for (const s of scans) {
      const lang = s.file_type || "Unknown";
      const bucket = (map[lang] ??= { critical: 0, high: 0, medium: 0, low: 0 });
      bucket.critical += s.vulnerabilities_count?.critical ?? 0;
      bucket.high += s.vulnerabilities_count?.high ?? 0;
      bucket.medium += s.vulnerabilities_count?.medium ?? 0;
      bucket.low += s.vulnerabilities_count?.low ?? 0;
    }
    return Object.entries(map)
      .map(([language, v]) => ({ language, ...v, total: v.critical + v.high + v.medium + v.low }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [scans]);

  const totalFindings = scans.reduce((n, s) => n + totalVulns(s.vulnerabilities_count), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="border-border/60 bg-card/60 p-5">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Vulnerability trend</h3>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Findings by severity across the last 14 days
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
            <div className="text-lg font-semibold tabular-nums">{totalFindings}</div>
          </div>
        </header>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
                  <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SEV_COLORS[s]} stopOpacity={0.55} />
                    <stop offset="100%" stopColor={SEV_COLORS[s]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
              />
              {(["low", "medium", "high", "critical"] as Severity[]).map((s) => (
                <Area
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stackId="1"
                  stroke={SEV_COLORS[s]}
                  strokeWidth={1.5}
                  fill={`url(#grad-${s})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="border-border/60 bg-card/60 p-5">
        <header className="mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Vulnerabilities by language</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Where risk concentrates across your stack</p>
        </header>
        {byLanguage.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            No scans yet.
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byLanguage} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.35} horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="language"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <Tooltip
                  cursor={{ fill: "color-mix(in oklch, var(--muted) 30%, transparent)" }}
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconSize={8} />
                {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
                  <Bar key={s} dataKey={s} stackId="lang" fill={SEV_COLORS[s]} radius={s === "low" ? [0, 3, 3, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
