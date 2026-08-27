import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { i as cn, t as Button } from "./card-CO3AMkHH.mjs";
import { E as GitCompareArrows, S as LoaderCircle, U as Bot, c as Sparkles, i as User, p as Send, r as WandSparkles, s as Terminal } from "../_libs/lucide-react.mjs";
import { r as copilotRemediate, u as useServerFn } from "./scan.functions-tBJ--ymM.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/copilot-chat-B1ouv845.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var SEVERITIES = [
	"critical",
	"high",
	"medium",
	"low"
];
function severityClasses(sev) {
	switch (sev) {
		case "critical": return "bg-critical text-critical-foreground";
		case "high": return "bg-high text-high-foreground";
		case "medium": return "bg-medium text-medium-foreground";
		case "low": return "bg-low text-low-foreground";
	}
}
function severityRing(sev) {
	switch (sev) {
		case "critical": return "border-critical/60 shadow-[0_0_24px_-8px_var(--critical)]";
		case "high": return "border-high/60";
		case "medium": return "border-medium/60";
		case "low": return "border-low/60";
	}
}
function SeverityBadge({ severity, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", severityClasses(severity), className),
		children: severity
	});
}
/** Maximum number of lines taken from each input before truncation. */
var MAX_INPUT_LINES = 2e3;
var TRUNCATED_MARKER = `… diff truncated at ${MAX_INPUT_LINES} lines`;
function diffLines(a, b) {
	let aLines = a.split("\n");
	let bLines = b.split("\n");
	const truncated = aLines.length > 2e3 || bLines.length > 2e3;
	if (truncated) {
		aLines = aLines.slice(0, MAX_INPUT_LINES);
		bLines = bLines.slice(0, MAX_INPUT_LINES);
	}
	const n = aLines.length;
	const m = bLines.length;
	const dp = new Array(n + 1);
	for (let i = 0; i <= n; i++) dp[i] = new Uint32Array(m + 1);
	for (let i = n - 1; i >= 0; i--) {
		const aLine = aLines[i];
		const nextRow = dp[i + 1];
		for (let j = m - 1; j >= 0; j--) dp[i][j] = aLine === bLines[j] ? nextRow[j + 1] + 1 : Math.max(nextRow[j], dp[i][j + 1]);
	}
	const rows = [];
	const pushRow = (row) => {
		if (rows.length < 4e3) rows.push(row);
	};
	let i = 0, j = 0;
	let la = 1, lb = 1;
	while (i < n && j < m) if (aLines[i] === bLines[j]) {
		pushRow({
			op: "equal",
			left: aLines[i],
			right: bLines[j],
			leftNo: la++,
			rightNo: lb++
		});
		i++;
		j++;
	} else if (dp[i + 1][j] >= dp[i][j + 1]) {
		pushRow({
			op: "del",
			left: aLines[i],
			right: null,
			leftNo: la++,
			rightNo: null
		});
		i++;
	} else {
		pushRow({
			op: "ins",
			left: null,
			right: bLines[j],
			leftNo: null,
			rightNo: lb++
		});
		j++;
	}
	while (i < n) pushRow({
		op: "del",
		left: aLines[i++],
		right: null,
		leftNo: la++,
		rightNo: null
	});
	while (j < m) pushRow({
		op: "ins",
		left: null,
		right: bLines[j++],
		leftNo: null,
		rightNo: lb++
	});
	if (truncated) rows.push({
		op: "mod",
		left: TRUNCATED_MARKER,
		right: TRUNCATED_MARKER,
		leftNo: null,
		rightNo: null
	});
	const merged = [];
	for (let k = 0; k < rows.length; k++) {
		const cur = rows[k];
		const nxt = rows[k + 1];
		if (cur.op === "del" && nxt && nxt.op === "ins") {
			merged.push({
				op: "mod",
				left: cur.left,
				right: nxt.right,
				leftNo: cur.leftNo,
				rightNo: nxt.rightNo
			});
			k++;
		} else merged.push(cur);
	}
	return merged;
}
var SUGGESTIONS = [
	"Fix the SQL injection vulnerability",
	"Replace weak hashing with bcrypt",
	"Sanitize all user-provided HTML inputs"
];
function MiniDiff({ rows }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-2 overflow-hidden rounded-md border border-border/40 bg-[oklch(0.12_0.02_250)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-r border-border/40",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-border/40 bg-critical/5 px-2 py-1 text-[9px] uppercase tracking-widest text-critical",
				children: "Before"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "max-h-56 overflow-auto font-mono text-[10.5px] leading-relaxed",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
					className: "block",
					children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: cn("grid grid-cols-[1.5rem_0.75rem_1fr]", (r.op === "del" || r.op === "mod") && "bg-critical/15", r.op === "ins" && "bg-muted/30 opacity-40"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "select-none px-1 text-right text-muted-foreground/60 tabular-nums",
								children: r.leftNo ?? ""
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "select-none text-center text-critical",
								children: r.op === "del" || r.op === "mod" ? "-" : " "
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "whitespace-pre pr-2",
								children: r.left ?? " "
							})
						]
					}, i))
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border-b border-border/40 bg-low/5 px-2 py-1 text-[9px] uppercase tracking-widest text-low",
			children: "After"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "max-h-56 overflow-auto font-mono text-[10.5px] leading-relaxed",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
				className: "block",
				children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cn("grid grid-cols-[1.5rem_0.75rem_1fr]", (r.op === "ins" || r.op === "mod") && "bg-low/15", r.op === "del" && "bg-muted/30 opacity-40"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "select-none px-1 text-right text-muted-foreground/60 tabular-nums",
							children: r.rightNo ?? ""
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "select-none text-center text-low",
							children: r.op === "ins" || r.op === "mod" ? "+" : " "
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "whitespace-pre pr-2",
							children: r.right ?? " "
						})
					]
				}, i))
			})
		})] })]
	});
}
function AssistantBubble({ msg, currentCode, onToggleDiff, onApply }) {
	const rows = (0, import_react.useMemo)(() => diffLines(currentCode, msg.updatedCode), [currentCode, msg.updatedCode]);
	const changedCount = rows.filter((r) => r.op !== "equal").length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-3.5 w-3.5" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1 space-y-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg rounded-tl-sm border border-border/60 bg-muted/20 px-3 py-2 text-[12px] leading-relaxed",
					children: [msg.summary, msg.changes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-1.5 space-y-0.5 text-[11px] text-muted-foreground",
						children: msg.changes.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: "›"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: c })]
						}, i))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: onToggleDiff,
						className: "inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[10.5px] hover:bg-muted/60",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitCompareArrows, { className: "h-3 w-3" }),
							msg.diffOpen ? "Hide" : "Review",
							" changes",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-1 rounded bg-primary/20 px-1 text-[9px] text-primary",
								children: changedCount
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						onClick: onApply,
						disabled: msg.applied || msg.updatedCode === currentCode,
						className: "h-7 gap-1 bg-primary px-2 text-[11px] text-primary-foreground hover:opacity-90",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, { className: "h-3 w-3" }), msg.applied ? "Applied" : "Apply to Editor"]
					})]
				}),
				msg.diffOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniDiff, { rows })
			]
		})]
	});
}
function CopilotChat({ sourceCode, fileType, onApplyCode }) {
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [input, setInput] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const scrollRef = (0, import_react.useRef)(null);
	const remediate = useServerFn(copilotRemediate);
	(0, import_react.useEffect)(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth"
		});
	}, [messages, loading]);
	const submit = async (text) => {
		const instruction = text.trim();
		if (!instruction || loading) return;
		const userMsg = {
			id: crypto.randomUUID(),
			role: "user",
			text: instruction
		};
		setMessages((m) => [...m, userMsg]);
		setInput("");
		setLoading(true);
		try {
			const res = await remediate({ data: {
				instruction,
				source_code: sourceCode,
				file_type: fileType
			} });
			setMessages((m) => [...m, {
				id: crypto.randomUUID(),
				role: "assistant",
				summary: res.summary,
				changes: res.changes,
				updatedCode: res.updated_code,
				diffOpen: false,
				applied: false
			}]);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Copilot failed";
			toast.error(message);
			setMessages((m) => [...m, {
				id: crypto.randomUUID(),
				role: "assistant",
				summary: `⚠ ${message}`,
				changes: [],
				updatedCode: sourceCode,
				diffOpen: false,
				applied: true
			}]);
		} finally {
			setLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-primary/30 bg-[oklch(0.12_0.02_250)] shadow-[0_0_40px_-20px_var(--primary)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between border-b border-border/60 bg-[oklch(0.14_0.02_250)]/95 px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Terminal, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute -right-0.5 -top-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-primary" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[12px] font-semibold leading-tight",
						children: "AI Remediation Copilot"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[9.5px] uppercase tracking-widest text-muted-foreground",
						children: "natural language › secure code"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary",
					children: fileType
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				ref: scrollRef,
				className: "flex-1 space-y-3 overflow-y-auto px-3 py-3",
				children: [
					messages.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3 py-4 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[12px] font-medium",
								children: "Ask the Copilot anything about this file"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-1.5 px-2",
								children: SUGGESTIONS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => submit(s),
									className: "w-full rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-left text-[11px] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
									children: ["› ", s]
								}, s))
							})
						]
					}),
					messages.map((m, i) => m.role === "user" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "max-w-[85%] rounded-lg rounded-tr-sm bg-primary/15 px-3 py-1.5 text-[12px] text-foreground",
							children: m.text
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-3.5 w-3.5 text-muted-foreground" })
						})]
					}, m.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssistantBubble, {
						msg: m,
						currentCode: sourceCode,
						onToggleDiff: () => setMessages((prev) => prev.map((x, xi) => xi === i && x.role === "assistant" ? {
							...x,
							diffOpen: !x.diffOpen
						} : x)),
						onApply: () => {
							onApplyCode(m.updatedCode);
							setMessages((prev) => prev.map((x, xi) => xi === i && x.role === "assistant" ? {
								...x,
								applied: true
							} : x));
							toast.success("Copilot patch applied", { description: m.summary });
						}
					}, m.id)),
					loading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-3.5 w-3.5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center gap-2 rounded-lg rounded-tl-sm border border-border/60 bg-muted/20 px-3 py-2 text-[11.5px] text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin text-primary" }), "Analyzing file & synthesizing patch…"]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => {
					e.preventDefault();
					submit(input);
				},
				className: "flex items-center gap-1.5 border-t border-border/60 bg-[oklch(0.14_0.02_250)]/95 px-2 py-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "select-none pl-1 font-mono text-[13px] text-primary",
						children: "›"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: input,
						onChange: (e) => setInput(e.target.value),
						disabled: loading || !sourceCode.trim(),
						placeholder: sourceCode.trim() ? "e.g. Fix the XSS on line 42 using DOMPurify…" : "Paste, upload, or scan a repo first — then ask me anything about it",
						className: "flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted-foreground/60"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						size: "sm",
						disabled: loading || !input.trim() || !sourceCode.trim(),
						className: "h-7 w-7 shrink-0 bg-primary p-0 text-primary-foreground hover:opacity-90",
						children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-3.5 w-3.5" })
					})
				]
			})
		]
	});
}
//#endregion
export { severityRing as a, diffLines as i, SEVERITIES as n, SeverityBadge as r, CopilotChat as t };
