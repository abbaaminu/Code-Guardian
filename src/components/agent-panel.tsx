import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { runAgentTask } from "@/lib/agent.functions";
import { toast } from "sonner";
import { Bot, Loader2, GitPullRequest, ExternalLink } from "lucide-react";

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
      setError("Fill in owner, repo, and an instruction.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await run({
        data: { owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || "main", instruction: instruction.trim() },
      });
      setResult(res as Result);
      if (res.prUrl) toast.success("Pull request opened", { description: res.branchName ?? undefined });
      else toast.info("Agent made no changes", { description: res.summary });
    } catch (err: any) {
      setError(err.message || "Agent run failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Coding Agent</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Describe a change in plain English. The agent reads your repo, makes the edits across as many
        files as needed, and opens a Pull Request for you to review — nothing merges automatically.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="owner (e.g. abbaaminu)" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <Input placeholder="repo (e.g. Code-Guardian)" value={repo} onChange={(e) => setRepo(e.target.value)} />
      </div>
      <Input placeholder="base branch (default: main)" value={branch} onChange={(e) => setBranch(e.target.value)} />
      <Textarea
        placeholder="e.g. Add a dark/light theme toggle to the navbar, or: Remove the legacy export-to-PDF button and its handler"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        className="min-h-[100px]"
      />

      <Button onClick={handleRun} disabled={loading} className="w-full">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
        {loading ? "Working on it…" : "Run agent"}
      </Button>

      {error && <p className="text-xs text-critical">{error}</p>}

      {result && (
        <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs">
          <p className="text-muted-foreground">{result.summary}</p>
          {result.operations.length > 0 && (
            <ul className="space-y-1">
              {result.operations.map((op) => (
                <li key={op.path} className="font-mono text-[11px]">
                  <span className="uppercase text-primary">{op.action}</span> {op.path}
                </li>
              ))}
            </ul>
          )}
          {result.prUrl && (
            <a
              href={result.prUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-primary hover:bg-primary/20"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              View Pull Request
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
