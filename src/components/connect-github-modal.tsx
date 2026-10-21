import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Github,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listRepoTokenLabels,
  saveRepoToken,
} from "@/lib/vault/vault.functions";
import {
  closeConnectGithubModal,
  useConnectGithubModalOpen,
} from "@/lib/github/connect-modal-store";

/**
 * Vault label the GitHub App verification path reads from:
 * `getDecryptedRepoTokenServerOnly(userId, "github")` defaults to "default".
 * Keeping the modal on the same label means a saved token immediately fixes
 * "Connect your GitHub account first" errors without touching the schema.
 */
const GITHUB_VAULT_LABEL = "default";

interface ConnectGithubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the token is successfully encrypted and upserted. */
  onConnected?: () => void;
}

/**
 * Non-breaking "Connect GitHub" settings modal. Writes a personal access token
 * through the existing `saveRepoToken` server function, which encrypts it with
 * AES-256-GCM under VAULT_ENCRYPTION_KEY before upserting the caller's own
 * `vault_secrets` row. No schema or RLS changes; multi-tenant isolation comes
 * from the authenticated `context.userId` in that server function.
 */
export function ConnectGithubModal({
  open,
  onOpenChange,
  onConnected,
}: ConnectGithubModalProps) {
  const saveToken = useServerFn(saveRepoToken);
  const listLabels = useServerFn(listRepoTokenLabels);

  const [token, setToken] = useState("");
  const [revealToken, setRevealToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  // Only metadata is fetched (never encrypted_token/iv/auth_tag), matching the
  // server function's "metadata only" contract.
  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const rows = await listLabels();
      const githubRow = rows.find(
        (row) => row.provider === "github" && row.label === GITHUB_VAULT_LABEL,
      );
      setConnectedAt(githubRow?.updated_at ?? null);
    } catch {
      // Status is best-effort: a failed metadata read must not block saving.
      setConnectedAt(null);
    } finally {
      setLoadingStatus(false);
    }
  }, [listLabels]);

  useEffect(() => {
    if (!open) return;
    setToken("");
    setRevealToken(false);
    void refreshStatus();
  }, [open, refreshStatus]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = token.trim();
    if (trimmed.length < 10) {
      toast.error("GitHub token looks too short", {
        description:
          "Paste the full personal access token. Classic tokens start with ghp_ and fine-grained tokens with github_pat_.",
      });
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Saving GitHub token to your vault…");
    try {
      await saveToken({
        data: {
          provider: "github",
          label: GITHUB_VAULT_LABEL,
          token: trimmed,
        },
      });
      setToken("");
      setRevealToken(false);
      toast.success("GitHub connected", {
        id: toastId,
        description:
          "Your token is encrypted in the vault. Repository verification and remediation PRs will now use it.",
      });
      await refreshStatus();
      onConnected?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save GitHub token", {
        id: toastId,
        description:
          err instanceof Error ? err.message : "Please try again shortly.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Github className="h-4.5 w-4.5" />
          </div>
          <DialogTitle>Connect GitHub</DialogTitle>
          <DialogDescription>
            Save a personal access token so SecurePulse can verify your GitHub
            App installation and open remediation pull requests on your behalf.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span
              className={
                connectedAt
                  ? "h-1.5 w-1.5 rounded-full bg-low"
                  : "h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
              }
            />
            {loadingStatus
              ? "Checking vault…"
              : connectedAt
                ? "GitHub vault connected"
                : "No GitHub token saved yet"}
          </span>
          {connectedAt && (
            <span className="text-[10px] text-muted-foreground">
              updated {new Date(connectedAt).toLocaleString()}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="github-token">Personal access token</Label>
            <div className="relative">
              <Input
                id="github-token"
                name="github-token"
                type={revealToken ? "text" : "password"}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="ghp_… or github_pat_…"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                required
                minLength={10}
                disabled={saving}
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setRevealToken((value) => !value)}
                aria-label={revealToken ? "Hide token" : "Show token"}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                {revealToken ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Needs <span className="font-mono">Contents</span> and{" "}
              <span className="font-mono">Pull requests</span> read &amp; write
              on the repositories you want remediated.{" "}
              <a
                href="https://github.com/settings/tokens?type=beta"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
              >
                Create a token
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              Encrypted with AES-256-GCM using the server-side{" "}
              <span className="font-mono">VAULT_ENCRYPTION_KEY</span> before it
              is written to your private{" "}
              <span className="font-mono">vault_secrets</span> row. The raw
              token is never returned to the browser.
            </span>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || token.trim().length < 10}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : connectedAt ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <KeyRound className="h-3.5 w-3.5" />
              )}
              {saving
                ? "Saving…"
                : connectedAt
                  ? "Replace token"
                  : "Save token"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Global host mounted once in `AppShell`. Any surface (sidebar, toast action)
 * can open the modal through `openConnectGithubModal()`.
 */
export function ConnectGithubModalHost() {
  const open = useConnectGithubModalOpen();
  return (
    <ConnectGithubModal
      open={open}
      onOpenChange={(next) => {
        if (!next) closeConnectGithubModal();
      }}
    />
  );
}
