import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  highlightLines,
  className,
}: {
  code: string;
  highlightLines?: Array<{ start: number; end: number; severity?: string }>;
  className?: string;
}) {
  const lines = code.split("\n");
  const isHighlighted = (n: number) =>
    highlightLines?.find((h) => n >= h.start && n <= h.end);

  return (
    <pre
      className={cn(
        "overflow-auto rounded-lg border border-border/60 bg-[oklch(0.13_0.02_250)] p-0 text-[12.5px] leading-relaxed font-mono",
        className,
      )}
    >
      <code className="block">
        {lines.map((ln, i) => {
          const n = i + 1;
          const hl = isHighlighted(n);
          return (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[3.5rem_1fr] items-start px-0",
                hl && "bg-critical/15 border-l-2 border-critical",
              )}
            >
              <span className="select-none px-3 py-0.5 text-right text-muted-foreground/60">{n}</span>
              <span className="whitespace-pre py-0.5 pr-4">{ln || " "}</span>
            </div>
          );
        })}
      </code>
    </pre>
  );
}
