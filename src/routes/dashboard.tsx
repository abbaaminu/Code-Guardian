import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, type ChangeEvent, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeverityBadge } from "@/components/severity-badge";
import { ScanSimulator } from "@/components/scan-simulator";
import { ScanAnalytics } from "@/components/scan-analytics";
import { ReportExportDialog } from "@/components/report-export-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listScans, runScan } from "@/lib/scan.functions";

import { Activity, ShieldAlert, ScanLine, Upload, Terminal, ArrowRight, Loader2, ChevronDown, ExternalLink, FileDown } from "lucide-react";
import type { Severity } from "@/lib/severity";


interface ScanRow {
  id: string;
  project_name: string;
  file_type: string;
  status: string;
  health_score: number;
  vulnerabilities_count: Record<Severity, number>;
  created_at: string;
}

const LANGUAGES = ["Python", "JavaScript", "TypeScript", "Node.js", "Java", "Go", "Ruby", "PHP", "Solidity", "Docker", "SQL", "C#", "Rust"];

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Scan Dashboard · SecurePulse" },
      { name: "description", content: "Run and review AI-powered security scans across your projects." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const run = useServerFn(runScan);
  const list = useServerFn(listScans);
  const [completedScanId, setCompletedScanId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [exportScan, setExportScan] = useState<ScanRow | null>(null);


  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["scans"],
    queryFn: async () => (await list()) as unknown as ScanRow[],
  });


  const scanMutation = useMutation({
    mutationFn: async (input: { project_name: string; file_type: string; source_code: string }) =>
      run({ data: input }),
    onMutate: () => {
      setPhase("running");
      setCompletedScanId(null);
    },
    onSuccess: async (res) => {
      setCompletedScanId(res.id);
      setPhase("done");
      toast.success("Scan complete", { description: `Health score: ${res.health_score}/100` });
      await qc.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (e: Error) => {
      setPhase("failed");
      toast.error("Scan failed", { description: e.message });
    },
  });

  const totals = {
    total: scans.length,
    critical: scans.reduce((n, s) => n + (s.vulnerabilities_count?.critical ?? 0), 0),
    avgHealth: scans.length
      ? Math.round(scans.reduce((n, s) => n + s.health_score, 0) / scans.length)
      : 0,
  };

  const showSimulator = phase !== "idle";

  return (
    <AppShell
      title="Scan Dashboard"
      subtitle="Paste code, upload a file, or connect a repo to audit for OWASP, CWE, and secret exposure."
      actions={
        <Link to="/policies" className="text-xs text-muted-foreground hover:text-foreground">
          Manage policies →
        </Link>
      }
    >
      <div className="grid-bg border-b border-border/60">
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          <StatCards {...totals} />
          <ScanAnalytics scans={scans} />
        </div>
      </div>


      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {showSimulator ? (
          <ScanSimulator
            running={phase === "running"}
            completed={phase === "done"}
            failed={phase === "failed"}
            scanId={completedScanId}
            onDismiss={() => { setPhase("idle"); setCompletedScanId(null); }}
          />
        ) : (
          <ScanForm submitting={scanMutation.isPending} onSubmit={(v) => scanMutation.mutate(v)} />
        )}

        <section id="history" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">Recent audits</h2>
            <span className="text-xs text-muted-foreground">{scans.length} scans</span>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Project</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Threat</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!isLoading && scans.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No scans yet — submit code above to run your first audit.</TableCell></TableRow>
                )}
                {scans.map((s) => {
                  const top = topSeverity(s.vulnerabilities_count);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.project_name}</TableCell>
                      <TableCell><span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs">{s.file_type}</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</TableCell>
                      <TableCell>{top ? <SeverityBadge severity={top} /> : <span className="text-xs text-muted-foreground">clean</span>}</TableCell>
                      <TableCell><HealthBar score={s.health_score} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Report <ChevronDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem asChild>
                              <Link to="/scans/$id" params={{ id: s.id }} className="cursor-pointer">
                                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                View online workspace
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setExportScan(s)} className="cursor-pointer">
                              <FileDown className="mr-2 h-3.5 w-3.5" />
                              Export executive summary
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function StatCards({ total, critical, avgHealth }: { total: number; critical: number; avgHealth: number }) {
  const cards = [
    { label: "Repos scanned", value: total, icon: ScanLine, tint: "text-primary" },
    { label: "Active critical exploits", value: critical, icon: ShieldAlert, tint: "text-critical" },
    { label: "Avg code health score", value: `${avgHealth}/100`, icon: Activity, tint: "text-primary" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="border-border/60 bg-card/60 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">{c.label}</span>
            <c.icon className={`h-4 w-4 ${c.tint}`} />
          </div>
          <div className="mt-3 text-3xl font-semibold tracking-tight">{c.value}</div>
        </Card>
      ))}
    </div>
  );
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-low" : score >= 50 ? "bg-medium" : score >= 30 ? "bg-high" : "bg-critical";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="tabular-nums text-xs text-muted-foreground">{score}</span>
    </div>
  );
}

