import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { i as cn, n as Card, t as Button } from "./card-CO3AMkHH.mjs";
import { A as FileDown, F as Copy, H as ChevronDown, O as GitCompareArrows, U as Check, d as ShieldCheck, l as Sparkles, q as ArrowLeft, r as WandSparkles, u as ShieldOff, w as LoaderCircle, y as RefreshCw } from "../_libs/lucide-react.mjs";
import { l as useScanReportQuery, n as RequireAuth, t as AppShell } from "./use-scan-queries-BnRAowCm.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Route$2 } from "./router-CEZ7_A7D2.mjs";
import { a as severityRing, i as diffLines, n as SEVERITIES, r as SeverityBadge, t as CopilotChat } from "./severity-badge-DjXgWhek.mjs";
import { t as useVirtualizer } from "../_libs/@tanstack/react-virtual+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/scans._id-CsylsHzq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEYWORDS = /* @__PURE__ */ new Set([
	"const",
	"let",
	"var",
	"function",
	"return",
	"if",
	"else",
	"for",
	"while",
	"do",
	"switch",
	"case",
	"break",
	"continue",
	"class",
	"extends",
	"new",
	"this",
	"super",
	"import",
	"from",
	"export",
	"default",
	"async",
	"await",
	"try",
	"catch",
	"finally",
	"throw",
	"typeof",
	"instanceof",
	"in",
	"of",
	"null",
	"undefined",
	"true",
	"false",
	"void",
	"yield",
	"public",
	"private",
	"protected",
	"static",
	"interface",
	"type",
	"enum",
	"implements",
	"readonly",
	"as",
	"is",
	"def",
	"lambda",
	"pass",
	"None",
	"True",
	"False",
	"elif",
	"print",
	"self",
	"and",
	"or",
	"not",
	"with",
	"raise",
	"global",
	"nonlocal",
	"assert",
	"del",
	"except",
	"import",
	"yield",
	"pragma",
	"contract",
	"library",
	"interface",
	"modifier",
	"event",
	"emit",
	"mapping",
	"address",
	"payable",
	"require",
	"assert",
	"revert",
	"memory",
	"storage",
	"calldata",
	"external",
	"internal",
	"virtual",
	"override",
	"uint",
	"uint256",
	"int256",
	"bytes",
	"bytes32",
	"bool",
	"string",
	"constructor",
	"fallback",
	"receive",
	"FROM",
	"RUN",
	"COPY",
	"ADD",
	"WORKDIR",
	"ENV",
	"EXPOSE",
	"CMD",
	"ENTRYPOINT",
	"ARG",
	"LABEL",
	"USER",
	"VOLUME",
	"HEALTHCHECK",
	"ONBUILD",
	"SHELL",
	"MAINTAINER"
]);
function tokenize(line) {
	const out = [];
	const re = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][A-Za-z0-9_$]*\b|[{}()[\];,.:@]|[+\-*/%=<>!&|^~?]+)/g;
	let last = 0;
	let m;
	while ((m = re.exec(line)) !== null) {
		if (m.index > last) out.push({ t: line.slice(last, m.index) });
		const s = m[0];
		let c;
		if (s.startsWith("//") || s.startsWith("#") || s.startsWith("/*")) c = "text-[oklch(0.62_0.03_160)] italic";
		else if (s.startsWith("\"") || s.startsWith("'") || s.startsWith("`")) c = "text-[oklch(0.82_0.14_45)]";
		else if (/^0x[0-9a-fA-F]+$/.test(s) || /^\d/.test(s)) c = "text-[oklch(0.78_0.16_195)]";
		else if (KEYWORDS.has(s)) c = "text-[oklch(0.78_0.19_310)] font-medium";
		else if (/^[A-Z]/.test(s)) c = "text-[oklch(0.82_0.14_75)]";
		else if (/^[+\-*/%=<>!&|^~?]+$/.test(s)) c = "text-[oklch(0.85_0.10_200)]";
		else if (/^[{}()[\];,.:@]$/.test(s)) c = "text-[oklch(0.72_0.02_240)]";
		else c = "text-[oklch(0.88_0.02_240)]";
		out.push({
			t: s,
			c
		});
		last = m.index + s.length;
	}
	if (last < line.length) out.push({ t: line.slice(last) });
	return out;
}
function sevBg(sev) {
	switch (sev) {
		case "critical": return "bg-critical/20 border-l-2 border-critical shadow-[inset_0_0_24px_-6px_var(--critical)]";
		case "high": return "bg-high/15 border-l-2 border-high shadow-[inset_0_0_18px_-8px_var(--high)]";
		case "medium": return "bg-medium/15 border-l-2 border-medium";
		case "low": return "bg-low/15 border-l-2 border-low";
	}
}
var ROW_HEIGHT = 22;
var VIRTUALIZE_THRESHOLD = 500;
function CodeVault({ code, highlights, activeVulnId, patchedLines, onLineClick }) {
	const lines = (0, import_react.useMemo)(() => code.split("\n"), [code]);
	const scrollRef = (0, import_react.useRef)(null);
	const activeRange = highlights.find((h) => h.vulnId === activeVulnId);
	const lineMap = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const h of highlights) for (let i = h.start; i <= h.end; i++) map.set(i, h);
		return map;
	}, [highlights]);
	const virtualize = lines.length > VIRTUALIZE_THRESHOLD;
	const virtualizer = useVirtualizer({
		count: virtualize ? lines.length : 0,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 20
	});
	(0, import_react.useEffect)(() => {
		if (!activeRange) return;
		if (virtualize) virtualizer.scrollToIndex(Math.max(0, activeRange.start - 1), {
			align: "center",
			behavior: "smooth"
		});
		else (scrollRef.current?.querySelector(`[data-line="${activeRange.start}"]`))?.scrollIntoView({
			behavior: "smooth",
			block: "center"
		});
	}, [
		activeRange,
		virtualize,
		virtualizer
	]);
	const renderLine = (n) => {
		const line = lines[n - 1] ?? "";
		const hl = lineMap.get(n);
		const isActive = hl && hl.vulnId === activeVulnId;
		const isPatched = patchedLines.has(n);
		const tokens = tokenize(line);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			"data-line": n,
			onClick: () => hl && onLineClick(hl.vulnId),
			style: { height: ROW_HEIGHT },
			className: cn("group grid grid-cols-[3.5rem_1.25rem_1fr] items-center transition-colors", hl && sevBg(hl.severity), hl && "cursor-pointer", isActive && "ring-1 ring-inset ring-primary/40", isPatched && "!bg-low/20 !border-l-2 !border-low animate-fade-in"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("select-none px-3 text-right text-muted-foreground/50 tabular-nums", hl && "text-foreground/70 font-semibold"),
					children: n
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "select-none text-center text-[10px]",
					children: isPatched ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-low",
						children: "✓"
					}) : hl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-critical",
						children: "●"
					}) : null
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "overflow-hidden whitespace-pre pr-4",
					children: tokens.length === 0 ? " " : tokens.map((tk, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: tk.c,
						children: tk.t
					}, j))
				})
			]
		}, n);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative h-[calc(100vh-3.5rem)] overflow-hidden rounded-lg border border-border/60 bg-[oklch(0.12_0.02_250)] font-mono text-[12.5px] leading-[1.6]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-[oklch(0.14_0.02_250)]/95 px-3 py-2 backdrop-blur",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2.5 w-2.5 rounded-full bg-critical/70" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2.5 w-2.5 rounded-full bg-medium/70" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2.5 w-2.5 rounded-full bg-low/70" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-3 text-[11px] text-muted-foreground",
						children: "source.audit"
					}),
					virtualize && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-2 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-primary",
						children: "virtualized"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-[10px] uppercase tracking-widest text-muted-foreground",
				children: [lines.length, " LOC"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: scrollRef,
			className: "h-[calc(100%-2.5rem)] overflow-auto",
			children: virtualize ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					height: virtualizer.getTotalSize(),
					position: "relative"
				},
				children: virtualizer.getVirtualItems().map((vi) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						transform: `translateY(${vi.start}px)`
					},
					children: renderLine(vi.index + 1)
				}, vi.key))
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "py-2",
				children: lines.map((_, i) => renderLine(i + 1))
			})
		})]
	});
}
function AlignedDiff({ rows }) {
	const leftCls = (op) => op === "del" || op === "mod" ? "bg-critical/15" : op === "ins" ? "bg-muted/30 opacity-50" : "";
	const rightCls = (op) => op === "ins" || op === "mod" ? "bg-low/15" : op === "del" ? "bg-muted/30 opacity-50" : "";
	const marker = (side, op) => {
		if (side === "l") return op === "del" || op === "mod" ? "-" : op === "ins" ? " " : " ";
		return op === "ins" || op === "mod" ? "+" : op === "del" ? " " : " ";
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-2 overflow-hidden rounded-md border border-border/40",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-r border-border/40",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center justify-between border-b border-border/40 bg-critical/5 px-2 py-1 text-[10px] uppercase tracking-widest text-critical",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Vulnerable" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "overflow-auto max-h-64 font-mono text-[11px] leading-relaxed",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
					className: "block",
					children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: cn("grid grid-cols-[1.75rem_1rem_1fr]", leftCls(r.op)),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "select-none px-1 text-right text-muted-foreground/60 tabular-nums",
								children: r.leftNo ?? ""
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "select-none text-center text-critical",
								children: marker("l", r.op)
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
			className: "flex items-center justify-between border-b border-border/40 bg-low/5 px-2 py-1 text-[10px] uppercase tracking-widest text-low",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "AI Fixed" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
			className: "overflow-auto max-h-64 font-mono text-[11px] leading-relaxed",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
				className: "block",
				children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: cn("grid grid-cols-[1.75rem_1rem_1fr]", rightCls(r.op)),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "select-none px-1 text-right text-muted-foreground/60 tabular-nums",
							children: r.rightNo ?? ""
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "select-none text-center text-low",
							children: marker("r", r.op)
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
var VulnCard = (0, import_react.forwardRef)(function VulnCard({ vuln, expanded, applied, onToggle, onApply }, ref) {
	const [diffOpen, setDiffOpen] = (0, import_react.useState)(true);
	const diffRows = (0, import_react.useMemo)(() => diffLines(vuln.vulnerable_code_block || "", vuln.fixed_code_block || ""), [vuln.vulnerable_code_block, vuln.fixed_code_block]);
	const copyPatch = async () => {
		await navigator.clipboard.writeText(vuln.fixed_code_block || "");
		toast.success("Remediation copied");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		ref,
		className: cn("border bg-card/70 p-4 transition-all", severityRing(vuln.severity), expanded && "glow-primary", applied && "opacity-70"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: onToggle,
			className: "flex w-full items-start justify-between gap-2 text-left",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SeverityBadge, { severity: vuln.severity }),
							vuln.cwe_id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground",
								children: vuln.cwe_id
							}),
							applied && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 rounded-full bg-low/20 px-2 py-0.5 text-[10px] font-semibold text-low",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3" }), " Patched"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mt-1.5 text-sm font-semibold leading-snug",
						children: vuln.title
					}),
					(vuln.file_path || vuln.line_start) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-0.5 font-mono text-[11px] text-muted-foreground",
						children: [vuln.file_path || "source", vuln.line_start && `:${vuln.line_start}${vuln.line_end && vuln.line_end !== vuln.line_start ? `-${vuln.line_end}` : ""}`]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180") })]
		}), expanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 space-y-3 animate-fade-in",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-between",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setDiffOpen((v) => !v),
						className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-[11px] hover:bg-muted/60",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GitCompareArrows, { className: "h-3 w-3" }),
							diffOpen ? "Hide" : "Show",
							" side-by-side diff"
						]
					})
				}),
				diffOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlignedDiff, { rows: diffRows }),
				vuln.remediation_steps && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-border/60 bg-muted/20 p-3 text-[12px] leading-relaxed",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1 text-[10px] uppercase tracking-widest text-muted-foreground",
						children: "Remediation"
					}), vuln.remediation_steps]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "outline",
						onClick: copyPatch,
						className: "gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5" }), " Copy Remediation"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						onClick: onApply,
						disabled: applied || !vuln.fixed_code_block,
						className: "gap-1.5 bg-primary text-primary-foreground hover:opacity-90",
						children: applied ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" }), " Applied"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, { className: "h-3.5 w-3.5" }), " Apply Patch"] })
					})]
				})
			]
		})]
	});
});
var PAGE_WIDTH = 612;
var PAGE_HEIGHT = 792;
var MARGIN = 48;
var LINE_HEIGHT = 14;
var FONT_SIZE = 10;
/** Escapes a text string for a PDF literal-string operand. */
function escapePdfText(text) {
	return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "?");
}
/** Builds the report as a real application/pdf Blob, ready for download. */
function createRemediationReportPdf(data) {
	const contentStream = [
		"SecurePulse Remediation Report",
		"",
		`Project: ${data.projectName}`,
		`Scan: ${data.scanId}`,
		`Generated: ${data.generatedAt}`,
		"",
		`Findings: ${data.totalFindings}`,
		`Patches applied: ${data.appliedCount}`,
		"",
		"This document summarizes AI-suggested remediations for identified vulnerabilities."
	].map((line, i) => {
		return `BT /F1 ${FONT_SIZE} Tf ${MARGIN} ${744 - i * LINE_HEIGHT} Td (${escapePdfText(line)}) Tj ET`;
	}).join("\n");
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
		`<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
	];
	let pdf = "%PDF-1.4\n";
	const offsets = [0];
	objects.forEach((body, idx) => {
		offsets[idx + 1] = pdf.length;
		pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
	});
	const xrefOffset = pdf.length;
	pdf += `xref\n0 ${objects.length + 1}\n`;
	pdf += "0000000000 65535 f \n";
	for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
	return new Blob([pdf], { type: "application/pdf" });
}
function WorkspaceActionBar({ scanId, projectName, appliedCount, totalFindings, onRescan }) {
	const [rescanning, setRescanning] = (0, import_react.useState)(false);
	const [downloading, setDownloading] = (0, import_react.useState)(false);
	const [fpMarked, setFpMarked] = (0, import_react.useState)(false);
	const handleRescan = async () => {
		setRescanning(true);
		toast.loading("Re-running scan…", { id: "rescan" });
		await new Promise((r) => setTimeout(r, 1400));
		setRescanning(false);
		toast.success("Scan refreshed", {
			id: "rescan",
			description: "No new findings detected."
		});
		onRescan?.();
	};
	const handleFalsePositive = () => {
		setFpMarked(true);
		toast.success("Marked as false positive", { description: "Finding excluded from future scans." });
		setTimeout(() => setFpMarked(false), 2e3);
	};
	const handleDownload = async () => {
		setDownloading(true);
		await new Promise((r) => setTimeout(r, 400));
		try {
			const blob = createRemediationReportPdf({
				projectName,
				scanId,
				totalFindings,
				appliedCount,
				generatedAt: (/* @__PURE__ */ new Date()).toISOString()
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `remediation-${scanId.slice(0, 8)}.pdf`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success("Remediation PDF downloaded");
		} catch (err) {
			console.error("Failed to generate remediation PDF:", err);
			toast.error("Could not generate the PDF report.");
		} finally {
			setDownloading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 animate-fade-in",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/70 bg-background/85 px-2 py-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hidden items-center gap-2 border-r border-border/60 pr-3 pl-2 sm:flex",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative flex h-2 w-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex h-2 w-2 rounded-full bg-primary" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11px] font-medium uppercase tracking-widest text-muted-foreground",
						children: "Workspace"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					variant: "ghost",
					onClick: handleRescan,
					disabled: rescanning,
					className: "gap-1.5 rounded-full",
					children: [rescanning ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden sm:inline",
						children: "Re-run Scan"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					variant: "ghost",
					onClick: handleFalsePositive,
					className: cn("gap-1.5 rounded-full", fpMarked && "text-low"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldOff, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden sm:inline",
						children: fpMarked ? "Marked" : "False Positive"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					onClick: handleDownload,
					disabled: downloading,
					className: "gap-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90",
					children: [downloading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden sm:inline",
						children: downloading ? "Preparing…" : "Remediation PDF"
					})]
				})
			]
		})
	});
}
function ScanReport() {
	const { scanId } = Route$2.useLoaderData();
	const [activeId, setActiveId] = (0, import_react.useState)(null);
	const [applied, setApplied] = (0, import_react.useState)({});
	const [patchedLines, setPatchedLines] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [flashLines, setFlashLines] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [liveCode, setLiveCode] = (0, import_react.useState)(null);
	const cardRefs = (0, import_react.useRef)({});
	const { data, isLoading, isError, refetch } = useScanReportQuery(scanId);
	const highlights = (0, import_react.useMemo)(() => {
		if (!data) return [];
		return data.vulns.filter((v) => v.line_start && v.line_end).map((v) => ({
			start: v.line_start,
			end: v.line_end,
			severity: v.severity,
			vulnId: v.id
		}));
	}, [data]);
	if (isLoading || !data) {
		if (isError && !data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
			title: "Audit workspace",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-[60vh] flex-col items-center justify-center gap-3 p-10 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: "Couldn't load this scan report."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "The scan may have been removed, or your session expired."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "sm",
						onClick: () => refetch(),
						children: "Try again"
					})
				]
			})
		}) });
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
			title: "Audit workspace",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-10 text-sm text-muted-foreground",
				children: "Loading report…"
			})
		}) });
	}
	const { scan, vulns } = data;
	const displayedCode = liveCode ?? scan.source_code ?? "";
	const handleLineClick = (vulnId) => {
		setActiveId(vulnId);
		requestAnimationFrame(() => {
			cardRefs.current[vulnId]?.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
		});
	};
	const handleToggle = (vulnId) => {
		setActiveId((cur) => cur === vulnId ? null : vulnId);
	};
	const handleApply = (v) => {
		if (!v.line_start || !v.line_end) {
			toast.error("No line range for this finding");
			return;
		}
		const lines = /* @__PURE__ */ new Set();
		for (let i = v.line_start; i <= v.line_end; i++) lines.add(i);
		setPatchedLines((prev) => /* @__PURE__ */ new Set([...prev, ...lines]));
		setFlashLines(lines);
		setApplied((prev) => ({
			...prev,
			[v.id]: true
		}));
		toast.success("Patch applied", { description: `Lines ${v.line_start}-${v.line_end} secured` });
		setTimeout(() => setFlashLines(/* @__PURE__ */ new Set()), 1500);
	};
	const appliedCount = Object.values(applied).filter(Boolean).length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: scan.project_name,
		subtitle: `${scan.file_type} · ${new Date(scan.created_at).toLocaleString()} · ${vulns.length} findings`,
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			variant: "ghost",
			size: "sm",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/dashboard",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "mr-1 h-3.5 w-3.5" }), "Dashboard"]
			})
		}),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)_minmax(380px,440px)] lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					className: "min-w-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeVault, {
						code: displayedCode || "// (no source available)",
						highlights,
						activeVulnId: activeId,
						patchedLines: /* @__PURE__ */ new Set([...patchedLines, ...flashLines]),
						onLineClick: handleLineClick
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					className: "min-w-0 h-[calc(100vh-3.5rem)]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopilotChat, {
						sourceCode: displayedCode,
						fileType: scan.file_type,
						onApplyCode: (code) => {
							setLiveCode(code);
							setPatchedLines(/* @__PURE__ */ new Set());
							setFlashLines(/* @__PURE__ */ new Set());
						}
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "flex min-h-0 flex-col gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "border-primary/30 bg-gradient-to-br from-card to-card/50 p-4 glow-primary",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] uppercase tracking-widest text-muted-foreground",
										children: "Integrity Score"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-1 flex items-baseline gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-3xl font-bold tabular-nums text-primary",
											children: scan.health_score
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-muted-foreground",
											children: "/ 100"
										})]
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-8 w-8 text-primary" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-3 grid grid-cols-4 gap-1.5 text-center",
									children: SEVERITIES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-md border border-border/60 bg-muted/20 py-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-sm font-bold tabular-nums",
											children: scan.vulnerabilities_count?.[s] ?? 0
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[9px] uppercase tracking-widest text-muted-foreground",
											children: s
										})]
									}, s))
								}),
								appliedCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 flex items-center gap-2 rounded-md border border-low/40 bg-low/10 px-2.5 py-1.5 text-[11px] text-low animate-fade-in",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3.5 w-3.5" }),
										appliedCount,
										" patch",
										appliedCount === 1 ? "" : "es",
										" applied"
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between px-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								className: "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground",
								children: [
									"Findings (",
									vulns.length,
									")"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-muted-foreground",
								children: "click a line to inspect"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex-1 space-y-3 overflow-auto pb-6 pr-1",
							children: vulns.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
								className: "border-low/40 bg-low/5 p-8 text-center",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "mx-auto h-12 w-12 text-low" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-3 text-sm font-medium",
										children: "All clear"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs text-muted-foreground",
										children: "No vulnerabilities detected."
									})
								]
							}) : vulns.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VulnCard, {
								ref: (el) => {
									cardRefs.current[v.id] = el;
								},
								vuln: v,
								expanded: activeId === v.id,
								applied: !!applied[v.id],
								onToggle: () => handleToggle(v.id),
								onApply: () => handleApply(v)
							}, v.id))
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspaceActionBar, {
			scanId: scan.id,
			projectName: scan.project_name,
			appliedCount,
			totalFindings: vulns.length
		})]
	}) });
}
//#endregion
export { ScanReport as component };
