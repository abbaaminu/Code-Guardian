import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { diffLines, type DiffRow } from "@/lib/diff";
import { isFixAllInstruction } from "@/lib/copilot-prompt";
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
  Square,
  CheckCircle2,
  FileCode2,
  Target,
  X,
  ListChecks,
} from "lucide-react";

/** Raw per-finding patch returned by a batch ("Fix All Findings") turn. */
interface CopilotPatchPayload {
  vulnerability_id: string;
  file_path?: string | null;
  vulnerable_code?: string;
  fixed_code: string;
}

type Msg =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      summary: string;
      /** Full prose answer for question-style turns. */
      answer?: string;
      changes: string[];
      updatedCode: string;
      diffOpen: boolean;
      applied: boolean;
      streaming?: boolean;
      failed?: boolean;
      /** Set when DeepSeek returned a workspace-wide batch of fixes. */
      batch?: CopilotBatch;
    };

interface CopilotResult {
  updated_code: string;
  summary: string;
  changes: string[];
  answer?: string;
  patches?: CopilotPatchPayload[];
}

type CopilotStreamEvent =
  | { type: "delta"; delta: string }
  | { type: "done"; result: CopilotResult }
  | { type: "error"; message: string };

/**
 * Minimal payload the report route hands to Copilot when the user clicks
 * "Fix with Copilot" on a finding. Kept structurally typed (no import from the
 * scan domain) so the panel stays usable outside the scan workspace.
 */
export interface CopilotFindingTarget {
  vulnerabilityId: string;
  title?: string;
  severity?: string;
  filePath?: string | null;
  vulnerableCode: string;
  fixedCode: string;
  startLine?: number | null;
  endLine?: number | null;
}

/** Outcome of "Apply Fix & Resolve" handed back by the report workspace. */
export interface CopilotApplyResult {
  ok: boolean;
  description: string;
  /** Findings currently staged for the remediation PR, after this apply. */
  pendingCount?: number;
}

/** One unpatched finding the workspace hands to Copilot for a Fix All turn. */
export interface CopilotFixAllFinding extends CopilotFindingTarget {
  cwe?: string | null;
  /** Validated remediation prose from the scan, used as prompt guidance. */
  remediation?: string;
}

/** A DeepSeek replacement for one finding, keyed by vulnerability id. */
export interface CopilotBatchPatch {
  vulnerabilityId: string;
  filePath?: string | null;
  vulnerableCode: string;
  fixedCode: string;
}

/** Batch preview attached to an assistant message. */
interface CopilotBatch {
  /** Finding set captured when the turn started (drives titles/locations). */
  findings: CopilotFixAllFinding[];
  patches: CopilotBatchPatch[];
}

/** Result of applying a whole batch to the workspace source. */
export interface CopilotBatchApplyResult {
  ok: boolean;
  applied: number;
  failed: number;
  /** Patches the workspace was asked to apply (including already-patched ones). */
  total: number;
  /** Findings staged for the remediation PR after this batch. */
  pendingCount?: number;
  description: string;
  failures?: { vulnerabilityId: string; title?: string; reason: string }[];
}

// Mirrors the server-side limits in `/api/copilot/stream`. Trimming here keeps
// an oversized paste from being rejected with a 400 after the user waits.
const MAX_SOURCE_CHARS = 60_000;
const MAX_CONTEXT_CHARS = 12_000;
const MAX_FINDING_CODE_CHARS = 4_000;
const MAX_BATCH_FINDINGS = 100;

const SUGGESTIONS = [
  "Explain the highest-risk issue in this file",
  "Fix the SQL injection vulnerability",
  "Fix all issues in this scan",
  "Replace weak hashing with bcrypt",
];

