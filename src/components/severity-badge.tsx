import { severityClasses, type Severity } from "@/lib/severity";
import { cn } from "@/lib/utils";

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        severityClasses(severity),
        className,
      )}
    >
      {severity}
    </span>
  );
}
