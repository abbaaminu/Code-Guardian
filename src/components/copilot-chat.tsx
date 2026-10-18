import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { diffLines, type DiffRow } from "@/lib/diff";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bot,
  User,
  Send,
  Loader2,
  GitCompareArrows,
  Wand2,
  Sparkles,
  Terminal,
} from "lucide-react";

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
      streaming?: boolean;
    };

interface CopilotResult {
  updated_code: string;
  summary: string;
  changes: string[];
}

type CopilotStreamEvent =
  | { type: "delta"; delta: string }
  | { type: "done"; result: CopilotResult }
  | { type: "error"; message: string };

const SUGGESTIONS = [
  "Fix the SQL injection vulnerability",
  "Replace weak hashing with bcrypt",
  "Sanitize all user-provided HTML inputs",
];

function readPartialSummary(content: string): string {
  const marker = /"summary"\s*:\s*"/.exec(content);
  if (!marker) return "";

  const start = marker.index + marker[0].length;
  let encoded = "";
  for (let index = start; index < content.length; index++) {
    const char = content[index];
    if (char === '"') break;
    if (char === "\\") {
      const escape = content[index + 1];
      if (!escape) break;
      if (escape === "u") {
        const unicode = content.slice(index + 2, index + 6);
        if (!/^[\da-f]{4}$/i.test(unicode)) break;
        encoded += content.slice(index, index + 6);
        index += 5;
      } else {
        encoded += content.slice(index, index + 2);
        index++;
      }
    } else {
      encoded += char;
    }
  }

  try {
    return JSON.parse(`"${encoded}"`) as string;
  } catch {
    return "";
  }
}

function MiniDiff({ rows }: { rows: DiffRow[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border/40 bg-[oklch(0.12_0.02_250)]">
      <div className="border-r border-border/40">
        <div className="border-b border-border/40 bg-critical/5 px-2 py-1 text-[9px] uppercase tracking-widest text-critical">
          Before
        </div>
        <pre className="max-h-56 overflow-auto font-mono text-[10.5px] leading-relaxed">
          <code className="block">
            {rows.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[1.5rem_0.75rem_1fr]",
                  (r.op === "del" || r.op === "mod") && "bg-critical/15",
                  r.op === "ins" && "bg-muted/30 opacity-40",
                )}
              >
                <span className="select-none px-1 text-right text-muted-foreground/60 tabular-nums">
                  {r.leftNo ?? ""}
                </span>
                <span className="select-none text-center text-critical">
                  {r.op === "del" || r.op === "mod" ? "-" : " "}
                </span>
                <span className="whitespace-pre pr-2">{r.left ?? " "}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
      <div>
        <div className="border-b border-border/40 bg-low/5 px-2 py-1 text-[9px] uppercase tracking-widest text-low">
          After
        </div>
        <pre className="max-h-56 overflow-auto font-mono text-[10.5px] leading-relaxed">
          <code className="block">
            {rows.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[1.5rem_0.75rem_1fr]",
                  (r.op === "ins" || r.op === "mod") && "bg-low/15",
                  r.op === "del" && "bg-muted/30 opacity-40",
                )}
              >
                <span className="select-none px-1 text-right text-muted-foreground/60 tabular-nums">
                  {r.rightNo ?? ""}
                </span>
                <span className="select-none text-center text-low">
                  {r.op === "ins" || r.op === "mod" ? "+" : " "}
                </span>
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
  const rows = useMemo(
    () => diffLines(currentCode, msg.updatedCode),
    [currentCode, msg.updatedCode],
  );
  const changedCount = rows.filter((r) => r.op !== "equal").length;
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="rounded-lg rounded-tl-sm border border-border/60 bg-muted/20 px-3 py-2 text-[12px] leading-relaxed">
          {msg.summary || "Receiving streamed response…"}
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
        {!msg.streaming && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={onToggleDiff}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[10.5px] hover:bg-muted/60"
            >
              <GitCompareArrows className="h-3 w-3" />
              {msg.diffOpen ? "Hide" : "Review"} changes
              <span className="ml-1 rounded bg-primary/20 px-1 text-[9px] text-primary">
                {changedCount}
              </span>
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
        )}
        {!msg.streaming && msg.diffOpen && <MiniDiff rows={rows} />}
      </div>
    </div>
  );
}