function readPartialField(
  content: string,
  field: "summary" | "answer",
): string {
  const marker = new RegExp(`"${field}"\\s*:\\s*"`).exec(content);
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

/**
 * Reconciles DeepSeek's patches with the finding set captured at submit time:
 * drops unknown/duplicate ids, then falls back to the scan's own validated fix
 * for any finding the model skipped so a batch turn still covers the workspace.
 */
function normalizeBatchPatches(
  raw: CopilotPatchPayload[] | undefined,
  findings: CopilotFixAllFinding[],
): CopilotBatchPatch[] {
  const byId = new Map(
    findings.map((finding) => [finding.vulnerabilityId, finding]),
  );
  const seen = new Set<string>();
  const patches: CopilotBatchPatch[] = [];

  for (const patch of raw ?? []) {
    const id = patch.vulnerability_id?.trim();
    if (!id || seen.has(id)) continue;

    const finding = byId.get(id);
    // Never apply a patch for a finding outside the batch that was submitted.
    if (!finding) continue;

    const fixedCode = patch.fixed_code?.trim();
    if (!fixedCode) continue;

    seen.add(id);
    patches.push({
      vulnerabilityId: id,
      filePath: patch.file_path?.trim() || finding.filePath || null,
      vulnerableCode: patch.vulnerable_code?.trim() || finding.vulnerableCode,
      fixedCode,
    });
  }

  for (const finding of findings) {
    if (seen.has(finding.vulnerabilityId)) continue;
    if (!finding.fixedCode.trim()) continue;
    seen.add(finding.vulnerabilityId);
    patches.push({
      vulnerabilityId: finding.vulnerabilityId,
      filePath: finding.filePath ?? null,
      vulnerableCode: finding.vulnerableCode,
      fixedCode: finding.fixedCode,
    });
  }

  return patches;
}

function BatchPatchRow({
  patch,
  finding,
}: {
  patch: CopilotBatchPatch;
  finding?: CopilotFixAllFinding;
}) {
  const rows = useMemo(
    () => diffLines(patch.vulnerableCode || "", patch.fixedCode),
    [patch.vulnerableCode, patch.fixedCode],
  );
  const location =
    patch.filePath?.trim() || finding?.filePath?.trim() || "workspace source";

  return (
    <details className="rounded border border-border/50 bg-background/30">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2 py-1 text-[10.5px]">
        <FileCode2 className="h-3 w-3 shrink-0 text-primary" />
        <span className="truncate font-mono text-muted-foreground">
          {location}
        </span>
        {finding?.startLine ? (
          <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground/70">
            :{finding.startLine}
          </span>
        ) : null}
        <span
          className="ml-auto truncate text-foreground/80"
          title={finding?.title ?? patch.vulnerabilityId}
        >
          {finding?.title ?? patch.vulnerabilityId}
        </span>
      </summary>
      <div className="p-1.5">
        <MiniDiff rows={rows} />
      </div>
    </details>
  );
}

function AssistantBubble({
  msg,
  currentCode,
  onToggleDiff,
  onApply,
  onApplyBatch,
  applyingBatch = false,
}: {
  msg: Extract<Msg, { role: "assistant" }>;
  currentCode: string;
  onToggleDiff: () => void;
  onApply: () => void;
  /** "Fix All & Apply Patches" confirmation for batch turns. */
  onApplyBatch?: () => void;
  applyingBatch?: boolean;
}) {
  const rows = useMemo(
    () => diffLines(currentCode, msg.updatedCode),
    [currentCode, msg.updatedCode],
  );
  const changedCount = rows.filter((r) => r.op !== "equal").length;
  const batchFiles = useMemo(
    () =>
      new Set(
        (msg.batch?.patches ?? []).map(
          (patch) => patch.filePath?.trim() || "workspace source",
        ),
      ).size,
    [msg.batch],
  );
  // Question-style turns return no rewritten source; showing "Review changes"
  // and "Apply to Editor" for an empty patch is noise.
  const hasPatch = msg.updatedCode.trim().length > 0;
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div
          className={cn(
            "rounded-lg rounded-tl-sm border px-3 py-2 text-[12px] leading-relaxed",
            msg.failed
              ? "border-critical/50 bg-critical/10 text-critical"
              : "border-border/60 bg-muted/20",
          )}
        >
          {msg.summary || "Receiving streamed response…"}
          {msg.answer && !msg.streaming && (
            <p className="mt-1.5 whitespace-pre-wrap text-[11.5px] leading-relaxed text-muted-foreground">
              {msg.answer}
            </p>
          )}
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
        {!msg.streaming &&
          !msg.failed &&
          msg.batch &&
          msg.batch.patches.length > 0 && (
            <div className="space-y-2 rounded-md border border-primary/40 bg-primary/[0.06] p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary">
                  <ListChecks className="h-3 w-3" />
                  Batch remediation · {msg.batch.patches.length} finding
                  {msg.batch.patches.length === 1 ? "" : "s"} · {batchFiles}{" "}
                  file
                  {batchFiles === 1 ? "" : "s"}
                </div>
                {msg.applied && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-low">
                    <CheckCircle2 className="h-3 w-3" /> Applied
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {msg.batch.patches.map((patch) => (
                  <BatchPatchRow
                    key={patch.vulnerabilityId}
                    patch={patch}
                    finding={msg.batch?.findings.find(
                      (f) => f.vulnerabilityId === patch.vulnerabilityId,
                    )}
                  />
                ))}
              </div>
              <Button
                size="sm"
                onClick={onApplyBatch}
                disabled={!onApplyBatch || applyingBatch || msg.applied}
                className="h-7 w-full gap-1 bg-primary px-2 text-[11px] text-primary-foreground hover:opacity-90"
              >
                {applyingBatch ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : msg.applied ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                {msg.applied
                  ? "Patches applied"
                  : applyingBatch
                    ? "Applying patches…"
                    : "Fix All & Apply Patches"}
              </Button>
            </div>
          )}
        {!msg.streaming && !msg.failed && hasPatch && (
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
  activeFinding,
  activeFindingApplied = false,
  pendingPatchCount,
  focusSignal = 0,
  onClearFinding,
  onApplyFindingFix,
  findings = [],
  fixAllSignal = 0,
  onApplyAllFixes,
}: {
  /** Optional: the copilot answers questions even with no file loaded. */
  sourceCode?: string;
  fileType?: string;
  onApplyCode?: (code: string) => void;
  context?: string;
  /** Finding targeted by "Fix with Copilot" on a vulnerability card. */
  activeFinding?: CopilotFindingTarget | null;
  /** True when the targeted finding was already patched in the workspace. */
  activeFindingApplied?: boolean;
  /** Findings staged for the next remediation PR (shown on the target card). */
  pendingPatchCount?: number;
  /** Increment to re-focus the composer when the same finding is re-targeted. */
  focusSignal?: number;
  onClearFinding?: () => void;
  /**
   * "Apply Fix & Resolve": writes the suggested fix into the live code and
   * marks the finding patched. Returns a result so the panel can toast the
   * exact outcome (overlap, stale finding, success + queued count).
   */
  onApplyFindingFix?: (
    target: CopilotFindingTarget,
  ) => CopilotApplyResult | Promise<CopilotApplyResult>;
  /**
   * Every unpatched finding in the scan. Sent with a "Fix All Findings with AI"
   * turn so DeepSeek can remediate the whole workspace in one batch.
   */
  findings?: CopilotFixAllFinding[];
  /** Increment to start a workspace-wide batch turn (header button). */
  fixAllSignal?: number;
  /**
   * "Fix All & Apply Patches": applies the batch sequentially to the in-memory
   * workspace and marks each finding patched. Reports failures per finding.
   */
  onApplyAllFixes?: (
    patches: CopilotBatchPatch[],
  ) => CopilotBatchApplyResult | Promise<CopilotBatchApplyResult>;
}) {
  const code = sourceCode ?? "";
  const language = fileType?.trim() || "text";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Mirrors `loading` for handlers that may fire between renders (suggestion
  // click + Enter in the same tick), so a turn can't be submitted twice.
  const loadingRef = useRef(false);

  const [applyingFinding, setApplyingFinding] = useState(false);
  const [applyingBatch, setApplyingBatch] = useState(false);
  const [resolvedFindingId, setResolvedFindingId] = useState<string | null>(
    null,
  );
  const targetId = activeFinding?.vulnerabilityId ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  // Auto-grow the composer so pasted snippets stay readable; Shift+Enter adds
  // a newline, Enter sends.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Never leave an upstream request running after unmount/navigation.
  useEffect(() => () => abortRef.current?.abort(), []);

  // A new target means a fresh, unresolved finding.
  useEffect(() => {
    setResolvedFindingId(null);
  }, [targetId]);

  // Opening/focusing the panel (or re-clicking "Fix with Copilot" on the same
  // card) should land the caret in the composer without stealing focus while
  // the user is typing elsewhere.
  useEffect(() => {
    if (!targetId && !focusSignal) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [targetId, focusSignal]);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const submit = async (text: string, options?: { fixAll?: boolean }) => {
    const instruction = text.trim();
    if (!instruction || loadingRef.current) return;

    // Batch scope is captured before the request so findings patched while the
    // model streams cannot change the ids the response is reconciled against.
    const batchFindings =
      options?.fixAll === true || isFixAllInstruction(instruction)
        ? findings.slice(0, MAX_BATCH_FINDINGS)
        : [];
    const batchMode = batchFindings.length > 0;

    loadingRef.current = true;
    setInput("");

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
        // Batch turns never rewrite one file; the per-finding patches carry the
        // diff, so the single-file "Apply to Editor" affordance stays hidden.
        updatedCode: batchMode ? "" : code,
        diffOpen: false,
        applied: true,
        streaming: true,
      },
    ]);
    setLoading(true);

    // Sonner is the streaming surface: one toast is created up front and then
    // edited in place as tokens arrive, so progress is visible even when the
    // chat panel is scrolled or collapsed.
    const toastId = toast.loading(
      batchMode
        ? `Remediating ${batchFindings.length} finding${batchFindings.length === 1 ? "" : "s"}…`
        : code.trim()
          ? "Copilot is reading your file…"
          : "Copilot is thinking…",
      {
        description: batchMode
          ? "DeepSeek is generating a workspace-wide patch set."
          : context?.trim()
            ? "Using the selected finding as context."
            : "Streaming a response from DeepSeek.",
      },
    );
    let lastToastAt = 0;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token)
        throw new Error("Your session has expired. Please sign in again.");

      const response = await fetch("/api/copilot/stream", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instruction,
          source_code: code.slice(0, MAX_SOURCE_CHARS),
          file_type: language,
          // A batch turn is driven by the finding array, not by one target.
          context: batchMode ? undefined : context?.slice(0, MAX_CONTEXT_CHARS),
          ...(batchMode
            ? {
                mode: "fix_all",
                findings: batchFindings.map((finding) => ({
                  id: finding.vulnerabilityId,
                  title: finding.title?.trim() || "Reported finding",
                  severity: finding.severity,
                  cwe: finding.cwe ?? undefined,
                  file_path: finding.filePath ?? null,
                  line_start: finding.startLine ?? null,
                  line_end: finding.endLine ?? null,
                  vulnerable_code: finding.vulnerableCode.slice(
                    0,
                    MAX_FINDING_CODE_CHARS,
                  ),
                  fixed_code: finding.fixedCode.slice(
                    0,
                    MAX_FINDING_CODE_CHARS,
                  ),
                  remediation: finding.remediation?.slice(0, 2_000),
                })),
              }
            : {}),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const fallback =
          response.status === 401
            ? "Your session has expired. Please sign in again."
            : response.status === 429
              ? "Too many requests - wait a few seconds and try again."
              : `Copilot request failed [${response.status}].`;
        throw new Error(body?.error || fallback);
      }
      if (!response.body)
        throw new Error("Copilot returned no response stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: CopilotResult | null = null;
      let streamedContent = "";
      let partial = "";

      const applyPartial = (text: string) => {
        if (!text || text === partial) return;
        partial = text;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId && message.role === "assistant"
              ? { ...message, summary: text }
              : message,
          ),
        );
        const now = Date.now();
        if (now - lastToastAt > 700) {
          lastToastAt = now;
          toast.loading("Copilot is responding…", {
            id: toastId,
            description: text.slice(0, 160),
          });
        }
      };

      const handleEvent = (event: CopilotStreamEvent) => {
        if (event.type === "delta") {
          streamedContent += event.delta;
          applyPartial(
            readPartialField(streamedContent, "summary") ||
              readPartialField(streamedContent, "answer").slice(0, 240),
          );
          return;
        }
        if (event.type === "done") {
          result = event.result;
          return;
        }
        throw new Error(event.message);
      };

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.trim()) handleEvent(JSON.parse(line) as CopilotStreamEvent);
        }
        if (done) break;
      }
      if (buffer.trim()) {
        handleEvent(JSON.parse(buffer) as CopilotStreamEvent);
      }

      if (!result)
        throw new Error("Copilot stream ended before a response arrived.");
      const finalResult: CopilotResult = result;
      const batchPatches = batchMode
        ? normalizeBatchPatches(finalResult.patches, batchFindings)
        : [];
      const batchPayload: CopilotBatch | undefined =
        batchPatches.length > 0
          ? { findings: batchFindings, patches: batchPatches }
          : undefined;

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId && message.role === "assistant"
            ? {
                ...message,
                summary: finalResult.summary,
                answer: finalResult.answer,
                changes: finalResult.changes,
                updatedCode: batchMode ? "" : finalResult.updated_code,
                // A batch turn is only "applied" once the user confirms the
                // patch list; the single-file turn has nothing to apply when it
                // returned no rewritten source.
                applied: batchMode
                  ? false
                  : finalResult.updated_code.trim().length === 0,
                batch: batchPayload,
                streaming: false,
              }
            : message,
        ),
      );

      if (batchMode) {
        if (batchPayload) {
          toast.success(
            `Batch remediation ready — ${batchPayload.patches.length} finding${
              batchPayload.patches.length === 1 ? "" : "s"
            }`,
            {
              id: toastId,
              description:
                "Review the patches, then apply them to the workspace.",
              duration: 7000,
            },
          );
        } else {
          toast.warning("Copilot returned no applicable patches", {
            id: toastId,
            description: finalResult.summary,
            duration: 8000,
          });
        }
      } else {
        toast.success(
          finalResult.updated_code.trim().length > 0
            ? "Patch ready to review"
            : "Copilot answered",
          {
            id: toastId,
            description: finalResult.summary,
            duration: 6000,
          },
        );
      }
    } catch (err) {
      const aborted =
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError");

      if (aborted) {
        toast.info("Copilot stopped", {
          id: toastId,
          description: "The response was cancelled.",
        });
        setMessages((current) =>
          current.filter((entry) => entry.id !== assistantId),
        );
      } else {
        const message = err instanceof Error ? err.message : "Copilot failed";
        toast.error("Copilot response failed", {
          id: toastId,
          description: message,
        });
        setMessages((m) => [
          ...m.filter((entry) => entry.id !== assistantId),
          {
            id: assistantId,
            role: "assistant",
            summary: message,
            changes: [],
            updatedCode: "",
            diffOpen: false,
            applied: true,
            failed: true,
          },
        ]);
      }
    } finally {
      abortRef.current = null;
      loadingRef.current = false;
      setLoading(false);
      // Keep the composer ready for the next question.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  /**
   * "Fix All Findings with AI" — sends the scan's entire unpatched set in one
   * DeepSeek turn and renders a per-finding patch preview.
   */
  const startFixAll = () => {
    if (loadingRef.current || applyingBatch) return;
    if (findings.length === 0) {
      toast.info("No unpatched findings", {
        description: "Every finding in this scan is already patched.",
      });
      return;
    }
    void submit(
      `Fix all ${findings.length} remaining findings in this scan and return a patch for each one.`,
      { fixAll: true },
    );
  };

  // The scan page owns the header button; it increments `fixAllSignal` to ask
  // this panel to start the same batch turn. A ref keeps the effect from
  // depending on every render's `submit` closure.
  const startFixAllRef = useRef(startFixAll);
  startFixAllRef.current = startFixAll;
  const lastFixAllSignalRef = useRef(fixAllSignal);
  useEffect(() => {
    if (fixAllSignal === lastFixAllSignalRef.current) return;
    lastFixAllSignalRef.current = fixAllSignal;
    startFixAllRef.current();
  }, [fixAllSignal]);

  const applyBatch = async (msg: Extract<Msg, { role: "assistant" }>) => {
    if (!msg.batch || !onApplyAllFixes || applyingBatch) return;
    const { patches } = msg.batch;
    if (patches.length === 0) return;

    setApplyingBatch(true);
    const toastId = toast.loading(
      `Applying ${patches.length} AI fix${patches.length === 1 ? "" : "es"} to the workspace…`,
    );
    try {
      const result = await onApplyAllFixes(patches);
      if (result.applied === 0) {
        toast.error("No fixes could be applied", {
          id: toastId,
          description:
            result.description ||
            result.failures?.[0]?.reason ||
            "Review the patch set and try again.",
          duration: 9000,
        });
        return;
      }

      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === msg.id && entry.role === "assistant"
            ? { ...entry, applied: true }
            : entry,
        ),
      );

      const queued = result.pendingCount ?? 0;
      const failureNote =
        result.failed > 0
          ? ` ${result.failed} finding${result.failed === 1 ? "" : "s"} could not be patched${
              result.failures?.length
                ? `: ${result.failures
                    .slice(0, 2)
                    .map((failure) => failure.title ?? failure.vulnerabilityId)
                    .join(", ")}`
                : ""
            }.`
          : "";

      toast.success(
        `Successfully applied fixes for ${result.applied} finding${
          result.applied === 1 ? "" : "s"
        } across workspace`,
        {
          id: toastId,
          description: `${
            queued > 0
              ? `${queued} finding${queued === 1 ? "" : "s"} queued for Create Remediation PR.`
              : result.description
          }${failureNote}`,
          duration: 9000,
        },
      );
    } catch (err) {
      toast.error("Batch remediation failed", {
        id: toastId,
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setApplyingBatch(false);
    }
  };

  const isActiveFindingResolved =
    Boolean(activeFindingApplied) ||
    (targetId !== null && resolvedFindingId === targetId);

  const applyTargetFinding = async () => {
    if (!activeFinding || !onApplyFindingFix || applyingFinding) return;
    setApplyingFinding(true);
    try {
      const result = await onApplyFindingFix(activeFinding);
      if (!result.ok) {
        toast.error("Copilot could not apply the fix", {
          description: result.description,
          duration: 8000,
        });
        return;
      }
      setResolvedFindingId(activeFinding.vulnerabilityId);
      const queued =
        typeof result.pendingCount === "number" ? result.pendingCount : 0;
      toast.success("Fix applied — finding resolved", {
        description: `${result.description}${
          queued > 0
            ? ` ${queued} finding${queued === 1 ? "" : "s"} queued for Create Remediation PR.`
            : ""
        }`,
        duration: 7000,
      });
    } catch (err) {
      toast.error("Copilot could not apply the fix", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setApplyingFinding(false);
    }
  };

  const askAboutFinding = () => {
    if (!activeFinding) return;
    const location = activeFinding.filePath || "the current file";
    const lines = activeFinding.startLine
      ? ` (lines ${activeFinding.startLine}-${
          activeFinding.endLine ?? activeFinding.startLine
        })`
      : "";
    void submit(
      [
        `Fix the security finding "${activeFinding.title ?? "reported finding"}" in ${location}${lines}.`,
        "",
        "Vulnerable code:",
        activeFinding.vulnerableCode || "(not provided)",
        "",
        "Suggested fix:",
        activeFinding.fixedCode || "(not provided)",
        "",
        "Return the complete updated file with the vulnerability remediated.",
      ].join("\n"),
    );
  };

  const targetLineLabel = activeFinding?.startLine
    ? `:${activeFinding.startLine}${
        activeFinding.endLine &&
        activeFinding.endLine !== activeFinding.startLine
          ? `-${activeFinding.endLine}`
          : ""
      }`
    : "";

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
        <span
          className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary"
          title={code.trim() ? "File loaded as context" : "No file loaded"}
        >
          {language}
        </span>
      </div>

      {findings.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/[0.04] px-3 py-1.5">
          <Button
            type="button"
            size="sm"
            onClick={startFixAll}
            disabled={loading || applyingBatch}
            aria-label={`Fix all ${findings.length} findings with AI`}
            className="h-7 gap-1 bg-primary px-2 text-[11px] text-primary-foreground hover:opacity-90"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Fix All Findings with AI
          </Button>
          <span className="text-[9.5px] uppercase tracking-widest text-muted-foreground">
            {findings.length} unpatched
          </span>
        </div>
      )}

      {activeFinding && (
        <div className="border-b border-primary/30 bg-primary/[0.06] px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-widest text-primary">
                <Target className="h-3 w-3" />
                Copilot target
                {isActiveFindingResolved && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-low/20 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-low">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Patched
                  </span>
                )}
              </div>
              <div className="mt-1 truncate text-[12px] font-semibold">
                {activeFinding.title ?? "Selected finding"}
              </div>
              <div className="mt-0.5 flex items-center gap-1 font-mono text-[10.5px] text-muted-foreground">
                <FileCode2 className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {activeFinding.filePath || "source"}
                  {targetLineLabel}
                </span>
              </div>
            </div>
            {onClearFinding && (
              <button
                type="button"
                onClick={onClearFinding}
                aria-label="Clear Copilot finding target"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              onClick={() => void applyTargetFinding()}
              disabled={
                !onApplyFindingFix || applyingFinding || isActiveFindingResolved
              }
              className="h-7 gap-1 bg-primary px-2 text-[11px] text-primary-foreground hover:opacity-90"
            >
              {applyingFinding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : isActiveFindingResolved ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              {isActiveFindingResolved ? "Resolved" : "Apply Fix & Resolve"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={askAboutFinding}
              disabled={loading}
              className="h-7 gap-1 px-2 text-[11px]"
            >
              <Sparkles className="h-3 w-3" />
              Ask Copilot
            </Button>
            {typeof pendingPatchCount === "number" && pendingPatchCount > 0 && (
              <span className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[9.5px] uppercase tracking-widest text-muted-foreground">
                {pendingPatchCount} queued for PR
              </span>
            )}
          </div>

          {(activeFinding.vulnerableCode.trim() ||
            activeFinding.fixedCode.trim()) && (
            <details className="mt-1.5 text-[10.5px] text-muted-foreground">
              <summary className="w-fit cursor-pointer select-none rounded px-1 py-0.5 hover:text-foreground">
                View finding code
              </summary>
              <div className="mt-1.5 space-y-1.5">
                {activeFinding.vulnerableCode.trim() && (
                  <pre className="max-h-28 overflow-auto rounded border border-critical/30 bg-critical/5 p-1.5 font-mono text-[10px] leading-relaxed">
                    <code>{activeFinding.vulnerableCode}</code>
                  </pre>
                )}
                {activeFinding.fixedCode.trim() && (
                  <pre className="max-h-28 overflow-auto rounded border border-low/30 bg-low/5 p-1.5 font-mono text-[10px] leading-relaxed">
                    <code>{activeFinding.fixedCode}</code>
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      )}

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
              {code.trim()
                ? "Ask the Copilot anything about this file"
                : "Ask a security question or paste a snippet"}
            </div>
            <div className="space-y-1.5 px-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  disabled={loading}
                  className="w-full rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-left text-[11px] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  › {s}
                </button>
              ))}
            </div>
            <p className="px-2 text-[10px] text-muted-foreground/70">
              Enter to send · Shift+Enter for a new line · no scan required
            </p>
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
              currentCode={code}
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
                onApplyCode?.(m.updatedCode);
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
              onApplyBatch={
                onApplyAllFixes ? () => void applyBatch(m) : undefined
              }
              applyingBatch={applyingBatch}
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
              Thinking… press Stop to cancel
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(input);
        }}
        className="flex items-end gap-1.5 border-t border-border/60 bg-[oklch(0.14_0.02_250)]/95 px-2 py-2"
      >
        <span className="select-none pb-1.5 pl-1 font-mono text-[13px] text-primary">
          ›
        </span>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter inserts a newline. IME composition
            // (e.g. Japanese/Chinese input) must never submit mid-word.
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing)
              return;
            e.preventDefault();
            if (loadingRef.current) return;
            void submit(input);
          }}
          rows={1}
          aria-label="Ask the AI remediation copilot"
          placeholder={
            code.trim()
              ? "Ask a question about this file…"
              : "Ask a security question or paste a snippet…"
          }
          className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent py-1.5 font-mono text-[12px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
        />
        {loading ? (
          <Button
            type="button"
            size="sm"
            onClick={stop}
            aria-label="Stop generating"
            className="h-7 shrink-0 gap-1 bg-destructive px-2 text-[11px] text-destructive-foreground hover:opacity-90"
          >
            <Square className="h-3 w-3" />
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim()}
            aria-label="Send message"
            className="h-7 w-7 shrink-0 bg-primary p-0 text-primary-foreground hover:opacity-90"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </form>
    </div>
  );
}
