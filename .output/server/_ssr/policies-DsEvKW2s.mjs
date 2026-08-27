import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { i as cn, n as Card, r as Input, t as Button } from "./card-CO3AMkHH.mjs";
import { A as FileCheckCorner, H as Boxes, T as KeyRound, c as Sparkles, d as ShieldAlert, f as Settings2, m as Search, n as Wrench, u as ShieldCheck } from "../_libs/lucide-react.mjs";
import { l as togglePolicy, n as RequireAuth, o as listPolicies, t as AppShell, u as useServerFn } from "./scan.functions-tBJ--ymM.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as useQueryClient, n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/policies-DsEvKW2s.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = Switch$1.displayName;
var badgeVariants = cva("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", {
	variants: { variant: {
		default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
		secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
		destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
		outline: "text-foreground"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
var FRAMEWORKS = [
	{
		key: "OWASP Top 10",
		icon: ShieldAlert,
		tint: "text-primary",
		ring: "ring-primary/30",
		blurb: "Web application security baseline."
	},
	{
		key: "Smart Contract Safeguards",
		icon: Boxes,
		tint: "text-high",
		ring: "ring-high/30",
		blurb: "Solidity & EVM contract hardening."
	},
	{
		key: "Secret Scanning",
		icon: KeyRound,
		tint: "text-medium",
		ring: "ring-medium/30",
		blurb: "Detect leaked credentials & tokens."
	},
	{
		key: "Regulatory Compliance",
		icon: FileCheckCorner,
		tint: "text-low",
		ring: "ring-low/30",
		blurb: "SOC 2, HIPAA, PCI-DSS, GDPR alignment."
	}
];
var PRESETS = [
	{
		key: "strict",
		label: "Strict Security Mode",
		icon: Sparkles,
		description: "Enable every policy across all frameworks.",
		match: () => true
	},
	{
		key: "dev",
		label: "Dev-Friendly",
		icon: Wrench,
		description: "Only medium & high impact: OWASP + Secret Scanning.",
		match: (p) => p.category === "OWASP Top 10" || p.category === "Secret Scanning"
	},
	{
		key: "custom",
		label: "Custom Policy",
		icon: Settings2,
		description: "Fine-tune each rule manually."
	}
];
function Policies() {
	const qc = useQueryClient();
	const listFn = useServerFn(listPolicies);
	const toggleFn = useServerFn(togglePolicy);
	const [query, setQuery] = (0, import_react.useState)("");
	const [applyingPreset, setApplyingPreset] = (0, import_react.useState)(null);
	const [activePreset, setActivePreset] = (0, import_react.useState)("custom");
	const { data: policies = [], isLoading } = useQuery({
		queryKey: ["policies"],
		queryFn: async () => await listFn()
	});
	const toggle = async (p, next) => {
		setActivePreset("custom");
		try {
			await toggleFn({ data: {
				id: p.id,
				enabled: next
			} });
			toast.success(`Security Policy ${p.name} ${next ? "enabled" : "disabled"}.`, { description: "Future audits will reflect this configuration." });
			await qc.invalidateQueries({ queryKey: ["policies"] });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Could not update security policy.");
		}
	};
	const applyPreset = async (preset) => {
		if (preset.key === "custom") {
			setActivePreset("custom");
			return;
		}
		setApplyingPreset(preset.key);
		try {
			const changes = policies.filter((p) => {
				const desired = preset.match(p);
				return p.enabled !== desired;
			});
			await Promise.all(changes.map((p) => toggleFn({ data: {
				id: p.id,
				enabled: preset.match(p)
			} })));
			await qc.invalidateQueries({ queryKey: ["policies"] });
			setActivePreset(preset.key);
			toast.success(`${preset.label} applied.`, { description: `${changes.length} polic${changes.length === 1 ? "y" : "ies"} updated. Future audits will reflect this configuration.` });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Could not apply policy preset.");
		} finally {
			setApplyingPreset(null);
		}
	};
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		if (!q) return policies;
		return policies.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
	}, [policies, query]);
	const enabledCount = policies.filter((p) => p.enabled).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Security Policies",
		subtitle: `${enabledCount} / ${policies.length} active · applied on every scan`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto max-w-7xl px-6 py-8",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-[260px_1fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "space-y-3 lg:sticky lg:top-20 lg:self-start",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
							children: "Quick-select presets"
						}),
						PRESETS.map((preset) => {
							const Icon = preset.icon;
							const isActive = activePreset === preset.key;
							const isApplying = applyingPreset === preset.key;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => applyPreset(preset),
								disabled: applyingPreset !== null,
								className: cn("group w-full rounded-lg border p-3 text-left transition", isActive ? "border-primary/60 bg-primary/5 glow-primary" : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70", applyingPreset !== null && !isApplying && "opacity-50"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: cn("flex h-7 w-7 items-center justify-center rounded-md", isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:text-foreground"),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-medium",
											children: preset.label
										}),
										isApplying && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "ml-auto text-[10px] text-muted-foreground",
											children: "applying…"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-xs leading-relaxed text-muted-foreground",
									children: preset.description
								})]
							}, preset.key);
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "border-border/60 bg-card/40 p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
								children: "Compliance coverage"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 space-y-2",
								children: FRAMEWORKS.map((f) => {
									const items = policies.filter((p) => p.category === f.key);
									const on = items.filter((p) => p.enabled).length;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate text-muted-foreground",
											children: f.key
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											variant: "outline",
											className: "border-border/60 font-mono text-[10px]",
											children: [
												on,
												"/",
												items.length
											]
										})]
									}, f.key);
								})
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: query,
								onChange: (e) => setQuery(e.target.value),
								placeholder: "Search policies (e.g. reentrancy, AWS, HIPAA)…",
								className: "pl-9"
							})]
						}),
						isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm text-muted-foreground",
							children: "Loading policies…"
						}),
						FRAMEWORKS.map((framework) => {
							const items = filtered.filter((p) => p.category === framework.key);
							if (items.length === 0 && query) return null;
							const Icon = framework.icon;
							const total = policies.filter((p) => p.category === framework.key).length;
							const active = policies.filter((p) => p.category === framework.key && p.enabled).length;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
								className: "space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-end justify-between gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: cn("flex h-9 w-9 items-center justify-center rounded-lg bg-card ring-1", framework.ring),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: cn("h-4 w-4", framework.tint) })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "text-sm font-semibold tracking-tight",
											children: framework.key
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted-foreground",
											children: framework.blurb
										})] })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
										variant: "outline",
										className: "border-border/60 font-mono text-[10px]",
										children: [
											active,
											"/",
											total,
											" active"
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid gap-3 md:grid-cols-2",
									children: items.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
										className: cn("relative overflow-hidden border-border/60 bg-card/60 p-4 transition", p.enabled && "ring-1 ring-primary/20"),
										children: [p.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start justify-between gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: cn("flex h-6 w-6 items-center justify-center rounded-md transition", p.enabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-3.5 w-3.5" })
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
														className: "truncate text-sm font-medium",
														children: p.name
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "mt-1.5 text-xs leading-relaxed text-muted-foreground",
													children: p.description
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: p.enabled,
												onCheckedChange: (v) => toggle(p, v)
											})]
										})]
									}, p.id))
								})]
							}, framework.key);
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Changes apply to every future scan. Existing reports remain unchanged."
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => applyPreset(PRESETS[0]),
								disabled: applyingPreset !== null,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "mr-1.5 h-3.5 w-3.5" }), " Enable everything"]
							})]
						})
					]
				})]
			})
		})
	}) });
}
//#endregion
export { Policies as component };
