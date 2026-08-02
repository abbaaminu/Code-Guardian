import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { runAgentTask } from "@/lib/agent.functions";
import { toast } from "sonner";
import { Bot, Loader2, GitPullRequest, ExternalLink, AlertCircle } from "lucide-react";

type Result = {
  prUrl: string | null;
  branchName: string | null;
  summary: string;
  operations: { path: string; action: string }[];
};

export function AgentPanel() {
  const run = useServerFn(runAgentTask);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!owner.trim() || !repo.trim() || !instruction.trim()) {
      setError("Please specify repository owner, repository name, and a clear change instruction.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = (await run({
        data: {
          owner: owner.trim(),
          repo: repo.trim(),
          branch: branch.trim() || "main",
          instruction: instruction.trim(),
        },
      })) as Result;

      setResult(res);
      if (res.prUrl) {
        toast.success("Pull request successfully created!", { description: res.branchName ?? undefined });
      } else {
        toast.info("Agent completed analysis without file changes.", { description: res.summary });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during agent execution.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/60 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">Autonomous Remediation Agent</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Specify a task in natural language. The agent inspects the repository, applies necessary edits across multiple files, and opens a Pull Request for manual review.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Owner (e.g. acme-corp)"
          value={owner}
          disabled={loading}
          onChange={(e) => setOwner(e.target.value)}
        />
        <Input
          placeholder="Repository (e.g. core-api)"
          value={repo}
          disabled={loading}
          onChange={(e) => setRepo(e.target.value)}
        />
      </div>

      <Input
        placeholder="Base branch (default: main)"
        value={branch}
        disabled={loading}
        onChange={(e) => setBranch(e.target.value)}
      />

      <Textarea
        placeholder="e.g. Migrate local SQL string concatenation in /api/users.ts to parameterized Supabase RPC calls."
        value={instruction}
        disabled={loading}
        onChange={(e) => setInstruction(e.target.value)}
        className="min-h-[110px]"
      />

      <Button onClick={handleRun} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing codebase & preparing PR...
          </>
        ) : (
          <>
            <Bot className="mr-2 h-4 w-4" />
            Run Agent Task
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-3 rounded-lg border border-border/40 bg-muted/30 p-4 text-xs">
          <p className="font-medium text-foreground">{result.summary}</p>

          {result.operations.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Modified Files</span>
              <ul className="space-y-1">
                {result.operations.map((op) => (
                  <li key={op.path} className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase">
                      {op.action}
                    </span>
                    <span className="truncate">{op.path}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.prUrl && (
            <a
              href={result.prUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <GitPullRequest className="h-4 w-4" />
              Review Pull Request
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
