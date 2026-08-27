import { o as __toESM } from "../_runtime.mjs";
import { a as performance_default, i as init_performance } from "../_libs/h3-v2+rou3+srvx+unenv.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { a as DialogOverlay$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { i as cn, n as Card, r as Input, t as Button } from "./card-CO3AMkHH.mjs";
import { B as ChevronDown, D as GitBranch, F as CircleX, I as CircleCheck, K as Activity, L as CircleAlert, M as ExternalLink, O as FileDown, P as Circle, R as ChevronUp, S as LoaderCircle, V as Check, W as ArrowRight, a as Upload, d as ShieldAlert, g as ScanLine, j as FileBraces, k as FileCodeCorner, m as Search, o as TrendingUp, s as Terminal, t as X, u as ShieldCheck, w as Layers, y as Printer, z as ChevronRight } from "../_libs/lucide-react.mjs";
import { a as Label2, c as Root2, d as SubTrigger2, f as Trigger, i as ItemIndicator2, l as Separator2, n as Content2, o as Portal2, r as Item2, s as RadioItem2, t as CheckboxItem2, u as SubContent2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { a as SelectItemIndicator, c as SelectPortal, d as SelectSeparator$1, f as SelectTrigger$1, i as SelectItem$1, l as SelectScrollDownButton$1, m as SelectViewport, n as SelectContent$1, o as SelectItemText, p as SelectValue$1, r as SelectIcon, s as SelectLabel$1, t as Select$1, u as SelectScrollUpButton$1 } from "../_libs/@radix-ui/react-select+[...].mjs";
import { a as getScanSarif, c as runScan, i as getScanReport, n as RequireAuth, s as listScans, t as AppShell, u as useServerFn } from "./scan.functions-tBJ--ymM.mjs";
import { n as summarizeCompliance } from "./compliance-mapping-BPzS-8qT.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as SEVERITIES, r as SeverityBadge, t as CopilotChat } from "./copilot-chat-B1ouv845.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { i as Trigger$1, n as List, r as Root2$1, t as Content } from "../_libs/radix-ui__react-tabs.mjs";
import { a as Area, c as ResponsiveContainer, i as XAxis, l as Tooltip, n as BarChart, o as CartesianGrid, r as YAxis, s as Bar, t as AreaChart, u as Legend } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-DnMmHT67.js
init_performance();
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
var Select = Select$1;
var SelectValue = SelectValue$1;
var SelectTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger$1, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectIcon, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectTrigger$1.displayName;
var SelectScrollUpButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectScrollUpButton$1.displayName;
var SelectScrollDownButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectScrollDownButton$1.displayName;
var SelectContent = import_react.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent$1, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectViewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectContent$1.displayName;
var SelectLabel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectLabel$1, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectLabel$1.displayName;
var SelectItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem$1, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemIndicator, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemText, { children })]
}));
SelectItem.displayName = SelectItem$1.displayName;
var SelectSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectSeparator$1, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectSeparator$1.displayName;
var Table = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: "relative w-full overflow-auto",
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
		ref,
		className: cn("w-full caption-bottom text-sm", className),
		...props
	})
}));
Table.displayName = "Table";
var TableHeader = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
	ref,
	className: cn("[&_tr]:border-b", className),
	...props
}));
TableHeader.displayName = "TableHeader";
var TableBody = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
	ref,
	className: cn("[&_tr:last-child]:border-0", className),
	...props
}));
TableBody.displayName = "TableBody";
var TableFooter = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tfoot", {
	ref,
	className: cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className),
	...props
}));
TableFooter.displayName = "TableFooter";
var TableRow = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
	ref,
	className: cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className),
	...props
}));
TableRow.displayName = "TableRow";
var TableHead = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
	ref,
	className: cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className),
	...props
}));
TableHead.displayName = "TableHead";
var TableCell = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
	ref,
	className: cn("p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className),
	...props
}));
TableCell.displayName = "TableCell";
var TableCaption = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("caption", {
	ref,
	className: cn("mt-4 text-sm text-muted-foreground", className),
	...props
}));
TableCaption.displayName = "TableCaption";
var Tabs = Root2$1;
var TabsList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
	ref,
	className: cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className),
	...props
}));
TabsList.displayName = List.displayName;
var TabsTrigger = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger$1, {
	ref,
	className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow", className),
	...props
}));
TabsTrigger.displayName = Trigger$1.displayName;
var TabsContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
	ref,
	className: cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className),
	...props
}));
TabsContent.displayName = Content.displayName;
var SCRIPT = [
	{
		tone: "info",
		text: "initializing securepulse core engine..."
	},
	{
		tone: "info",
		text: "running AST analysis on file tree..."
	},
	{
		tone: "warn",
		text: "[WARNING] potential secret token detected on line 14."
	},
	{
		tone: "danger",
		text: "[DANGER] unvalidated input detected - potential SQL Injection vulnerability found."
	},
	{
		tone: "info",
		text: "comparing findings against OWASP Top 10 policies..."
	},
	{
		tone: "info",
		text: "compiling remediation recommendations..."
	},
	{
		tone: "success",
		text: "scan complete. health score generated: 57/100."
	}
];
var FILLERS = [
	{
		tone: "info",
		text: "cross-referencing CWE Top 25 signatures..."
	},
	{
		tone: "info",
		text: "evaluating cryptographic primitive usage..."
	},
	{
		tone: "info",
		text: "taint-tracking user-controlled sources..."
	},
	{
		tone: "info",
		text: "requesting AI patch synthesis..."
	},
	{
		tone: "info",
		text: "verifying fixed_code_block syntactic integrity..."
	},
	{
		tone: "info",
		text: "sealing audit report..."
	}
];
var toneCls = {
	info: "text-[#00ff88]",
	warn: "text-[#ffe066]",
	danger: "text-[#ff5566]",
	success: "text-[#7dff9a]"
};
function ScanSimulator({ running, completed, failed, scanId, onDismiss }) {
	const [lines, setLines] = (0, import_react.useState)([]);
	const [progress, setProgress] = (0, import_react.useState)(0);
	const scrollRef = (0, import_react.useRef)(null);
	const idRef = (0, import_react.useRef)(0);
	const startRef = (0, import_react.useRef)(0);
	const scriptIdx = (0, import_react.useRef)(0);
	const fillerIdx = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		if (running && !completed && !failed) {
			setLines([]);
			setProgress(0);
			idRef.current = 0;
			scriptIdx.current = 0;
			fillerIdx.current = 0;
			startRef.current = performance_default.now();
		}
	}, [
		running,
		completed,
		failed
	]);
	(0, import_react.useEffect)(() => {
		if (!running || completed || failed) return;
		const interval = setInterval(() => {
			const next = scriptIdx.current < SCRIPT.length ? SCRIPT[scriptIdx.current++] : FILLERS[fillerIdx.current++ % FILLERS.length];
			setLines((prev) => [...prev, {
				id: idRef.current++,
				tone: next.tone,
				text: next.text
			}]);
		}, 300);
		return () => clearInterval(interval);
	}, [
		running,
		completed,
		failed
	]);
	(0, import_react.useEffect)(() => {
		if (!running || completed || failed) return;
		let raf = 0;
		const tick = () => {
			const elapsed = performance_default.now() - startRef.current;
			const target = Math.min(95, 100 * (1 - Math.exp(-elapsed / 3800)));
			setProgress((p) => p < target ? p + (target - p) * .15 : p);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [
		running,
		completed,
		failed
	]);
	(0, import_react.useEffect)(() => {
		if (!completed) return;
		setProgress(100);
		setLines((prev) => {
			const already = new Set(prev.map((l) => l.text));
			const remaining = SCRIPT.filter((s) => !already.has(s.text)).map((s) => ({
				id: idRef.current++,
				tone: s.tone,
				text: s.text
			}));
			return [...prev, ...remaining];
		});
	}, [completed]);
	(0, import_react.useEffect)(() => {
		if (!failed) return;
		setLines((prev) => [...prev, {
			id: idRef.current++,
			tone: "danger",
			text: "[ERROR] pipeline halted. see details above."
		}]);
	}, [failed]);
	(0, import_react.useEffect)(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth"
		});
	}, [lines]);
	const pct = Math.round(progress);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative overflow-hidden rounded-lg border border-[#00ff88]/30 shadow-[0_0_40px_-10px_rgba(0,255,136,0.35)]",
		style: { background: "#020604" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"aria-hidden": true,
				className: "pointer-events-none absolute inset-0 opacity-[0.08]",
				style: { backgroundImage: "repeating-linear-gradient(0deg, rgba(0,255,136,0.9) 0px, rgba(0,255,136,0.9) 1px, transparent 1px, transparent 3px)" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex items-center justify-between border-b border-[#00ff88]/20 bg-black/60 px-4 py-2 font-mono text-[11px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 text-[#00ff88]/80",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "securepulse@audit-engine : ~/scan.sh" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-2 uppercase tracking-widest",
					children: completed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 text-[#7dff9a]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3" }), " completed"]
					}) : failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 text-[#ff5566]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-3 w-3" }), " failed"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 text-[#00ff88]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "relative flex h-2 w-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00ff88] opacity-70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex h-2 w-2 rounded-full bg-[#00ff88]" })]
						}), "live"]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: scrollRef,
				className: "relative h-[320px] overflow-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed",
				style: { textShadow: "0 0 6px rgba(0,255,136,0.35)" },
				children: [lines.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2 animate-fade-in",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "shrink-0 text-[#00ff88]/40",
						children: "$"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("whitespace-pre-wrap break-words", toneCls[l.tone]),
						children: l.text
					})]
				}, l.id)), running && !completed && !failed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[#00ff88]/60",
						children: "$"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-3 w-2 animate-pulse bg-[#00ff88]" })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative border-t border-[#00ff88]/20 bg-black/70 px-4 py-3 font-mono",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[#00ff88]/70",
							children: completed ? "audit sealed" : failed ? "pipeline error" : "scanning pipeline"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tabular-nums text-[#00ff88]",
							children: [pct, "%"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative h-2 overflow-hidden rounded-full bg-[#00ff88]/10",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("h-full rounded-full transition-[width] duration-300 ease-out", failed ? "bg-[#ff5566]" : "bg-gradient-to-r from-[#00ff88] to-[#7dff9a]"),
							style: {
								width: `${pct}%`,
								boxShadow: failed ? void 0 : "0 0 12px rgba(0,255,136,0.65)"
							}
						}), !completed && !failed && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute inset-y-0 w-24 -translate-x-full animate-[scan-shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent",
							style: { left: `${pct}%` }
						})]
					}),
					completed && scanId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-col items-center gap-3 rounded-lg border border-[#00ff88]/40 bg-[#00ff88]/5 p-4 text-center animate-fade-in",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-lg font-semibold text-[#7dff9a]",
								children: "Scan Completed!"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[11px] uppercase tracking-widest text-[#00ff88]/60",
								children: "audit report ready · findings sealed"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-1 flex flex-wrap items-center justify-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									size: "lg",
									className: "bg-[#00ff88] font-semibold text-black hover:bg-[#7dff9a] shadow-[0_0_24px_-4px_rgba(0,255,136,0.85)]",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/scans/$id",
										params: { id: scanId },
										children: ["View Interactive Audit Report", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "ml-1.5 h-4 w-4" })]
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "sm",
									onClick: onDismiss,
									className: "text-[#00ff88]/70 hover:bg-[#00ff88]/10 hover:text-[#7dff9a]",
									children: "Run another"
								})]
							})
						]
					}),
					failed && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex items-center justify-between gap-3 rounded-lg border border-[#ff5566]/40 bg-[#ff5566]/5 p-3 text-[#ff5566] animate-fade-in",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-4 w-4" }), " scan failed. adjust the input and retry."]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: onDismiss,
							className: "text-[#ff5566] hover:bg-[#ff5566]/10",
							children: "dismiss"
						})]
					})
				]
			})
		]
	});
}
var SEV_COLORS = {
	critical: "var(--critical)",
	high: "var(--high)",
	medium: "var(--medium)",
	low: "var(--low)"
};
var TREND_SEVERITIES = [
	"low",
	"medium",
	"high",
	"critical"
];
function totalVulns(c) {
	if (!c) return 0;
	return (c.critical ?? 0) + (c.high ?? 0) + (c.medium ?? 0) + (c.low ?? 0);
}
function ScanAnalytics({ scans }) {
	const trend = (0, import_react.useMemo)(() => {
		const days = [];
		const now = /* @__PURE__ */ new Date();
		for (let i = 13; i >= 0; i--) {
			const d = new Date(now);
			d.setHours(0, 0, 0, 0);
			d.setDate(d.getDate() - i);
			const key = d.toISOString().slice(0, 10);
			days.push({
				key,
				label: d.toLocaleDateString(void 0, {
					month: "short",
					day: "numeric"
				}),
				date: d
			});
		}
		const byDay = {};
		for (const s of scans) {
			const key = new Date(s.created_at).toISOString().slice(0, 10);
			const bucket = byDay[key] ??= {
				critical: 0,
				high: 0,
				medium: 0,
				low: 0
			};
			bucket.critical += s.vulnerabilities_count?.critical ?? 0;
			bucket.high += s.vulnerabilities_count?.high ?? 0;
			bucket.medium += s.vulnerabilities_count?.medium ?? 0;
			bucket.low += s.vulnerabilities_count?.low ?? 0;
		}
		return days.map((d) => ({
			label: d.label,
			...byDay[d.key] ?? {
				critical: 0,
				high: 0,
				medium: 0,
				low: 0
			}
		}));
	}, [scans]);
	const byLanguage = (0, import_react.useMemo)(() => {
		const map = {};
		for (const s of scans) {
			const lang = s.file_type || "Unknown";
			const bucket = map[lang] ??= {
				critical: 0,
				high: 0,
				medium: 0,
				low: 0
			};
			bucket.critical += s.vulnerabilities_count?.critical ?? 0;
			bucket.high += s.vulnerabilities_count?.high ?? 0;
			bucket.medium += s.vulnerabilities_count?.medium ?? 0;
			bucket.low += s.vulnerabilities_count?.low ?? 0;
		}
		return Object.entries(map).map(([language, v]) => ({
			language,
			...v,
			total: v.critical + v.high + v.medium + v.low
		})).sort((a, b) => b.total - a.total).slice(0, 8);
	}, [scans]);
	const totalFindings = scans.reduce((n, s) => n + totalVulns(s.vulnerabilities_count), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[1.4fr_1fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "border-border/60 bg-card/60 p-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-4 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold",
						children: "Vulnerability trend"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-[11px] text-muted-foreground",
					children: "Findings by severity across the last 14 days"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[10px] uppercase tracking-widest text-muted-foreground",
						children: "Total"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-lg font-semibold tabular-nums",
						children: totalFindings
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-56",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
						data: trend,
						margin: {
							top: 4,
							right: 8,
							left: -20,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: [
								"critical",
								"high",
								"medium",
								"low"
							].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
								id: `grad-${s}`,
								x1: "0",
								y1: "0",
								x2: "0",
								y2: "1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "0%",
									stopColor: SEV_COLORS[s],
									stopOpacity: .55
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "100%",
									stopColor: SEV_COLORS[s],
									stopOpacity: 0
								})]
							}, s)) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								strokeDasharray: "3 3",
								stroke: "var(--border)",
								strokeOpacity: .35,
								vertical: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "label",
								tick: {
									fill: "var(--muted-foreground)",
									fontSize: 10
								},
								axisLine: false,
								tickLine: false,
								interval: 1
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								tick: {
									fill: "var(--muted-foreground)",
									fontSize: 10
								},
								axisLine: false,
								tickLine: false,
								allowDecimals: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								contentStyle: {
									background: "var(--card)",
									border: "1px solid var(--border)",
									borderRadius: 8,
									fontSize: 12
								},
								labelStyle: { color: "var(--muted-foreground)" }
							}),
							TREND_SEVERITIES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								type: "monotone",
								dataKey: s,
								stackId: "1",
								stroke: SEV_COLORS[s],
								strokeWidth: 1.5,
								fill: `url(#grad-${s})`
							}, s))
						]
					})
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "border-border/60 bg-card/60 p-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold",
						children: "Vulnerabilities by language"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-[11px] text-muted-foreground",
					children: "Where risk concentrates across your stack"
				})]
			}), byLanguage.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-56 items-center justify-center text-xs text-muted-foreground",
				children: "No scans yet."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-56",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
						data: byLanguage,
						layout: "vertical",
						margin: {
							top: 4,
							right: 8,
							left: 8,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								strokeDasharray: "3 3",
								stroke: "var(--border)",
								strokeOpacity: .35,
								horizontal: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								type: "number",
								tick: {
									fill: "var(--muted-foreground)",
									fontSize: 10
								},
								axisLine: false,
								tickLine: false,
								allowDecimals: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								type: "category",
								dataKey: "language",
								tick: {
									fill: "var(--muted-foreground)",
									fontSize: 10
								},
								axisLine: false,
								tickLine: false,
								width: 72
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								cursor: { fill: "color-mix(in oklch, var(--muted) 30%, transparent)" },
								contentStyle: {
									background: "var(--card)",
									border: "1px solid var(--border)",
									borderRadius: 8,
									fontSize: 12
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {
								wrapperStyle: {
									fontSize: 10,
									paddingTop: 4
								},
								iconSize: 8
							}),
							SEVERITIES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
								dataKey: s,
								stackId: "lang",
								fill: SEV_COLORS[s],
								radius: s === "low" ? [
									0,
									3,
									3,
									0
								] : 0
							}, s))
						]
					})
				})
			})]
		})]
	});
}
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
});
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
DialogFooter.displayName = "DialogFooter";
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogDescription$1.displayName;
var SEV_TINT = {
	critical: "bg-critical/15 text-critical border-critical/40",
	high: "bg-high/15 text-high border-high/40",
	medium: "bg-medium/15 text-medium border-medium/40",
	low: "bg-low/15 text-low border-low/40"
};
function total(c) {
	if (!c) return 0;
	return (c.critical ?? 0) + (c.high ?? 0) + (c.medium ?? 0) + (c.low ?? 0);
}
function verdict(score) {
	if (score >= 85) return {
		label: "Production ready",
		tone: "text-low"
	};
	if (score >= 65) return {
		label: "Minor remediation advised",
		tone: "text-medium"
	};
	if (score >= 40) return {
		label: "Requires remediation",
		tone: "text-high"
	};
	return {
		label: "Do not deploy",
		tone: "text-critical"
	};
}
function downloadBlob(content, mime, filename) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
function ReportExportDialog({ scan, open, onOpenChange }) {
	const [busy, setBusy] = (0, import_react.useState)(null);
	const getReport = useServerFn(getScanReport);
	const getSarif = useServerFn(getScanSarif);
	const reportQuery = useQuery({
		queryKey: ["scan-report", scan?.id],
		queryFn: () => getReport({ data: { id: scan.id } }),
		enabled: open && !!scan
	});
	if (!scan) return null;
	const v = verdict(scan.health_score);
	const counts = scan.vulnerabilities_count ?? {
		critical: 0,
		high: 0,
		medium: 0,
		low: 0
	};
	const findings = total(counts);
	const vulns = reportQuery.data?.vulns ?? [];
	const compliance = summarizeCompliance(vulns.map((vv) => vv.cwe_id));
	const downloadJson = async () => {
		setBusy("json");
		try {
			const payload = {
				report_type: "SecurePulse Executive Summary",
				generated_at: (/* @__PURE__ */ new Date()).toISOString(),
				scan: {
					id: scan.id,
					project: scan.project_name,
					language: scan.file_type,
					status: scan.status,
					created_at: scan.created_at,
					integrity_score: scan.health_score,
					verdict: v.label,
					findings_total: findings,
					findings_by_severity: counts
				},
				compliance: {
					owasp_categories: compliance.owaspCategories,
					cwe_top_25_hits: compliance.cweTop25Hits,
					pci_dss_requirements: compliance.pciDssRequirements,
					soc2_criteria: compliance.soc2Criteria
				},
				findings: vulns.map((vv) => ({
					title: vv.title,
					severity: vv.severity,
					cwe_id: vv.cwe_id,
					file_path: vv.file_path,
					line_start: vv.line_start,
					line_end: vv.line_end
				}))
			};
			downloadBlob(JSON.stringify(payload, null, 2), "application/json", `securepulse-${scan.project_name.replace(/\s+/g, "-")}-${scan.id.slice(0, 8)}.json`);
		} finally {
			setBusy(null);
		}
	};
	const downloadSarif = async () => {
		setBusy("sarif");
		try {
			const sarif = await getSarif({ data: { id: scan.id } });
			downloadBlob(JSON.stringify(sarif, null, 2), "application/json", `securepulse-${scan.project_name.replace(/\s+/g, "-")}-${scan.id.slice(0, 8)}.sarif`);
		} finally {
			setBusy(null);
		}
	};
	const printPdf = async () => {
		setBusy("pdf");
		if (reportQuery.isLoading) await reportQuery.refetch();
		setBusy(null);
		window.print();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-2xl overflow-hidden p-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "border-b border-border/60 bg-gradient-to-br from-card to-card/60 px-6 py-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
						className: "flex items-center gap-2 text-base",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4 text-primary" }), "Audit executive summary"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Printable snapshot of repository integrity and compliance posture." })] })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					id: "printable-report",
					className: "max-h-[65vh] space-y-5 overflow-auto px-6 py-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "flex items-start justify-between gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] uppercase tracking-widest text-muted-foreground",
									children: "Project"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-lg font-semibold tracking-tight",
									children: scan.project_name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-0.5 text-xs text-muted-foreground",
									children: [
										scan.file_type,
										" · ",
										new Date(scan.created_at).toLocaleString()
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-0.5 font-mono text-[10px] text-muted-foreground",
									children: ["Scan ID · ", scan.id]
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-center glow-primary",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] uppercase tracking-widest text-muted-foreground",
										children: "Integrity"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-3xl font-bold tabular-nums text-primary",
										children: scan.health_score
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `text-[10px] font-medium ${v.tone}`,
										children: v.label
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
								children: "Findings by severity"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-4 gap-2",
								children: [
									"critical",
									"high",
									"medium",
									"low"
								].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `rounded-md border px-3 py-2 ${SEV_TINT[s]}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-lg font-bold tabular-nums",
										children: counts[s] ?? 0
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] uppercase tracking-widest opacity-80",
										children: s
									})]
								}, s))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 text-[11px] text-muted-foreground",
								children: [
									findings,
									" total finding",
									findings === 1 ? "" : "s",
									" across enforced policy set."
								]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
							className: "grid gap-3 md:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-md border border-border/60 bg-muted/20 p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] uppercase tracking-widest text-muted-foreground",
									children: "Compliance"
								}), reportQuery.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1.5 text-xs text-muted-foreground",
									children: "Computing from findings…"
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
									className: "mt-1.5 space-y-0.5 text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
											"· OWASP:",
											" ",
											compliance.owaspCategories.length ? compliance.owaspCategories.join(", ") : "no mapped categories"
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["· CWE Top 25 hits: ", compliance.cweTop25Hits] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
											"· PCI-DSS:",
											" ",
											compliance.pciDssRequirements.length ? compliance.pciDssRequirements.join(", ") : "none triggered"
										] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
											"· SOC 2:",
											" ",
											compliance.soc2Criteria.length ? compliance.soc2Criteria.join(", ") : "none triggered"
										] })
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-md border border-border/60 bg-muted/20 p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] uppercase tracking-widest text-muted-foreground",
									children: "Pipeline"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
									className: "mt-1.5 space-y-0.5 text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["· Status · ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: scan.status
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "· Engines · structural (AST/heuristic) + AI" })]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
							className: "rounded-md border border-border/60 bg-card/60 p-3 text-[11px] leading-relaxed text-muted-foreground",
							children: "This executive summary is generated from the latest scan snapshot. For per-finding remediation, side-by-side diffs, and AI-suggested patches, open the interactive workspace."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2 border-t border-border/60 bg-card/40 px-6 py-3 print:hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] text-muted-foreground",
						children: "SecurePulse · confidential"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								size: "sm",
								onClick: downloadJson,
								disabled: busy !== null,
								children: busy === "json" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1.5 h-3.5 w-3.5 animate-spin" }), "Packaging…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileBraces, { className: "mr-1.5 h-3.5 w-3.5" }), "Export JSON"] })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								size: "sm",
								onClick: downloadSarif,
								disabled: busy !== null,
								children: busy === "sarif" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1.5 h-3.5 w-3.5 animate-spin" }), "Building…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCodeCorner, { className: "mr-1.5 h-3.5 w-3.5" }), "Export SARIF"] })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								onClick: printPdf,
								disabled: busy !== null,
								className: "glow-primary",
								children: busy === "pdf" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1.5 h-3.5 w-3.5 animate-spin" }), "Rendering PDF…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "mr-1.5 h-3.5 w-3.5" }), "Print / Save as PDF"] })
							})
						]
					})]
				})
			]
		})
	});
}
var SCANNABLE_EXTENSIONS = /* @__PURE__ */ new Set([
	"js",
	"jsx",
	"ts",
	"tsx",
	"py",
	"rb",
	"go",
	"php",
	"java",
	"kt",
	"cs",
	"sol",
	"rs",
	"c",
	"cpp",
	"h",
	"sql",
	"yml",
	"yaml",
	"json",
	"env",
	"dockerfile",
	"sh"
]);
var MAX_FILES = 25;
var MAX_TOTAL_CHARS = 6e4;
async function fetchRepoSourceCode(owner, repoName, branch) {
	const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees/${branch}?recursive=1`);
	if (!treeRes.ok) throw new Error("Could not read repository file tree (branch may be wrong or repo is empty).");
	const blobs = ((await treeRes.json()).tree || []).filter((item) => item.type === "blob" && typeof item.size === "number" && item.size < 5e4 && SCANNABLE_EXTENSIONS.has(item.path.split(".").pop()?.toLowerCase() ?? "") && !item.path.includes("node_modules/") && !item.path.includes("dist/") && !item.path.includes(".lock"));
	if (blobs.length === 0) throw new Error("No scannable source files found in this repository.");
	const selected = blobs.slice(0, MAX_FILES);
	let combined = "";
	for (const blob of selected) {
		if (combined.length >= MAX_TOTAL_CHARS) break;
		try {
			const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${blob.path}`);
			if (!raw.ok) continue;
			const text = await raw.text();
			combined += `\n// ==== File: ${blob.path} ====\n${text}\n`;
		} catch {}
	}
	if (combined.trim().length === 0) throw new Error("Fetched file list but could not read any file contents.");
	return combined.slice(0, MAX_TOTAL_CHARS);
}
function ConnectRepositoryPanel({ submitting, onSubmit, onSelectRepo }) {
	const [username, setUsername] = (0, import_react.useState)("");
	const [repos, setRepos] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [scanningRepo, setScanningRepo] = (0, import_react.useState)(null);
	const fetchGitHubRepos = async () => {
		if (!username.trim()) return;
		setLoading(true);
		setError("");
		try {
			const cleanPath = username.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/^github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
			const parts = cleanPath.split("/").filter(Boolean);
			if (parts.length === 0) throw new Error("Please enter a valid GitHub username or repository URL");
			setUsername(cleanPath);
			if (parts.length >= 2) {
				const owner = parts[0];
				const repoName = parts[1];
				const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);
				if (!response.ok) throw new Error("Repository not found, or it may be private");
				const data = await response.json();
				setRepos([data]);
			} else {
				const owner = parts[0];
				const response = await fetch(`https://api.github.com/users/${owner}/repos?sort=updated&per_page=15`);
				if (!response.ok) throw new Error("GitHub account or organization not found");
				const data = await response.json();
				setRepos(data);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch repository data");
			setRepos([]);
		} finally {
			setLoading(false);
		}
	};
	const handleScanRepo = async (repo) => {
		if (onSelectRepo) onSelectRepo(repo.html_url, repo.name);
		if (!onSubmit) return;
		setScanningRepo(repo.full_name);
		setError("");
		try {
			const branch = repo.default_branch || "main";
			const sourceCode = await fetchRepoSourceCode(repo.owner?.login ?? username, repo.name, branch);
			onSubmit({
				project_name: repo.name,
				file_type: repo.language || "Repository",
				source_code: sourceCode
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : `Failed to read files from ${repo.full_name}`);
		} finally {
			setScanningRepo(null);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 p-4 bg-slate-900/60 rounded-xl border border-slate-800",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					placeholder: "Enter username or repo URL (e.g., octocat/Hello-World)...",
					value: username,
					onChange: (e) => setUsername(e.target.value),
					className: "bg-slate-950 border-slate-800 text-white"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: fetchGitHubRepos,
					disabled: loading || submitting,
					className: "bg-emerald-600 hover:bg-emerald-500 text-white shrink-0",
					children: [loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4 mr-2" }), "Fetch Repos"]
				})]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-red-400 text-sm",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2 max-h-64 overflow-y-auto pr-1",
				children: [repos.map((repo) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between p-3 bg-slate-950/80 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 overflow-hidden mr-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "w-4 h-4 text-emerald-400 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "truncate",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-sm font-medium text-slate-200 truncate",
								children: repo.full_name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-slate-400 truncate",
								children: repo.description || "Public Repository"
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						disabled: submitting || scanningRepo !== null,
						onClick: () => handleScanRepo(repo),
						className: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shrink-0",
						children: scanningRepo === repo.full_name || submitting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Scan Repo ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-3 h-3 ml-1" })] })
					})]
				}, repo.id)), repos.length === 0 && !loading && !error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-slate-400 text-center py-4",
					children: "Enter a username or repository URL and click \"Fetch Repos\"."
				})]
			})
		]
	});
}
var DropdownMenu = Root2;
var DropdownMenuTrigger = Trigger;
var DropdownMenuSubTrigger = import_react.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SubTrigger2, {
	ref,
	className: cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "ml-auto" })]
}));
DropdownMenuSubTrigger.displayName = SubTrigger2.displayName;
var DropdownMenuSubContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubContent2, {
	ref,
	className: cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}));
