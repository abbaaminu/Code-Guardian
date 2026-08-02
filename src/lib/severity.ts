export type Severity = "critical" | "high" | "medium" | "low";

export const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export function severityClasses(sev: Severity) {
  switch (sev) {
    case "critical":
      return "bg-critical text-critical-foreground";
    case "high":
      return "bg-high text-high-foreground";
    case "medium":
      return "bg-medium text-medium-foreground";
    case "low":
      return "bg-low text-low-foreground";
  }
}

export function severityRing(sev: Severity) {
  switch (sev) {
    case "critical":
      return "border-critical/60 shadow-[0_0_24px_-8px_var(--critical)]";
    case "high":
      return "border-high/60";
    case "medium":
      return "border-medium/60";
    case "low":
      return "border-low/60";
  }
}
