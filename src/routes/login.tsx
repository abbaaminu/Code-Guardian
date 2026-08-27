import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · SecurePulse" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Inline sign-in error so we can offer a "Resend confirmation email" action
  // instead of only burying the message in a toast.
  const [signInError, setSignInError] = useState<string | null>(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Forgot-password flow.
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  const clearSignInError = () => {
    setSignInError(null);
    setEmailNotConfirmed(false);
    setResendSent(false);
  };

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setShowForgotPassword(false);
    clearSignInError();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearSignInError();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created successfully! You can now sign in.");
        // Email confirmation is enabled, so no session exists yet — switch the
        // user over to the sign-in tab so they can authenticate right away.
        switchMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          // Unconfirmed emails surface as a sign-in error; handle it inline so
          // the user can resend the confirmation email right away.
          if (/email not confirmed/i.test(error.message)) {
            setSignInError("Your email address has not been confirmed yet.");
            setEmailNotConfirmed(true);
            return;
          }
          throw error;
        }
        toast.success("Signed in");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(mode === "signup" ? "Sign up failed" : "Sign in failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast.error("Enter your email address first.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      setResendSent(true);
      toast.success("Confirmation email sent", {
        description: `A new confirmation link has been sent to ${email}.`,
      });
    } catch (err) {
      toast.error("Could not resend confirmation email", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setResending(false);
    }
  };

  const handleSendResetLink = async (e: FormEvent) => {
    e.preventDefault();
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link has been sent to your email.");
      setShowForgotPassword(false);
    } catch (err) {
      toast.error("Could not send password reset email", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setResetSending(false);
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

        {showForgotPassword ? (
          <form onSubmit={handleSendResetLink} className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Reset password</div>
              <p className="text-xs text-muted-foreground">
                Enter the email address linked to your account and we&apos;ll
                send you a link to reset your password.
              </p>
            </div>
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Button
              type="submit"
              disabled={resetSending || !email}
              className="w-full"
            >
              {resetSending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send reset link
            </Button>
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            <div className="flex rounded-md border border-border/60 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`flex-1 rounded-sm py-1.5 ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`flex-1 rounded-sm py-1.5 ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (signInError) clearSignInError();
                }}
                required
              />
              <div className="space-y-1">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (signInError) clearSignInError();
                  }}
                  minLength={6}
                  required
                />
                {mode === "signin" && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-muted-foreground underline underline-offset-4 hover:text-primary"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              {signInError && (
                <div
                  role="alert"
                  className="flex flex-col gap-2 rounded-md border border-critical/50 bg-critical/10 px-3 py-2 text-[12px] text-critical animate-fade-in"
                >
                  <span>{signInError}</span>
                  {emailNotConfirmed && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={handleResendConfirmation}
                      disabled={resending || resendSent}
                    >
                      {resending && (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      )}
                      {resendSent
                        ? "Confirmation email sent"
                        : "Resend confirmation email"}
                    </Button>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
