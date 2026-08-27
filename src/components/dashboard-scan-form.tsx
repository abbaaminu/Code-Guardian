import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectRepositoryPanel } from "@/components/connect-repository";
import { cn } from "@/lib/utils";
import {
  Terminal,
  Upload,
  ArrowRight,
  Loader2,
  GitBranch,
  AlertCircle,
} from "lucide-react";

export const LANGUAGES = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Node.js",
  "Java",
  "Go",
  "Ruby",
  "PHP",
  "Solidity",
  "Docker",
  "SQL",
  "C#",
  "Rust",
];

// L3: static scan-form metadata hoisted out of the ScanForm component.
export const SUPPORTED_EXT = [
  "py",
  "js",
  "ts",
  "tsx",
  "jsx",
  "sol",
  "go",
  "rb",
  "java",
  "php",
  "cs",
  "rs",
  "sql",
  "txt",
  "json",
  "yml",
  "yaml",
  "sh",
  "env",
];

export const EXT_LANG_MAP: Record<string, string> = {
  py: "Python",
  js: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  jsx: "JavaScript",
  sol: "Solidity",
  go: "Go",
  rb: "Ruby",
  java: "Java",
  php: "PHP",
  cs: "C#",
  rs: "Rust",
  dockerfile: "Docker",
  sql: "SQL",
};

export interface ScanFormValues {
  project_name: string;
  file_type: string;
  source_code: string;
}

export function ScanForm({
  submitting,
  onSubmit,
  onCodeChange,
}: {
  submitting: boolean;
  onSubmit: (v: ScanFormValues) => void;
  onCodeChange?: (code: string, fileType: string) => void;
}) {
  const [projectName, setProjectName] = useState("");
  const [fileType, setFileType] = useState("Python");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState("paste");
  const [error, setError] = useState<string | null>(null);

  // L4: keep the latest onCodeChange in a ref so the sync effect below never
  // captures a stale prop from an earlier render (the parent passes an inline
  // arrow that changes identity every render).
  const onCodeChangeRef = useRef(onCodeChange);
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  useEffect(() => {
    onCodeChangeRef.current?.(code, fileType);
  }, [code, fileType]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const nameLower = file.name.toLowerCase();
      const ext = nameLower.split(".").pop() ?? "";
      const isDockerfile =
        nameLower === "dockerfile" || nameLower.endsWith(".dockerfile");

      if (!isDockerfile && !SUPPORTED_EXT.includes(ext)) {
        setError(
          `Unsupported file type ".${ext}". Try a source file such as .py, .js, .ts, .sol, .go, or a Dockerfile.`,
        );
        return;
      }
      const text = await file.text();
      setCode(text.slice(0, 60000));
      if (!projectName) setProjectName(file.name);
      if (isDockerfile) setFileType("Docker");
      else if (EXT_LANG_MAP[ext]) setFileType(EXT_LANG_MAP[ext]);
    },
    [projectName],
  );

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
    if (!projectName.trim()) {
      setError("Give the scan a project name before running the audit.");
      return;
    }
    if (!code.trim()) {
      setError("Please paste valid source code to begin auditing.");
      return;
    }
    if (code.trim().length < 10) {
      setError(
        "That snippet is too short to audit — paste at least a full function or file.",
      );
      return;
    }
    setError(null);
    onSubmit({
      project_name: projectName.trim(),
      file_type: fileType,
      source_code: code,
    });
  };

  return (
    <Card className="border-border/60 bg-card/60 p-5">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
            Project name
          </label>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. payments-api"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
            Language
          </label>
          <Select value={fileType} onValueChange={setFileType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="paste">
            <Terminal className="mr-1.5 h-3.5 w-3.5" />
            Paste code
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload file
          </TabsTrigger>
          <TabsTrigger value="repo">
            <GitBranch className="mr-1.5 h-3.5 w-3.5" />
            Connect repository
          </TabsTrigger>
        </TabsList>
        <TabsContent value="paste" className="mt-3">
          <Textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="// Paste your source code here..."
            className={cn(
              "min-h-[240px] bg-[oklch(0.13_0.02_250)] font-mono text-sm",
              error && "border-critical/70 focus-visible:ring-critical/40",
            )}
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
              <input
                type="file"
                className="hidden"
                onChange={onPick}
                accept=".py,.js,.ts,.tsx,.sol,.go,.rb,.java,.php,.cs,.rs,.sql,Dockerfile,.txt"
              />
            </label>
            {code && (
              <div className="text-xs text-muted-foreground">
                Loaded {code.length.toLocaleString()} characters
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="repo" className="mt-3">
          <ConnectRepositoryPanel submitting={submitting} onSubmit={onSubmit} />
        </TabsContent>
      </Tabs>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-critical/50 bg-critical/10 px-3 py-2 text-[12px] text-critical animate-fade-in"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Enterprise, non-training tier · payloads isolated from model training
          data.
        </p>
        <Button onClick={submit} disabled={submitting} className="glow-primary">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              Run scan <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
