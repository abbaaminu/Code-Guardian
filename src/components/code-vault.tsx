import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/severity";

interface Highlight {
  start: number;
  end: number;
  severity: Severity;
  vulnId: string;
}

// Multi-language keyword set: JS/TS + Python + Solidity + Docker + shell.
const KEYWORDS = new Set([
  // JS / TS
  "const","let","var","function","return","if","else","for","while","do","switch","case","break","continue",
  "class","extends","new","this","super","import","from","export","default","async","await","try","catch",
  "finally","throw","typeof","instanceof","in","of","null","undefined","true","false","void","yield",
  "public","private","protected","static","interface","type","enum","implements","readonly","as","is",
  // Python
  "def","lambda","pass","None","True","False","elif","print","self","and","or","not","with","raise",
  "global","nonlocal","assert","del","except","import","yield",
  // Solidity
  "pragma","contract","library","interface","modifier","event","emit","mapping","address","payable",
  "require","assert","revert","memory","storage","calldata","external","internal","virtual","override",
  "uint","uint256","int256","bytes","bytes32","bool","string","constructor","fallback","receive",
  // Dockerfile / shell
  "FROM","RUN","COPY","ADD","WORKDIR","ENV","EXPOSE","CMD","ENTRYPOINT","ARG","LABEL","USER","VOLUME",
  "HEALTHCHECK","ONBUILD","SHELL","MAINTAINER",
]);

interface Token { t: string; c?: string }

function tokenize(line: string): Token[] {
  const out: Token[] = [];
  // Ordered alternation: comments (// # /* */), strings ("`' triple), numbers, idents, punct, ops.
  const re = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][A-Za-z0-9_$]*\b|[{}()[\];,.:@]|[+\-*/%=<>!&|^~?]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push({ t: line.slice(last, m.index) });
    const s = m[0];
    let c: string | undefined;
    if (s.startsWith("//") || s.startsWith("#") || s.startsWith("/*")) c = "text-[oklch(0.62_0.03_160)] italic";
    else if (s.startsWith('"') || s.startsWith("'") || s.startsWith("`")) c = "text-[oklch(0.82_0.14_45)]";
    else if (/^0x[0-9a-fA-F]+$/.test(s) || /^\d/.test(s)) c = "text-[oklch(0.78_0.16_195)]";
    else if (KEYWORDS.has(s)) c = "text-[oklch(0.78_0.19_310)] font-medium";
    else if (/^[A-Z]/.test(s)) c = "text-[oklch(0.82_0.14_75)]";
    else if (/^[+\-*/%=<>!&|^~?]+$/.test(s)) c = "text-[oklch(0.85_0.10_200)]";
    else if (/^[{}()[\];,.:@]$/.test(s)) c = "text-[oklch(0.72_0.02_240)]";
    else c = "text-[oklch(0.88_0.02_240)]";
    out.push({ t: s, c });
    last = m.index + s.length;
  }
  if (last < line.length) out.push({ t: line.slice(last) });
  return out;
}

function sevBg(sev: Severity) {
  switch (sev) {
    case "critical": return "bg-critical/20 border-l-2 border-critical shadow-[inset_0_0_24px_-6px_var(--critical)]";
    case "high": return "bg-high/15 border-l-2 border-high shadow-[inset_0_0_18px_-8px_var(--high)]";
    case "medium": return "bg-medium/15 border-l-2 border-medium";
    case "low": return "bg-low/15 border-l-2 border-low";
  }
}

const ROW_HEIGHT = 22; // px; matches text-[12.5px] leading-[1.6]
const VIRTUALIZE_THRESHOLD = 500;

export function CodeVault({
  code,
  highlights,
  activeVulnId,
  patchedLines,
  onLineClick,
}: {
  code: string;
  highlights: Highlight[];
  activeVulnId: string | null;
  patchedLines: Set<number>;
  onLineClick: (vulnId: string) => void;
}) {
  const lines = useMemo(() => code.split("\n"), [code]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRange = highlights.find((h) => h.vulnId === activeVulnId);

  const lineMap = useMemo(() => {
    const map = new Map<number, Highlight>();
    for (const h of highlights) for (let i = h.start; i <= h.end; i++) map.set(i, h);
    return map;
  }, [highlights]);

  const virtualize = lines.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: virtualize ? lines.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  useEffect(() => {
    if (!activeRange) return;
    if (virtualize) {
      virtualizer.scrollToIndex(Math.max(0, activeRange.start - 1), { align: "center", behavior: "smooth" });
    } else {
      const el = scrollRef.current?.querySelector<HTMLDivElement>(`[data-line="${activeRange.start}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeRange, virtualize, virtualizer]);

  const renderLine = (n: number) => {
    const line = lines[n - 1] ?? "";
    const hl = lineMap.get(n);
    const isActive = hl && hl.vulnId === activeVulnId;
    const isPatched = patchedLines.has(n);
    const tokens = tokenize(line);
    return (
      <div
        key={n}
        data-line={n}
        onClick={() => hl && onLineClick(hl.vulnId)}
        style={{ height: ROW_HEIGHT }}
        className={cn(
          "group grid grid-cols-[3.5rem_1.25rem_1fr] items-center transition-colors",
          hl && sevBg(hl.severity),
          hl && "cursor-pointer",
          isActive && "ring-1 ring-inset ring-primary/40",
          isPatched && "!bg-low/20 !border-l-2 !border-low animate-fade-in",
        )}
      >
        <span className={cn(
          "select-none px-3 text-right text-muted-foreground/50 tabular-nums",
          hl && "text-foreground/70 font-semibold",
        )}>{n}</span>
        <span className="select-none text-center text-[10px]">
          {isPatched ? <span className="text-low">✓</span> : hl ? <span className="text-critical">●</span> : null}
        </span>
        <span className="overflow-hidden whitespace-pre pr-4">
          {tokens.length === 0 ? " " : tokens.map((tk, j) => (
            <span key={j} className={tk.c}>{tk.t}</span>
          ))}
        </span>
      </div>
    );
  };

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden rounded-lg border border-border/60 bg-[oklch(0.12_0.02_250)] font-mono text-[12.5px] leading-[1.6]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-[oklch(0.14_0.02_250)]/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-critical/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-medium/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-low/70" />
          <span className="ml-3 text-[11px] text-muted-foreground">source.audit</span>
          {virtualize && (
            <span className="ml-2 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-primary">
              virtualized
            </span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{lines.length} LOC</span>
      </div>

      <div ref={scrollRef} className="h-[calc(100%-2.5rem)] overflow-auto">
        {virtualize ? (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((vi) => (
              <div
                key={vi.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                {renderLine(vi.index + 1)}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-2">{lines.map((_, i) => renderLine(i + 1))}</div>
        )}
      </div>
    </div>
  );
}