DropdownMenuSubContent.displayName = SubContent2.displayName;
var DropdownMenuContent = import_react.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	sideOffset,
	className: cn("z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}) }));
DropdownMenuContent.displayName = Content2.displayName;
var DropdownMenuItem = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0", inset && "pl-8", className),
	...props
}));
DropdownMenuItem.displayName = Item2.displayName;
var DropdownMenuCheckboxItem = import_react.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CheckboxItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	checked,
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), children]
}));
DropdownMenuCheckboxItem.displayName = CheckboxItem2.displayName;
var DropdownMenuRadioItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "h-2 w-2 fill-current" }) })
	}), children]
}));
DropdownMenuRadioItem.displayName = RadioItem2.displayName;
var DropdownMenuLabel = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label2, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
	...props
}));
DropdownMenuLabel.displayName = Label2.displayName;
var DropdownMenuSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
DropdownMenuSeparator.displayName = Separator2.displayName;
var DropdownMenuShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("ml-auto text-xs tracking-widest opacity-60", className),
		...props
	});
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
var LANGUAGES = [
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
	"Rust"
];
var STAT_CARD_META = [
	{
		label: "Repos scanned",
		icon: ScanLine,
		tint: "text-primary"
	},
	{
		label: "Active critical exploits",
		icon: ShieldAlert,
		tint: "text-critical"
	},
	{
		label: "Avg code health score",
		icon: Activity,
		tint: "text-primary"
	}
];
var SUPPORTED_EXT = [
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
	"env"
];
var EXT_LANG_MAP = {
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
	sql: "SQL"
};
function Dashboard() {
	const qc = useQueryClient();
	useNavigate();
	const run = useServerFn(runScan);
	const list = useServerFn(listScans);
	const [completedScanId, setCompletedScanId] = (0, import_react.useState)(null);
	const [phase, setPhase] = (0, import_react.useState)("idle");
	const [exportScan, setExportScan] = (0, import_react.useState)(null);
	const [copilotCode, setCopilotCode] = (0, import_react.useState)("");
	const [copilotFileType, setCopilotFileType] = (0, import_react.useState)("Python");
	const { data: scans = [], isLoading } = useQuery({
		queryKey: ["scans"],
		queryFn: async () => {
			try {
				return await list() || [];
			} catch (err) {
				console.warn("Failed to fetch remote scan list, returning empty array:", err);
				return [];
			}
		}
	});
	const scanMutation = useMutation({
		mutationFn: async (input) => run({ data: input }),
		onMutate: () => {
			setPhase("running");
			setCompletedScanId(null);
		},
		onSuccess: async (res) => {
			setCompletedScanId(res.id);
			setPhase("done");
			toast.success("Scan completed successfully", { description: `Health score: ${res.health_score ?? 80}/100` });
			await qc.invalidateQueries({ queryKey: ["scans"] });
		},
		onError: (e) => {
			setPhase("failed");
			toast.error("Scan error", { description: e.message || "Unable to complete security audit." });
		}
	});
	const totals = {
		total: scans.length,
		critical: scans.reduce((n, s) => n + (s.vulnerabilities_count?.critical ?? 0), 0),
		avgHealth: scans.length ? Math.round(scans.reduce((n, s) => n + (s.health_score ?? 0), 0) / scans.length) : 0
	};
	const showSimulator = phase !== "idle";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Scan Dashboard",
		subtitle: "Paste code, upload a file, or connect a repo to audit for OWASP, CWE, and secret exposure.",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/policies",
			className: "text-xs text-muted-foreground hover:text-foreground",
			children: "Manage policies →"
		}),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid-bg border-b border-border/60",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-7xl space-y-6 px-6 py-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCards, { ...totals }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanAnalytics, { scans })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-7xl space-y-8 px-6 py-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]",
					children: [showSimulator ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanSimulator, {
						running: phase === "running",
						completed: phase === "done",
						failed: phase === "failed",
						scanId: completedScanId,
						onDismiss: () => {
							setPhase("idle");
							setCompletedScanId(null);
						}
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanForm, {
						submitting: scanMutation.isPending,
						onSubmit: (v) => {
							setCopilotCode(v.source_code);
							setCopilotFileType(v.file_type);
							scanMutation.mutate(v);
						},
						onCodeChange: (code, fileType) => {
							setCopilotCode(code);
							setCopilotFileType(fileType);
						}
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						className: "min-h-[420px] rounded-xl border border-border/60",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopilotChat, {
							sourceCode: copilotCode,
							fileType: copilotFileType,
							onApplyCode: (code) => setCopilotCode(code)
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					id: "history",
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-base font-semibold tracking-tight",
							children: "Recent audits"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs text-muted-foreground",
							children: [scans.length, " scans"]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "overflow-hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
							className: "hover:bg-transparent",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Project" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Language" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Date" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Threat" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Health" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
									className: "text-right",
									children: "Report"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [
							isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								colSpan: 6,
								className: "py-10 text-center text-sm text-muted-foreground",
								children: "Loading…"
							}) }),
							!isLoading && scans.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								colSpan: 6,
								className: "py-10 text-center text-sm text-muted-foreground",
								children: "No scans yet — submit code above to run your first audit."
							}) }),
							scans.map((s) => {
								const top = topSeverity(s.vulnerabilities_count);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
										className: "font-medium",
										children: s.project_name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs",
										children: s.file_type
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
										className: "text-xs text-muted-foreground",
										children: s.created_at ? new Date(s.created_at).toLocaleString() : "Just now"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: top ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeverityBadge, { severity: top }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted-foreground",
										children: "clean"
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HealthBar, { score: s.health_score ?? 100 }) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
										className: "text-right",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												variant: "ghost",
												size: "sm",
												children: [
													"Report",
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "ml-1 h-3.5 w-3.5" })
												]
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
											align: "end",
											className: "w-56",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
													asChild: true,
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
														to: "/scans/$id",
														params: { id: s.id },
														className: "cursor-pointer",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "mr-2 h-3.5 w-3.5" }), "View online workspace"]
													})
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
													onSelect: () => setExportScan(s),
													className: "cursor-pointer",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "mr-2 h-3.5 w-3.5" }), "Export executive summary"]
												})
											]
										})] })
									})
								] }, s.id);
							})
						] })] })
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReportExportDialog, {
				scan: exportScan,
				open: exportScan !== null,
				onOpenChange: (v) => {
					if (!v) setExportScan(null);
				}
			})
		]
	}) });
}
function StatCards({ total, critical, avgHealth }) {
	const values = [
		total,
		critical,
		`${avgHealth}/100`
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-4 md:grid-cols-3",
		children: STAT_CARD_META.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "border-border/60 bg-card/60 p-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs uppercase tracking-widest text-muted-foreground",
					children: c.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(c.icon, { className: `h-4 w-4 ${c.tint}` })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 text-3xl font-semibold tracking-tight",
				children: values[i]
			})]
		}, c.label))
	});
}
function HealthBar({ score }) {
	const clamped = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-1.5 w-24 overflow-hidden rounded-full bg-muted",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `h-full ${clamped >= 80 ? "bg-low" : clamped >= 50 ? "bg-medium" : clamped >= 30 ? "bg-high" : "bg-critical"}`,
				style: { width: `${clamped}%` }
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "tabular-nums text-xs text-muted-foreground",
			children: clamped
		})]
	});
}
function topSeverity(counts) {
	if (!counts) return null;
	for (const s of SEVERITIES) if ((counts[s] ?? 0) > 0) return s;
	return null;
}
function ScanForm({ submitting, onSubmit, onCodeChange }) {
	const [projectName, setProjectName] = (0, import_react.useState)("");
	const [fileType, setFileType] = (0, import_react.useState)("Python");
	const [code, setCode] = (0, import_react.useState)("");
	const [tab, setTab] = (0, import_react.useState)("paste");
	const [error, setError] = (0, import_react.useState)(null);
	const onCodeChangeRef = (0, import_react.useRef)(onCodeChange);
	(0, import_react.useEffect)(() => {
		onCodeChangeRef.current = onCodeChange;
	}, [onCodeChange]);
	(0, import_react.useEffect)(() => {
		onCodeChangeRef.current?.(code, fileType);
	}, [code, fileType]);
	const handleFile = (0, import_react.useCallback)(async (file) => {
		setError(null);
		const nameLower = file.name.toLowerCase();
		const ext = nameLower.split(".").pop() ?? "";
		const isDockerfile = nameLower === "dockerfile" || nameLower.endsWith(".dockerfile");
		if (!isDockerfile && !SUPPORTED_EXT.includes(ext)) {
			setError(`Unsupported file type ".${ext}". Try a source file such as .py, .js, .ts, .sol, .go, or a Dockerfile.`);
			return;
		}
		const text = await file.text();
		setCode(text.slice(0, 6e4));
		if (!projectName) setProjectName(file.name);
		if (isDockerfile) setFileType("Docker");
		else if (EXT_LANG_MAP[ext]) setFileType(EXT_LANG_MAP[ext]);
	}, [projectName]);
	const onDrop = (e) => {
		e.preventDefault();
		const f = e.dataTransfer.files?.[0];
		if (f) handleFile(f);
	};
	const onPick = (e) => {
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
			setError("That snippet is too short to audit — paste at least a full function or file.");
			return;
		}
		setError(null);
		onSubmit({
			project_name: projectName.trim(),
			file_type: fileType,
			source_code: code
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "border-border/60 bg-card/60 p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 grid gap-3 md:grid-cols-[1fr_180px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mb-1 block text-xs uppercase tracking-widest text-muted-foreground",
					children: "Project name"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: projectName,
					onChange: (e) => setProjectName(e.target.value),
					placeholder: "e.g. payments-api"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mb-1 block text-xs uppercase tracking-widest text-muted-foreground",
					children: "Language"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: fileType,
					onValueChange: setFileType,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: LANGUAGES.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: l,
						children: l
					}, l)) })]
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
				value: tab,
				onValueChange: setTab,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
						className: "bg-muted/50",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "paste",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, { className: "mr-1.5 h-3.5 w-3.5" }), "Paste code"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "upload",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "mr-1.5 h-3.5 w-3.5" }), "Upload file"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
								value: "repo",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitBranch, { className: "mr-1.5 h-3.5 w-3.5" }), "Connect repository"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "paste",
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: code,
							onChange: (e) => {
								setCode(e.target.value);
								if (error) setError(null);
							},
							placeholder: "// Paste your source code here...",
							className: cn("min-h-[240px] bg-[oklch(0.13_0.02_250)] font-mono text-sm", error && "border-critical/70 focus-visible:ring-critical/40")
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "upload",
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onDragOver: (e) => e.preventDefault(),
							onDrop,
							className: "flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/70 bg-muted/20 p-6 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-8 w-8 text-primary" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm",
									children: "Drop a source file here"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: "or"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "cursor-pointer text-xs text-primary underline underline-offset-4",
									children: ["browse files", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "file",
										className: "hidden",
										onChange: onPick,
										accept: ".py,.js,.ts,.tsx,.sol,.go,.rb,.java,.php,.cs,.rs,.sql,Dockerfile,.txt"
									})]
								}),
								code && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-muted-foreground",
									children: [
										"Loaded ",
										code.length.toLocaleString(),
										" characters"
									]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
						value: "repo",
						className: "mt-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectRepositoryPanel, {
							submitting,
							onSubmit
						})
					})
				]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				role: "alert",
				className: "mt-4 flex items-start gap-2 rounded-md border border-critical/50 bg-critical/10 px-3 py-2 text-[12px] text-critical animate-fade-in",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "mt-0.5 h-3.5 w-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: "Enterprise, non-training tier · payloads isolated from model training data."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: submit,
					disabled: submitting,
					className: "glow-primary",
					children: submitting ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }), "Scanning…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Run scan ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "ml-2 h-4 w-4" })] })
				})]
			})
		]
	});
}
//#endregion
export { Dashboard as component };
