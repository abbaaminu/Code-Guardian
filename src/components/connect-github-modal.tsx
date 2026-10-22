import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Github, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listRepoTokenLabels } from "@/lib/vault/vault.functions";
import {
  closeConnectGithubModal,
  useConnectGithubModalOpen,
} from "@/lib/github/connect-modal-store";

/**
 * Vault label the GitHub App verification path reads from:
 * `getDecryptedRepoTokenServerOnly(userId, "github")` defaults to "default".
 */
const GITHUB_VAULT_LABEL = "default";

interface ConnectGithubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the OAuth token is successfully encrypted and upserted. */
  onConnected?: () => void;
}

/**
 * Opens a GitHub OAuth popup and stores the returned token in the encrypted
 * vault through the authenticated server callback.
 */
export function ConnectGithubModal({
  open,
  onOpenChange,
  onConnected,
}: ConnectGithubModalProps) {
  const listLabels = useServerFn(listRepoTokenLabels);

  const popupRef = useRef<Window | null>(null);
  const [connecting, setConnecting] = useState(false);
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
    void refreshStatus();
  }, [open, refreshStatus]);

  useEffect(() => {
    if (!open || !connecting) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== popupRef.current ||
        typeof event.data !== "object" ||
        event.data === null ||
        event.data.type !== "securepulse.github.oauth"
      ) {
        return;
      }

      popupRef.current = null;
      setConnecting(false);
      if (event.data.success === true) {
        toast.success("GitHub connected", {
          description:
            "Your GitHub OAuth token is encrypted in your vault and ready to use.",
        });
        void refreshStatus();
        onConnected?.();
        onOpenChange(false);
      } else {
        toast.error("Could not connect GitHub", {
          description:
            "GitHub authorization did not complete. Please try again.",
        });
      }
    };

    const closeWatcher = window.setInterval(() => {
      if (popupRef.current?.closed) {
        popupRef.current = null;
        setConnecting(false);
      }
    }, 500);
    window.addEventListener("message", handleMessage);
    return () => {
      window.clearInterval(closeWatcher);
      window.removeEventListener("message", handleMessage);
    };
  }, [connecting, onConnected, onOpenChange, open, refreshStatus]);

  const handleConnect = async () => {
    const popup = window.open(
      "about:blank",
      "github-oauth",
      "popup,width=600,height=750",
    );
    if (!popup) {
      toast.error("Could not open GitHub sign-in", {
        description: "Allow pop-ups for this site and try again.",
      });
      return;
    }

    popupRef.current = popup;
    setConnecting(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Your session has expired. Sign in again and retry.");
      }

      const response = await fetch("/api/auth/github/start", {
        method: "POST",
        credentials: "same-origin",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload: unknown = await response.json();
      if (
        !response.ok ||
        typeof payload !== "object" ||
        payload === null ||
        !("authorizationUrl" in payload) ||
        typeof payload.authorizationUrl !== "string"
      ) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Could not start GitHub authorization.";
        throw new Error(message);
      }

      const authorizationUrl = new URL(payload.authorizationUrl);
      if (
        authorizationUrl.origin !== "https://github.com" ||
        authorizationUrl.pathname !== "/login/oauth/authorize"
      ) {
        throw new Error(
          "The server returned an invalid GitHub authorization URL.",
        );
      }
      popup.location.assign(authorizationUrl.href);
    } catch (error) {
      popupRef.current = null;
      popup.close();
      setConnecting(false);
      toast.error("Could not start GitHub sign-in", {
        description:
          error instanceof Error ? error.message : "Please try again shortly.",
      });
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
            Sign in with GitHub to securely connect your account and authorize
            repository access for SecurePulse.
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
                : "No GitHub account connected yet"}
          </span>
          {connectedAt && (
            <span className="text-[10px] text-muted-foreground">
              updated {new Date(connectedAt).toLocaleString()}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/20 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              GitHub authorizes access in a separate window. The OAuth token is
              encrypted with the server-side{" "}
              <span className="font-mono">VAULT_ENCRYPTION_KEY</span> before it
              is saved to your private vault.
            </span>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={connecting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleConnect()}
              disabled={connecting}
              className="w-full gap-2 sm:w-auto"
            >
              {connecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : connectedAt ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Github className="h-4 w-4" />
              )}
              {connecting
                ? "Connecting…"
                : connectedAt
                  ? "Reconnect via GitHub"
                  : "Connect via GitHub"}
            </Button>
          </DialogFooter>
        </div>
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
