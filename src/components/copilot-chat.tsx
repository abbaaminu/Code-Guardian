import { useState, useRef, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copilotRemediate } from "@/lib/scan.functions";
import { diffLines, type DiffRow } from "@/lib/diff";
import { toast } from "sonner";
import { Bot, User, Send, Loader2, GitCompareArrows, Wand2, Sparkles, Terminal } from "lucide-react";

type Msg =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      summary: string;
      changes: string[];
      updatedCode: string;
      diffOpen: boolean;
      applied: boolean;
    };

const SUGGESTIONS = [
  "Fix the SQL injection vulnerability",
  "Replace weak hashing with bcrypt",
  "Sanitize all user-provided HTML inputs",
];

function MiniDiff({ rows }: { rows: DiffRow[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border/40 bg-[oklch(0.12_0.02_250)]">
      <div className="border-r border-border/40">
        <div className="border-b border-border/40 bg-critical/5 px-2 py-1 text-[9px] uppercase tracking-widest text-critical">Before</div>
        <pre className="max-h-56 overflow-auto font-mono text-[10.5px] leading-relaxed">
          <code className="block">
            {rows.map((r, i) => (
              <div key={i} className={cn("grid grid-cols-[1.5rem_0.75rem_1fr]", (r.op === "del" || r.op === "mod") && "bg-critical/15", r.op === "ins" && "bg-muted/30 opacity-40")}>
                <span className="select-none px-1 text-right text-muted-foreground/60 tabular-nums">{r.leftNo ?? ""}</span>
                <span className="select-none text-center text-critical">{r.op === "del" || r.op === "mod" ? "-" : " "}</span>
                <span className="whitespace-pre pr-2">{r.left ?? " "}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
      <div>
        <div className="border-b border-border/40 bg-low/5 px-2 py-1 text-[9px] uppercase tracking-widest text-low">After</div>
        <pre className="max-h-56 overflow-auto font-mono text-[10.5px] leading-relaxed">
          <code className="block">
            {rows.map((r, i) => (
              <div key={i} className={cn("grid grid-cols-[1.5rem_0.75rem_1fr]", (r.op === "ins" || r.op === "mod") && "bg-low/15", r.op === "del" && "bg-muted/30 opacity-40")}>
                <span className="select-none px-1 text-right text-muted-foreground/60 tabular-nums">{r.rightNo ?? ""}</span>
                <span className="select-none text-center text-low">{r.op === "ins" || r.op === "mod" ? "+" : " "}</span>
                <span className="whitespace-pre pr-2">{r.right ?? " "}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function AssistantBubble({
  msg,
  currentCode,
  onToggleDiff,
  onApply,
}: {
  msg: Extract<Msg, { role: "assistant" }>;
  currentCode: string;
  onToggleDiff: () => void;
  onApply: () => void;
}) {
  const rows = useMemo(() => diffLines(currentCode, msg.updatedCode), [currentCode, msg.updatedCode]);
  const changedCount = rows.filter((r) => r.op !== "equal").length;
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="rounded-lg rounded-tl-sm border border-border/60 bg-muted/20 px-3 py-2 text-[12px] leading-relaxed">
          {msg.summary}
          {msg.changes.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
              {msg.changes.map((c, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-primary">›</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={onToggleDiff}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[10.5px] hover:bg-muted/60"
          >
            <GitCompareArrows className="h-3 w-3" />
            {msg.diffOpen ? "Hide" : "Review"} changes
            <span className="ml-1 rounded bg-primary/20 px-1 text-[9px] text-primary">{changedCount}</span>
          </button>
          <Button
            size="sm"
            onClick={onApply}
            disabled={msg.applied || msg.updatedCode === currentCode}
            className="h-7 gap-1 bg-primary px-2 text-[11px] text-primary-foreground hover:opacity-90"
          >
            <Wand2 className="h-3 w-3" />
            {msg.applied ? "Applied" : "Apply to Editor"}
          </Button>
        </div>
        {msg.diffOpen && <MiniDiff rows={rows} />}
      </div>
    </div>
  );
}

export function CopilotChat({
  sourceCode,
  fileType,
  onApplyCode,
}: {
  sourceCode: string;
  fileType: string;
  onApplyCode: (code: string) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const remediate = useServerFn(copilotRemediate);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const submit = async (text: string) => {
    const instruction = text.trim();
    if (!instruction || loading) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: instruction };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await remediate({ data: { instruction, source_code: sourceCode, file_type: fileType } });
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          summary: res.summary,
          changes: res.changes,
          updatedCode: res.updated_code,
          diffOpen: false,
          applied: false,
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Copilot failed";
      toast.error(message);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          summary: `⚠ ${message}`,
          changes: [],
          updatedCode: sourceCode,
          diffOpen: false,
          applied: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-primary/30 bg-[oklch(0.12_0.02_250)] shadow-[0_0_40px_-20px_var(--primary)]">
      <div className="flex items-center justify-between border-b border-border/60 bg-[oklch(0.14_0.02_250)]/95 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Terminal className="h-3.5 w-3.5" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          </div>
          <div>
            <div className="text-[12px] font-semibold leading-tight">AI Remediation Copilot</div>
            <div className="text-[9.5px] uppercase tracking-widest text-muted-foreground">natural language › secure code</div>
          </div>
        </div>
        <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
          {fileType}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <div className="space-y-3 py-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="text-[12px] font-medium">Ask the Copilot anything about this file</div>
            <div className="space-y-1.5 px-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="w-full rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-left text-[11px] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                >
                  › {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end gap-2">
              <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-primary/15 px-3 py-1.5 text-[12px] text-foreground">
                {m.text}
              </div>
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          ) : (
            <AssistantBubble
              key={m.id}
              msg={m}
              currentCode={sourceCode}
              onToggleDiff={() =>
                setMessages((prev) =>
                  prev.map((x, xi) => (xi === i && x.role === "assistant" ? { ...x, diffOpen: !x.diffOpen } : x)),
                )
              }
              onApply={() => {
                onApplyCode(m.updatedCode);
                setMessages((prev) =>
                  prev.map((x, xi) => (xi === i && x.role === "assistant" ? { ...x, applied: true } : x)),
                );
                toast.success("Copilot patch applied", { description: m.summary });
              }}
            />
          ),
        )}

        {loading && (
          <div className="flex gap-2">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg rounded-tl-sm border border-border/60 bg-muted/20 px-3 py-2 text-[11.5px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Analyzing file & synthesizing patch…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-1.5 border-t border-border/60 bg-[oklch(0.14_0.02_250)]/95 px-2 py-2"
      >
        <span className="select-none pl-1 font-mono text-[13px] text-primary">›</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="e.g. Fix the XSS on line 42 using DOMPurify…"
          className="flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted-foreground/60"
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading || !input.trim()}
          className="h-7 w-7 shrink-0 bg-primary p-0 text-primary-foreground hover:opacity-90"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </form>
    </div>
  );
}
