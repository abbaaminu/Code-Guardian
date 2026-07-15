import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Lock, Search, Star, GitBranch, ShieldCheck } from "lucide-react";

export interface RepoSubmission {
  project_name: string;
  file_type: string;
  source_code: string;
}

interface MockRepo {
  name: string;
  org: string;
  language: string;
  stars: number;
  branch: string;
  visibility: "private" | "public";
  updated: string;
  source: string;
}

const MOCK_ORGS = ["acme-corp", "acme-labs"];

const MOCK_REPOS: MockRepo[] = [
  {
    name: "frontend-main",
    org: "acme-corp",
    language: "TypeScript",
    stars: 128,
    branch: "main",
    visibility: "private",
    updated: "2h ago",
    source: `// frontend-main / src/api/session.ts
import axios from "axios";

const API_KEY = "sk_live_51H8xY2K9pQ7rT6nV3mB1aZ4cX8dW"; // hardcoded secret
export async function fetchUser(id) {
  const url = "https://api.acme.dev/users?id=" + id;
  return axios.get(url, { headers: { Authorization: "Bearer " + API_KEY } });
}

export function renderProfile(html) {
  document.getElementById("bio").innerHTML = html; // reflected XSS sink
}
`,
  },
  {
    name: "payments-api",
    org: "acme-corp",
    language: "Node.js",
    stars: 92,
    branch: "main",
    visibility: "private",
    updated: "5h ago",
    source: `// payments-api / routes/charge.js
const express = require("express");
const mysql = require("mysql");
const router = express.Router();

const db = mysql.createConnection({ host: "db", user: "root", password: "root", database: "pay" });

router.post("/charge", (req, res) => {
  const amount = req.body.amount;
  const user = req.body.user;
  const q = "INSERT INTO charges (user, amount) VALUES ('" + user + "', " + amount + ")";
  db.query(q, (err) => {
    if (err) return res.status(500).send(err.message);
    res.send("ok");
  });
});

module.exports = router;
`,
  },
  {
    name: "auth-service-v2",
    org: "acme-corp",
    language: "Python",
    stars: 61,
    branch: "develop",
    visibility: "private",
    updated: "yesterday",
    source: `# auth-service-v2 / app/login.py
import hashlib, pickle, base64
from flask import Flask, request, redirect

app = Flask(__name__)
SECRET = "supersecret"

@app.route("/login", methods=["POST"])
def login():
    user = request.form["user"]
    pw = request.form["password"]
    hashed = hashlib.md5(pw.encode()).hexdigest()
    session = pickle.loads(base64.b64decode(request.cookies.get("s", "")))
    if session.get("user") == user and hashed == session.get("h"):
        return redirect(request.args.get("next"))
    return "denied"
`,
  },
  {
    name: "smart-contracts",
    org: "acme-labs",
    language: "Solidity",
    stars: 34,
    branch: "main",
    visibility: "public",
    updated: "3d ago",
    source: `// smart-contracts / contracts/Vault.sol
pragma solidity ^0.7.0;

contract Vault {
    mapping(address => uint) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint amount) public {
        require(balances[msg.sender] >= amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok);
        balances[msg.sender] -= amount;
    }
}
`,
  },
  {
    name: "infra-terraform",
    org: "acme-corp",
    language: "Docker",
    stars: 22,
    branch: "main",
    visibility: "private",
    updated: "1w ago",
    source: `# infra-terraform / Dockerfile
FROM ubuntu:18.04
RUN apt-get update && apt-get install -y curl sudo
ENV AWS_SECRET_ACCESS_KEY=AKIAABCDEFGHIJKLMNOP
COPY . /app
USER root
CMD ["/app/run.sh"]
`,
  },
  {
    name: "data-pipeline",
    org: "acme-labs",
    language: "Python",
    stars: 18,
    branch: "main",
    visibility: "private",
    updated: "2w ago",
    source: `# data-pipeline / etl/run.py
import os, subprocess
def sync(source):
    cmd = "rsync -av " + source + " /data/"
    subprocess.call(cmd, shell=True)  # command injection via 'source'

if __name__ == "__main__":
    sync(os.environ.get("SRC", "/tmp/x"))
`,
  },
];

function GitHubMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.97.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.77.11 3.06.74.81 1.18 1.84 1.18 3.1 0 4.41-2.7 5.38-5.27 5.67.41.35.78 1.05.78 2.12v3.14c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function GitLabMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path fill="#e24329" d="M23.6 9.6 22.28 5.5a.7.7 0 0 0-1.32-.02L19.14 11H4.86L3.04 5.48a.7.7 0 0 0-1.32.02L.4 9.6a1.4 1.4 0 0 0 .5 1.57L12 19.5l11.1-8.33a1.4 1.4 0 0 0 .5-1.57Z" />
      <path fill="#fc6d26" d="M12 19.5 7.14 11H4.86L12 19.5Zm0 0L16.86 11h2.28L12 19.5Z" />
      <path fill="#fca326" d="m4.86 11-1.14 3.49a.75.75 0 0 0 .27.83L12 19.5 4.86 11Zm14.28 0 1.14 3.49a.75.75 0 0 1-.27.83L12 19.5 19.14 11Z" />
    </svg>
  );
}

function BitbucketMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path fill="#2684ff" d="M2.3 3a.7.7 0 0 0-.7.82l3 18.14a.9.9 0 0 0 .9.74h12.9a.7.7 0 0 0 .7-.58l3-18.3a.7.7 0 0 0-.7-.82H2.3Zm12.3 12.15h-5.2l-1.4-7.3h7.8l-1.2 7.3Z" />
    </svg>
  );
}

