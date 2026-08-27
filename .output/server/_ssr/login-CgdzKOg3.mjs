import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as supabase } from "./client-qAspnl33.mjs";
import { n as Card, r as Input, t as Button } from "./card-CO3AMkHH.mjs";
import { G as ArrowLeft, S as LoaderCircle, u as ShieldCheck } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-CgdzKOg3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const navigate = useNavigate();
	const [mode, setMode] = (0, import_react.useState)("signin");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [signInError, setSignInError] = (0, import_react.useState)(null);
	const [emailNotConfirmed, setEmailNotConfirmed] = (0, import_react.useState)(false);
	const [resending, setResending] = (0, import_react.useState)(false);
	const [resendSent, setResendSent] = (0, import_react.useState)(false);
	const [showForgotPassword, setShowForgotPassword] = (0, import_react.useState)(false);
	const [resetSending, setResetSending] = (0, import_react.useState)(false);
	const clearSignInError = () => {
		setSignInError(null);
		setEmailNotConfirmed(false);
		setResendSent(false);
	};
	const switchMode = (next) => {
		setMode(next);
		setShowForgotPassword(false);
		clearSignInError();
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		clearSignInError();
		try {
			if (mode === "signup") {
				const { error } = await supabase.auth.signUp({
					email,
					password
				});
				if (error) throw error;
				toast.success("Account created successfully! You can now sign in.");
				switchMode("signin");
			} else {
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password
				});
				if (error) {
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
			toast.error(mode === "signup" ? "Sign up failed" : "Sign in failed", { description: err instanceof Error ? err.message : void 0 });
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
				email
			});
			if (error) throw error;
			setResendSent(true);
			toast.success("Confirmation email sent", { description: `A new confirmation link has been sent to ${email}.` });
		} catch (err) {
			toast.error("Could not resend confirmation email", { description: err instanceof Error ? err.message : void 0 });
		} finally {
			setResending(false);
		}
	};
	const handleSendResetLink = async (e) => {
		e.preventDefault();
		setResetSending(true);
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
			if (error) throw error;
			toast.success("Password reset link has been sent to your email.");
			setShowForgotPassword(false);
		} catch (err) {
			toast.error("Could not send password reset email", { description: err instanceof Error ? err.message : void 0 });
		} finally {
			setResetSending(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "w-full max-w-sm space-y-5 p-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-6 w-6 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-semibold",
					children: "SecurePulse"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted-foreground",
					children: "Code Auditor"
				})] })]
			}), showForgotPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: handleSendResetLink,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-medium",
							children: "Reset password"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Enter the email address linked to your account and we'll send you a link to reset your password."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "email",
						placeholder: "you@company.com",
						value: email,
						onChange: (e) => setEmail(e.target.value),
						required: true,
						autoFocus: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "submit",
						disabled: resetSending || !email,
						className: "w-full",
						children: [resetSending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }), "Send reset link"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setShowForgotPassword(false),
						className: "flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3 w-3" }), "Back to sign in"]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex rounded-md border border-border/60 p-0.5 text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => switchMode("signin"),
					className: `flex-1 rounded-sm py-1.5 ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`,
					children: "Sign in"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => switchMode("signup"),
					className: `flex-1 rounded-sm py-1.5 ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`,
					children: "Create account"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: handleSubmit,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "email",
						placeholder: "you@company.com",
						value: email,
						onChange: (e) => {
							setEmail(e.target.value);
							if (signInError) clearSignInError();
						},
						required: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							placeholder: "Password",
							value: password,
							onChange: (e) => {
								setPassword(e.target.value);
								if (signInError) clearSignInError();
							},
							minLength: 6,
							required: true
						}), mode === "signin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex justify-end",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowForgotPassword(true),
								className: "text-xs text-muted-foreground underline underline-offset-4 hover:text-primary",
								children: "Forgot password?"
							})
						})]
					}),
					signInError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						role: "alert",
						className: "flex flex-col gap-2 rounded-md border border-critical/50 bg-critical/10 px-3 py-2 text-[12px] text-critical animate-fade-in",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: signInError }), emailNotConfirmed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							variant: "outline",
							size: "sm",
							className: "self-start",
							onClick: handleResendConfirmation,
							disabled: resending || resendSent,
							children: [resending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1.5 h-3.5 w-3.5 animate-spin" }), resendSent ? "Confirmation email sent" : "Resend confirmation email"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "submit",
						disabled: loading,
						className: "w-full",
						children: [loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }), mode === "signup" ? "Create account" : "Sign in"]
					})
				]
			})] })]
		})
	});
}
//#endregion
export { LoginPage as component };
