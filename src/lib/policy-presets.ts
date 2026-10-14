// Policy presets ("Strict Security Mode", "Dev-Friendly", "Custom Policy").
//
// N2: shared by the policies route (which applies a preset) and the preset
// sidebar (which renders it). Kept out of policy-framework-grid.tsx so that file
// only exports components and stays fast-refreshable (see src/lib/scan-metrics.ts).

import { Settings2, Sparkles, Wrench } from "lucide-react";
import type { Policy } from "@/lib/scan-types";

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
