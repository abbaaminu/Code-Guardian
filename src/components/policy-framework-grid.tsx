import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Search,
  ShieldAlert,
  Boxes,
  KeyRound,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  Wrench,
  Settings2,
} from "lucide-react";
import type { Policy } from "@/lib/scan-types";

export const FRAMEWORKS = [
  {
    key: "OWASP Top 10",
    icon: ShieldAlert,
    tint: "text-primary",
    ring: "ring-primary/30",
    blurb: "Web application security baseline.",
  },
  {
    key: "Smart Contract Safeguards",
    icon: Boxes,
    tint: "text-high",
    ring: "ring-high/30",
    blurb: "Solidity & EVM contract hardening.",
  },
  {
    key: "Secret Scanning",
    icon: KeyRound,
    tint: "text-medium",
    ring: "ring-medium/30",
    blurb: "Detect leaked credentials & tokens.",
  },
  {
    key: "Regulatory Compliance",
    icon: FileCheck2,
    tint: "text-low",
    ring: "ring-low/30",
    blurb: "SOC 2, HIPAA, PCI-DSS, GDPR alignment.",
  },
] as const;

export type PresetKey = "strict" | "dev" | "custom";

export const PRESETS: {
  key: PresetKey;
  label: string;
  icon: typeof Sparkles;
  description: string;
  match?: (p: Policy) => boolean;
}[] = [
  {
    key: "strict",
    label: "Strict Security Mode",
    icon: Sparkles,
    description: "Enable every policy across all frameworks.",
    match: () => true,
  },
  {
    key: "dev",
    label: "Dev-Friendly",
    icon: Wrench,
    description: "Only medium & high impact: OWASP + Secret Scanning.",
    match: (p) =>
      p.category === "OWASP Top 10" || p.category === "Secret Scanning",
  },
  {
    key: "custom",
    label: "Custom Policy",
    icon: Settings2,
    description: "Fine-tune each rule manually.",
  },
];

export function PolicyPresetSidebar({
  policies,
  activePreset,
  applyingPreset,
  onApply,
}: {
  policies: Policy[];
  activePreset: PresetKey;
  applyingPreset: PresetKey | null;
  onApply: (preset: (typeof PRESETS)[number]) => void;
}) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Quick-select presets
      </div>
      {PRESETS.map((preset) => {
        const Icon = preset.icon;
        const isActive = activePreset === preset.key;
        const isApplying = applyingPreset === preset.key;
        return (
          <button
            key={preset.key}
            onClick={() => onApply(preset)}
            disabled={applyingPreset !== null}
            className={cn(
              "group w-full rounded-lg border p-3 text-left transition",
              isActive
                ? "border-primary/60 bg-primary/5 glow-primary"
                : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70",
              applyingPreset !== null && !isApplying && "opacity-50",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-medium">{preset.label}</span>
              {isApplying && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  applying…
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {preset.description}
            </p>
          </button>
        );
      })}

      <Card className="border-border/60 bg-card/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Compliance coverage
        </div>
        <div className="mt-3 space-y-2">
          {FRAMEWORKS.map((f) => {
            const items = policies.filter((p) => p.category === f.key);
            const on = items.filter((p) => p.enabled).length;
            return (
              <div
                key={f.key}
                className="flex items-center justify-between text-xs"
              >
                <span className="truncate text-muted-foreground">{f.key}</span>
                <Badge
                  variant="outline"
                  className="border-border/60 font-mono text-[10px]"
                >
                  {on}/{items.length}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </aside>
  );
}

export function PolicyFrameworkList({
  policies,
  filtered,
  query,
  isLoading,
  applyingPreset,
  onQueryChange,
  onToggle,
  onApplyPreset,
}: {
  policies: Policy[];
  filtered: Policy[];
  query: string;
  isLoading: boolean;
  applyingPreset: PresetKey | null;
  onQueryChange: (q: string) => void;
  onToggle: (p: Policy, next: boolean) => void;
  onApplyPreset: (preset: (typeof PRESETS)[number]) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search policies (e.g. reentrancy, AWS, HIPAA)…"
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">Loading policies…</div>
      )}

      {FRAMEWORKS.map((framework) => {
        const items = filtered.filter((p) => p.category === framework.key);
        if (items.length === 0 && query) return null;
        const Icon = framework.icon;
        const total = policies.filter(
          (p) => p.category === framework.key,
        ).length;
        const active = policies.filter(
          (p) => p.category === framework.key && p.enabled,
        ).length;
        return (
          <section key={framework.key} className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg bg-card ring-1",
                    framework.ring,
                  )}
                >
                  <Icon className={cn("h-4 w-4", framework.tint)} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    {framework.key}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {framework.blurb}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-border/60 font-mono text-[10px]"
              >
                {active}/{total} active
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {items.map((p) => (
                <Card
                  key={p.id}
                  className={cn(
                    "relative overflow-hidden border-border/60 bg-card/60 p-4 transition",
                    p.enabled && "ring-1 ring-primary/20",
                  )}
                >
                  {p.enabled && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition",
                            p.enabled
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </div>
                        <h3 className="truncate text-sm font-medium">
                          {p.name}
                        </h3>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                    </div>
                    <Switch
                      checked={p.enabled}
                      onCheckedChange={(v) => onToggle(p, v)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Changes apply to every future scan. Existing reports remain unchanged.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onApplyPreset(PRESETS[0])}
          disabled={applyingPreset !== null}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Enable everything
        </Button>
      </div>
    </div>
  );
}