function topSeverity(counts: Record<Severity, number> | undefined): Severity | null {
  if (!counts) return null;
  const order: Severity[] = ["critical", "high", "medium", "low"];
  for (const s of order) if ((counts[s] ?? 0) > 0) return s;
  return null;
}

function ScanForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (v: { project_name: string; file_type: string; source_code: string }) => void;
}) {
  const [projectName, setProjectName] = useState("");
  const [fileType, setFileType] = useState("Python");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState("paste");

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    setCode(text.slice(0, 60000));
    if (!projectName) setProjectName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = { py: "Python", js: "JavaScript", ts: "TypeScript", tsx: "TypeScript", sol: "Solidity", go: "Go", rb: "Ruby", java: "Java", php: "PHP", cs: "C#", rs: "Rust", dockerfile: "Docker", sql: "SQL" };
    if (ext && map[ext]) setFileType(map[ext]);
    if (file.name.toLowerCase() === "dockerfile") setFileType("Docker");
  }, [projectName]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const submit = () => {
    if (!projectName.trim()) return toast.error("Give the scan a project name");
    if (!code.trim()) return toast.error("Paste some code or upload a file first");
    onSubmit({ project_name: projectName.trim(), file_type: fileType, source_code: code });
  };

  return (
    <Card className="border-border/60 bg-card/60 p-5">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Project name</label>
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. payments-api" />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">Language</label>
          <Select value={fileType} onValueChange={setFileType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="paste"><Terminal className="mr-1.5 h-3.5 w-3.5" />Paste code</TabsTrigger>
          <TabsTrigger value="upload"><Upload className="mr-1.5 h-3.5 w-3.5" />Upload file</TabsTrigger>
        </TabsList>
        <TabsContent value="paste" className="mt-3">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="// Paste your source code here..."
            className="min-h-[240px] bg-[oklch(0.13_0.02_250)] font-mono text-sm"
          />
        </TabsContent>
        <TabsContent value="upload" className="mt-3">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-muted/20 p-6 text-center"
          >
            <Upload className="h-8 w-8 text-primary" />
            <div className="text-sm">Drop a source file here</div>
            <div className="text-xs text-muted-foreground">or</div>
            <label className="cursor-pointer text-xs text-primary underline underline-offset-4">
              browse files
              <input type="file" className="hidden" onChange={onPick} accept=".py,.js,.ts,.tsx,.sol,.go,.rb,.java,.php,.cs,.rs,.sql,Dockerfile,.txt" />
            </label>
            {code && <div className="text-xs text-muted-foreground">Loaded {code.length.toLocaleString()} characters</div>}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Enterprise, non-training tier · payloads isolated from model training data.</p>
        <Button onClick={submit} disabled={submitting} className="glow-primary">
          {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scanning…</>) : (<>Run scan <ArrowRight className="ml-2 h-4 w-4" /></>)}
        </Button>
      </div>
    </Card>
  );
}