export function ConnectRepositoryPanel({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (v: RepoSubmission) => void;
}) {
  const [provider, setProvider] = useState<"github" | "gitlab" | "bitbucket" | null>(null);

  const providers = [
    { id: "github" as const, name: "GitHub", Icon: GitHubMark, tint: "text-foreground", available: true },
    { id: "gitlab" as const, name: "GitLab", Icon: GitLabMark, tint: "", available: false },
    { id: "bitbucket" as const, name: "Bitbucket", Icon: BitbucketMark, tint: "", available: false },
  ];

  return (
    <>
      <div className="min-h-[240px] rounded-lg border border-border/70 bg-muted/20 p-5">
        <div className="mb-4">
          <div className="text-sm font-medium">Connect a Git provider</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Grant read-only access. SecurePulse never writes to your repos, and code stays on the enterprise non-training tier.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => p.available && setProvider(p.id)}
              disabled={!p.available}
              className={`group relative flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                p.available
                  ? "border-border/70 bg-card/60 hover:border-primary/50 hover:bg-card hover:glow-primary"
                  : "cursor-not-allowed border-border/50 bg-card/30 opacity-60"
              }`}
            >
              <p.Icon className={`h-7 w-7 ${p.tint}`} />
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {p.available ? "OAuth · read-only" : "Coming soon"}
                </div>
              </div>
              {p.available && (
                <span className="absolute right-3 top-3 rounded-full border border-low/40 bg-low/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-low">
                  Live
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <GitHubConnectDialog
        open={provider === "github"}
        onOpenChange={(v) => { if (!v) setProvider(null); }}
        submitting={submitting}
        onScan={(repo) => {
          onSubmit({
            project_name: `${repo.org}/${repo.name}`,
            file_type: repo.language,
            source_code: repo.source,
          });
          setProvider(null);
        }}
      />
    </>
  );
}

function GitHubConnectDialog({
  open,
  onOpenChange,
  submitting,
  onScan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  submitting: boolean;
  onScan: (repo: MockRepo) => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [org, setOrg] = useState<string>(MOCK_ORGS[0]);
  const [busy, setBusy] = useState<"org" | "grant" | null>(null);
  const [query, setQuery] = useState("");

  const advance = async (next: 1 | 2, key: "org" | "grant") => {
    setBusy(key);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(null);
    setStep(next);
  };

  const repos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_REPOS.filter((r) => r.org === org).filter(
      (r) => !q || r.name.toLowerCase().includes(q) || r.language.toLowerCase().includes(q),
    );
  }, [org, query]);

  const steps = [
    { label: "Select organization", done: step > 0 },
    { label: "Grant repository permissions (read-only)", done: step > 1 },
    { label: "Select repositories", done: false },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setStep(0);
          setQuery("");
          setBusy(null);
        }
      }}
    >
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <div className="border-b border-border/60 bg-gradient-to-br from-card to-card/60 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitHubMark className="h-4 w-4" />
              SecurePulse · GitHub App authorization
            </DialogTitle>
            <DialogDescription>
              Grant SecurePulse read-only access to scan repositories for vulnerabilities and compliance drift.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="border-b border-border/60 px-6 py-4">
          <ol className="grid gap-2">
            {steps.map((s, i) => {
              const active = step === i;
              return (
                <li key={s.label} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums ${
                      s.done
                        ? "border-low/50 bg-low/15 text-low"
                        : active
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border/60 bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {s.done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className={`text-xs ${active ? "text-foreground" : s.done ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="max-h-[52vh] overflow-auto px-6 py-5">
          {step === 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Organizations</div>
              <div className="grid gap-2">
                {MOCK_ORGS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrg(o)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                      org === o ? "border-primary/60 bg-primary/5" : "border-border/60 bg-muted/20 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/60 text-[10px] font-semibold uppercase">
                        {o[0]}
                      </div>
                      <div>
                        <div className="text-sm">{o}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {MOCK_REPOS.filter((r) => r.org === o).length} repositories
                        </div>
                      </div>
                    </div>
                    {org === o && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={() => advance(1, "org")} disabled={busy !== null}>
                  {busy === "org" ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Verifying…</> : "Continue"}
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Requested permissions</div>
              <ul className="space-y-2">
                {[
                  { icon: Lock, label: "Code — Read", desc: "Clone repositories and read source files for static analysis." },
                  { icon: GitBranch, label: "Metadata — Read", desc: "List branches, commits, and repository topology." },
                  { icon: ShieldCheck, label: "Secret scanning alerts — Read", desc: "Correlate SecurePulse findings with GitHub-native alerts." },
                ].map((p) => (
                  <li key={p.label} className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <p.icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium">{p.label}</div>
                      <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                    </div>
                    <Check className="ml-auto h-4 w-4 text-low" />
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">
                SecurePulse never requests write access. Access can be revoked from GitHub → Settings → Applications.
              </p>
              <div className="flex justify-between pt-1">
                <Button variant="ghost" size="sm" onClick={() => setStep(0)}>Back</Button>
                <Button size="sm" onClick={() => advance(2, "grant")} disabled={busy !== null} className="glow-primary">
                  {busy === "grant" ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Granting…</> : "Grant read-only access"}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${org} repositories…`}
                    className="pl-8"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{repos.length} repos</span>
              </div>

              <div className="space-y-2">
                {repos.length === 0 && (
                  <div className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-xs text-muted-foreground">
                    No repositories match "{query}"
                  </div>
                )}
                {repos.map((r) => (
                  <div
                    key={`${r.org}/${r.name}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card/60 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{r.org}/{r.name}</span>
                        <span className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                          {r.visibility}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>{r.language}</span>
                        <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{r.branch}</span>
                        <span className="flex items-center gap-1"><Star className="h-3 w-3" />{r.stars}</span>
                        <span>updated {r.updated}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onScan(r)}
                      disabled={submitting}
                      className="shrink-0"
                    >
                      {submitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Queuing…</> : "Connect & scan"}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-1">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Back</Button>
                <span className="text-[10px] text-muted-foreground">Enterprise, non-training tier</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