export function CopilotChat({
  sourceCode,
  fileType,
  onApplyCode,
  context,
  onRequestSourceInput,
}: {
  sourceCode: string;
  fileType: string;
  onApplyCode: (code: string) => void;
  context?: string;
  onRequestSourceInput?: (prompt: string) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const submit = async (text: string) => {
    const instruction = text.trim();
    if (!instruction || loading) return;
    if (!sourceCode.trim()) {
      if (onRequestSourceInput) onRequestSourceInput(instruction);
      else {
        toast.error("Add source code before asking for a remediation patch.");
      }
      setInput("");
      return;
    }

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      text: instruction,
    };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      userMsg,
      {
        id: assistantId,
        role: "assistant",
        summary: "",
        changes: [],
        updatedCode: sourceCode,
        diffOpen: false,
        applied: true,
        streaming: true,
      },
    ]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token)
        throw new Error("Your session has expired. Please sign in again.");

      const response = await fetch("/api/copilot/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instruction,
          source_code: sourceCode,
          file_type: fileType,
          context,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error || `Copilot request failed [${response.status}].`,
        );
      }
      if (!response.body)
        throw new Error("Copilot returned no response stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: CopilotResult | null = null;
      let streamedContent = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as CopilotStreamEvent;
          if (event.type === "delta") {
            streamedContent += event.delta;
            const summary = readPartialSummary(streamedContent);
            if (summary) {
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId && message.role === "assistant"
                    ? { ...message, summary }
                    : message,
                ),
              );
            }
          } else if (event.type === "done") {
            result = event.result;
          } else {
            throw new Error(event.message);
          }
        }
        if (done) break;
      }
      if (buffer.trim()) {
        const event = JSON.parse(buffer) as CopilotStreamEvent;
        if (event.type === "done") result = event.result;
        else if (event.type === "error") throw new Error(event.message);
      }
      if (!result)
        throw new Error("Copilot stream ended before the patch arrived.");
      const finalResult = result;

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId && message.role === "assistant"
            ? {
                ...message,
                summary: finalResult.summary,
                changes: finalResult.changes,
                updatedCode: finalResult.updated_code,
                applied: false,
                streaming: false,
              }
            : message,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Copilot failed";
      toast.error("Copilot response failed", { description: message });
      setMessages((m) => [
        ...m.filter((entry) => entry.id !== assistantId),
        {
          id: assistantId,
          role: "assistant",
          summary: `Unable to generate a patch: ${message}`,
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
            <div className="text-[12px] font-semibold leading-tight">
              AI Remediation Copilot
            </div>
            <div className="text-[9.5px] uppercase tracking-widest text-muted-foreground">
              natural language › secure code
            </div>
          </div>
        </div>
        <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
          {fileType}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
      >
        {messages.length === 0 && (
          <div className="space-y-3 py-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="text-[12px] font-medium">
              {sourceCode.trim()
                ? "Ask the Copilot anything about this file"
                : "Ask a question or paste a code snippet"}
            </div>
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
                  prev.map((x, xi) =>
                    xi === i && x.role === "assistant"
                      ? { ...x, diffOpen: !x.diffOpen }
                      : x,
                  ),
                )
              }
              onApply={() => {
                onApplyCode(m.updatedCode);
                setMessages((prev) =>
                  prev.map((x, xi) =>
                    xi === i && x.role === "assistant"
                      ? { ...x, applied: true }
                      : x,
                  ),
                );
                toast.success("Copilot patch applied", {
                  description: m.summary,
                });
              }}
            />
          ),
        )}

        {loading && (
          <div role="status" aria-live="polite" className="flex gap-2">
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
        <span className="select-none pl-1 font-mono text-[13px] text-primary">
          ›
        </span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          aria-label="Ask the AI remediation copilot"
          placeholder="Ask a question or paste code to get started…"
          className="flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted-foreground/60"
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="h-7 w-7 shrink-0 bg-primary p-0 text-primary-foreground hover:opacity-90"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </form>
    </div>
  );
}
