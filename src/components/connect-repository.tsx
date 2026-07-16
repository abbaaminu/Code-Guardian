import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Lock, Search, Star, GitBranch, ShieldCheck, Sparkles } from "lucide-react";

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

const MOCK_REPOS: MockRepo[] = [
  {
    name: "payments-gateway",
    org: "acme-corp",
    language: "Node.js",
    stars: 92,
    branch: "main",
    visibility: "private",
    updated: "5h ago",
    source: `// payments-gateway / routes/charge.js
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
    name: "user-auth-service",
    org: "acme-corp",
    language: "Python",
    stars: 61,
    branch: "develop",
    visibility: "private",
    updated: "yesterday",
    source: `# user-auth-service / app/login.py
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
    name: "solidity-smart-contracts",
    org: "acme-labs",
    language: "Solidity",
    stars: 34,
    branch: "main",
    visibility: "public",
    updated: "3d ago",
    source: `// solidity-smart-contracts / contracts/Vault.sol
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
    {
      id: "github" as const,
      name: "GitHub",
      Icon: GitHubMark,
      iconClass: "text-foreground",
      glowClass: "hover:shadow-[0_0_32px_-6px_oklch(0.9_0_0/0.45)] hover:border-foreground/40",
      available: true,
    },
    {
      id: "gitlab" as const,
      name: "GitLab",
      Icon: GitLabMark,
      iconClass: "",
      glowClass: "hover:shadow-[0_0_32px_-6px_oklch(0.62_0.22_35/0.55)] hover:border-[oklch(0.62_0.22_35/0.55)]",
      available: false,
    },
    {
      id: "bitbucket" as const,
      name: "Bitbucket",
      Icon: BitbucketMark,
      iconClass: "",
      glowClass: "hover:shadow-[0_0_32px_-6px_oklch(0.62_0.22_255/0.55)] hover:border-[oklch(0.62_0.22_255/0.55)]",
      available: false,
    },
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
              className={`group relative flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-all duration-300 ${
                p.available
                  ? `border-border/70 bg-card/60 hover:-translate-y-0.5 hover:bg-card ${p.glowClass}`
                  : "cursor-not-allowed border-border/50 bg-card/30 opacity-60"
              }`}
            >
              <p.Icon className={`h-7 w-7 transition-transform group-hover:scale-110 ${p.iconClass}`} />
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
  const [step, setStep] = useState<0 | 1>(0);
  const [authorizing, setAuthorizing] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const reset = () => {
    setStep(0);
    setAuthorizing(false);
    setQuery("");
    setSelected(null);
  };

  const handleAuthorize = async () => {
    setAuthorizing(true);
    await new Promise((r) => setTimeout(r, 900));
    setAuthorizing(false);
    setStep(1);
  };

  const repos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_REPOS.filter(
      (r) => !q || r.name.toLowerCase().includes(q) || r.language.toLowerCase().includes(q),
    );
  }, [query]);

  const steps = [
    { label: "Verify identity", done: step > 0 },
    { label: "Select repositories", done: false },
  ];

  const selectedRepo = MOCK_REPOS.find((r) => `${r.org}/${r.name}` === selected) ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <div className="border-b border-border/60 bg-gradient-to-br from-card to-card/60 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitHubMark className="h-4 w-4" />
              SecurePulse OAuth Connection
            </DialogTitle>
            <DialogDescription>
              Authorize SecurePulse to scan repositories for vulnerabilities and compliance drift.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="border-b border-border/60 px-6 py-4">
          <ol className="flex items-center gap-3">
            {steps.map((s, i) => {
              const active = step === i;
              return (
                <li key={s.label} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular-nums ${
                      s.done
                        ? "border-low/50 bg-low/15 text-low"
                        : active
                          ? "border-primary/60 bg-primary/15 text-primary glow-primary"
                          : "border-border/60 bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {s.done ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className={`text-xs ${active ? "text-foreground font-medium" : s.done ? "text-muted-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                  {i < steps.length - 1 && <span className="ml-1 h-px flex-1 bg-border/60" />}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="max-h-[52vh] overflow-auto px-6 py-5">
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5">
                    <GitHubMark className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">SecurePulse wants to access your GitHub</div>
                    <div className="text-[11px] text-muted-foreground">Signed in as <span className="font-medium text-foreground">@you</span> · acme-corp</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Requested permissions</div>
                <ul className="space-y-2">
                  {[
                    { icon: Lock, label: "Code — Read", desc: "Read source files for static analysis." },
                    { icon: GitBranch, label: "Metadata — Read", desc: "List branches, commits, repo topology." },
                    { icon: ShieldCheck, label: "Secret scanning alerts — Read", desc: "Correlate SecurePulse findings with native alerts." },
                  ].map((p) => (
                    <li key={p.label} className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 p-3">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                        <p.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{p.label}</div>
                        <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                      </div>
                      <Check className="ml-auto h-4 w-4 shrink-0 text-low" />
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  SecurePulse never requests write access. You can revoke anytime from GitHub → Settings → Applications.
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleAuthorize}
                  disabled={authorizing}
                  className="glow-primary gap-1.5"
                >
                  {authorizing ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Redirecting to GitHub…</>
                  ) : (
                    <><ShieldCheck className="h-3.5 w-3.5" />Authorize SecurePulse</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 rounded-md border border-low/40 bg-low/10 px-3 py-2 text-[11px] text-low">
                <Check className="h-3.5 w-3.5" />
                Identity verified · read-only token issued
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search repositories…"
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
                {repos.map((r) => {
                  const key = `${r.org}/${r.name}`;
                  const isSelected = selected === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(isSelected ? null : key)}
                      className={`flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left transition-all ${
                        isSelected
                          ? "border-primary/60 bg-primary/5 glow-primary"
                          : "border-border/60 bg-card/60 hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-muted/40"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
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
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep(0)}>Back</Button>
                <Button
                  size="sm"
                  onClick={() => selectedRepo && onScan(selectedRepo)}
                  disabled={submitting || !selectedRepo}
                  className="glow-primary gap-1.5"
                >
                  {submitting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Queuing…</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5" />Import & Scan</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
