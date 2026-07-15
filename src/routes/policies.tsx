import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { listPolicies, togglePolicy } from "@/lib/scan.functions";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";


interface Policy {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Security Policies · SecurePulse" },
      { name: "description", content: "Toggle compliance standards like OWASP Top 10, SANS Top 25, PCI-DSS and smart-contract safeguards." },
    ],
  }),
  component: Policies,
});

function Policies() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPolicies);
  const toggleFn = useServerFn(togglePolicy);
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: async () => (await listFn()) as unknown as Policy[],
  });

  const toggle = async (p: Policy, next: boolean) => {
    try {
      await toggleFn({ data: { id: p.id, enabled: next } });
      toast.success(`${p.name} ${next ? "enabled" : "disabled"}`);
      await qc.invalidateQueries({ queryKey: ["policies"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };


  const grouped = policies.reduce<Record<string, Policy[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <AppShell
      title="Security Policies"
      subtitle="Choose which standards SecurePulse enforces on every scan."
    >
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {isLoading && <div className="text-sm text-muted-foreground">Loading policies…</div>}
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{category}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((p) => (
                <Card key={p.id} className="border-border/60 bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${p.enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </div>
                        <h3 className="text-sm font-medium">{p.name}</h3>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.description}</p>
                    </div>
                    <Switch checked={p.enabled} onCheckedChange={(v) => toggle(p, v)} />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
