import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import {
  PRESETS,
  PolicyFrameworkList,
  PolicyPresetSidebar,
  type PresetKey,
} from "@/components/policy-framework-grid";
import {
  RouteErrorFallback,
  RoutePendingFallback,
} from "@/components/route-boundaries";
import { usePoliciesQuery } from "@/hooks/use-scan-queries";
import { listPolicies, togglePolicy } from "@/lib/scan.functions";
import type { Policy } from "@/lib/scan-types";

export interface PoliciesLoaderData {
  policies: Policy[];
}

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Security Policies · SecurePulse" },
      {
        name: "description",
        content:
          "Toggle OWASP Top 10, smart-contract safeguards, secret scanning, and regulatory compliance policies applied to every SecurePulse audit.",
      },
    ],
  }),
  component: Policies,
  loader: async (): Promise<PoliciesLoaderData> => {
    // SSR-safe loader (see src/routes/dashboard.tsx for the rationale): the
    // auth token exists only on the client, so protected data is fetched there
    // and seeded into the query below.
    if (import.meta.env.SSR) return { policies: [] };
    try {
      const res = await listPolicies();
      return { policies: (res || []) as Policy[] };
    } catch (err) {
      console.warn(
        "Failed to preload policies, deferring to client fetch:",
        err,
      );
      return { policies: [] };
    }
  },
  errorComponent: RouteErrorFallback,
  pendingComponent: RoutePendingFallback,
  pendingMs: 300,
});

function Policies() {
  const qc = useQueryClient();
  const toggleFn = useServerFn(togglePolicy);
  const { policies, isLoading } = usePoliciesQuery(
    Route.useLoaderData().policies,
  );
  const [query, setQuery] = useState("");
  const [applyingPreset, setApplyingPreset] = useState<PresetKey | null>(null);
  const [activePreset, setActivePreset] = useState<PresetKey>("custom");

  const toggle = async (p: Policy, next: boolean) => {
    setActivePreset("custom");
    try {
      await toggleFn({ data: { id: p.id, enabled: next } });
      toast.success(
        `Security Policy ${p.name} ${next ? "enabled" : "disabled"}.`,
        { description: "Future audits will reflect this configuration." },
      );
      await qc.invalidateQueries({ queryKey: ["policies"] });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not update security policy.",
      );
    }
  };

  const applyPreset = async (preset: (typeof PRESETS)[number]) => {
    if (preset.key === "custom") {
      setActivePreset("custom");
      return;
    }
    setApplyingPreset(preset.key);
    try {
      const changes = policies.filter((p) => {
        const desired = preset.match!(p);
        return p.enabled !== desired;
      });
      await Promise.all(
        changes.map((p) =>
          toggleFn({ data: { id: p.id, enabled: preset.match!(p) } }),
        ),
      );
      await qc.invalidateQueries({ queryKey: ["policies"] });
      setActivePreset(preset.key);
      toast.success(`${preset.label} applied.`, {
        description: `${changes.length} polic${changes.length === 1 ? "y" : "ies"} updated. Future audits will reflect this configuration.`,
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not apply policy preset.",
      );
    } finally {
      setApplyingPreset(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [policies, query]);

  const enabledCount = policies.filter((p) => p.enabled).length;

  return (
    <RequireAuth>
      <AppShell
        title="Security Policies"
        subtitle={`${enabledCount} / ${policies.length} active · applied on every scan`}
      >
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <PolicyPresetSidebar
              policies={policies}
              activePreset={activePreset}
              applyingPreset={applyingPreset}
              onApply={applyPreset}
            />
            <PolicyFrameworkList
              policies={policies}
              filtered={filtered}
              query={query}
              isLoading={isLoading}
              applyingPreset={applyingPreset}
              onQueryChange={setQuery}
              onToggle={toggle}
              onApplyPreset={applyPreset}
            />
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
