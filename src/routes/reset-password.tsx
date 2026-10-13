import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  RouteErrorFallback,
  RoutePendingFallback,
} from "@/components/route-boundaries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password · SecurePulse" }] }),
  component: ResetPasswordPage,
  errorComponent: RouteErrorFallback,
  pendingComponent: RoutePendingFallback,
  pendingMs: 300,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryStatus, setRecoveryStatus] = useState<
    "checking" | "ready" | "invalid"
  >("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setRecoveryStatus("ready");
    });

    const checkRecoverySession = async () => {
      const url = new URL(window.location.href);
      const hasAuthError =
        url.searchParams.has("error") || url.hash.includes("error=");

      if (hasAuthError) {
        if (active) setRecoveryStatus("invalid");
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) {
        toast.error("Could not verify the password reset link", {
          description: error.message,
        });
      }
      setRecoveryStatus(!error && data.session ? "ready" : "invalid");
    };

    void checkRecoverySession();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("Passwords do not match");
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Your password has been updated.");
      await navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error("Could not update your password", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm space-y-5 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <div className="text-sm font-semibold">SecurePulse</div>
            <div className="text-xs text-muted-foreground">Code Auditor</div>
          </div>
        </div>

        {recoveryStatus === "checking" ? (
          <div
            className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying your password reset link…
          </div>
        ) : recoveryStatus === "invalid" ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-sm font-semibold">Reset link unavailable</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                This password reset link is invalid or has expired. Request a
                new one to continue.
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/login">Return to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h1 className="text-sm font-semibold">Choose a new password</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter and confirm the new password for your account.
              </p>
            </div>
            <Input
              type="password"
              placeholder="New password"
              aria-label="New password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              aria-label="Confirm new password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={6}
              required
            />
            <Button
              type="submit"
              disabled={updating || password.length < 6 || !confirmation}
              className="w-full"
            >
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
