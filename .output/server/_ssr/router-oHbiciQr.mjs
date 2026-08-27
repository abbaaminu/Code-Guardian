import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, j as redirect, m as createFileRoute, p as lazyRouteComponent, s as Scripts, v as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { n as objectType, r as stringType } from "../_libs/zod.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { r as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as runLocalSAST } from "./sast-engine-0uKn5z99.mjs";
import processModule from "node:process";
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/router-oHbiciQr.js
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-1s-YKqpk.css";
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-primary",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold",
					children: "Signal lost"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for isn't on this network."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/dashboard",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90",
						children: "Back to dashboard"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold",
					children: "Scanner error"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong. Try again or head to the dashboard."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90",
						children: "Retry"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/dashboard",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent",
						children: "Dashboard"
					})]
				})
			]
		})
	});
}
var Route$8 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "SecurePulse — Cyber Security & Code Integrity Auditor" },
			{
				name: "description",
				content: "Instantly scan code snippets, source files, and repos for OWASP Top 10, CWE, and secret exposure vulnerabilities with AI-generated patches."
			},
			{
				name: "author",
				content: "SecurePulse"
			},
			{
				property: "og:title",
				content: "SecurePulse — Code Integrity Auditor"
			},
			{
				property: "og:description",
				content: "AI-powered security scanner for engineers and DevOps teams."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/securepulse-icon.svg",
				type: "image/svg+xml"
			},
			{
				rel: "apple-touch-icon",
				href: "/securepulse-icon.svg"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "dark",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$8.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {})]
	});
}
function resolveBaseUrl(request) {
	const configured = processModule.env.SITE_URL || processModule.env.PUBLIC_SITE_URL || "";
	if (configured) return configured.replace(/\/+$/, "");
	try {
		return new URL(request.url).origin;
	} catch {
		return "";
	}
}
var Route$7 = createFileRoute("/sitemap.xml")({ server: { handlers: { GET: async ({ request }) => {
	const baseUrl = resolveBaseUrl(request);
	const xml = [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
		...[{
			path: "/dashboard",
			changefreq: "daily",
			priority: "1.0"
		}, {
			path: "/policies",
			changefreq: "weekly",
			priority: "0.7"
		}].map((e) => `  <url><loc>${baseUrl}${e.path}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`),
		`</urlset>`
	].join("\n");
	return new Response(xml, { headers: {
		"Content-Type": "application/xml",
		"Cache-Control": "public, max-age=3600"
	} });
} } } });
var $$splitComponentImporter$3 = () => import("./policies-DsEvKW2s.mjs");
var Route$6 = createFileRoute("/policies")({
	head: () => ({ meta: [{ title: "Security Policies · SecurePulse" }, {
		name: "description",
		content: "Toggle OWASP Top 10, smart-contract safeguards, secret scanning, and regulatory compliance policies applied to every SecurePulse audit."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./login-CgdzKOg3.mjs");
var Route$5 = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Sign in · SecurePulse" }] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./dashboard-DnMmHT67.mjs");
var Route$4 = createFileRoute("/dashboard")({
	head: () => ({ meta: [{ title: "Scan Dashboard · SecurePulse" }, {
		name: "description",
		content: "Run and review AI-powered security scans across your projects."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var Route$3 = createFileRoute("/")({ beforeLoad: () => {
	throw redirect({ to: "/dashboard" });
} });
var $$splitNotFoundComponentImporter = () => import("./scans._id-xi5THuzW.mjs");
var $$splitErrorComponentImporter = () => import("./scans._id-CS8Jwjy0.mjs");
var $$splitComponentImporter = () => import("./scans._id-CR8K8NB_.mjs");
var Route$2 = createFileRoute("/scans/$id")({
	head: ({ params }) => ({ meta: [{ title: `Audit ${params.id.slice(0, 8)} · SecurePulse` }, {
		name: "description",
		content: "Interactive code audit workspace with AI-suggested patches and side-by-side diffs."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter, "component"),
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
	notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter, "notFoundComponent")
});
function verifySignature(rawBody, signatureHeader, secret) {
	if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
	const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
	const a = Buffer.from(expected);
	const b = Buffer.from(signatureHeader);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
var Route$1 = createFileRoute("/api/webhooks/github")({ server: { handlers: { POST: async ({ request }) => {
	const secret = processModule.env.GITHUB_WEBHOOK_SECRET;
	if (!secret) {
		console.error("[github webhook] GITHUB_WEBHOOK_SECRET is not configured; rejecting all deliveries.");
		return new Response("Webhook not configured", { status: 503 });
	}
	const rawBody = await request.text();
	if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"), secret)) return new Response("Invalid signature", { status: 401 });
	const event = request.headers.get("x-github-event");
	if (event === "pull_request") {
		let payload;
		try {
			payload = JSON.parse(rawBody);
		} catch {
			return new Response("Invalid JSON payload", { status: 400 });
		}
		if ([
			"opened",
			"synchronize",
			"reopened"
		].includes(payload.action)) {
			const installationId = payload.installation?.id;
			if (!installationId) return new Response("Missing installation id", { status: 400 });
			console.log(`[github webhook] PR #${payload.number} on ${payload.repository.full_name} queued for scan (installation ${installationId}) — queue not yet wired, see TODO.`);
		}
	} else if (event === "installation") console.log("[github webhook] installation event received");
	return new Response("ok", { status: 202 });
} } } });
var InstantScanInput = objectType({
	file_type: stringType().min(1).max(40),
	source_code: stringType().min(1).max(2e5)
});
async function requireBearerUser(request) {
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) throw new Response("Unauthorized: missing bearer token", { status: 401 });
	const token = authHeader.slice(7);
	if (token.split(".").length !== 3) throw new Response("Unauthorized: invalid token", { status: 401 });
	const { verifySupabaseToken } = await import("./auth-middleware-NAMw60wL.mjs").then((n) => n.t).then((n) => n.t);
	try {
		const { userId } = await verifySupabaseToken(token);
		return userId;
	} catch {
		throw new Response("Unauthorized: invalid token", { status: 401 });
	}
}
var Route = createFileRoute("/api/scan/instant")({ server: { handlers: { POST: async ({ request }) => {
	try {
		await requireBearerUser(request);
	} catch (res) {
		if (res instanceof Response) return res;
		throw res;
	}
	let parsed;
	try {
		parsed = InstantScanInput.parse(await request.json());
	} catch {
		return new Response(JSON.stringify({ error: "Invalid request body" }), {
			status: 400,
			headers: { "content-type": "application/json" }
		});
	}
	const findings = runLocalSAST(parsed.source_code, parsed.file_type);
	return new Response(JSON.stringify({
		findings,
		engine: findings.some((f) => f.engine === "ast") ? "ast" : "heuristic"
	}), { headers: { "content-type": "application/json" } });
} } } });
var SitemapDotxmlRoute = Route$7.update({
	id: "/sitemap.xml",
	path: "/sitemap.xml",
	getParentRoute: () => Route$8
});
var PoliciesRoute = Route$6.update({
	id: "/policies",
	path: "/policies",
	getParentRoute: () => Route$8
});
var LoginRoute = Route$5.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$8
});
var DashboardRoute = Route$4.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => Route$8
});
var IndexRoute = Route$3.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$8
});
var ScansIdRoute = Route$2.update({
	id: "/scans/$id",
	path: "/scans/$id",
	getParentRoute: () => Route$8
});
var ApiWebhooksGithubRoute = Route$1.update({
	id: "/api/webhooks/github",
	path: "/api/webhooks/github",
	getParentRoute: () => Route$8
});
var rootRouteChildren = {
	IndexRoute,
	DashboardRoute,
	LoginRoute,
	PoliciesRoute,
	SitemapDotxmlRoute,
	ScansIdRoute,
	ApiScanInstantRoute: Route.update({
		id: "/api/scan/instant",
		path: "/api/scan/instant",
		getParentRoute: () => Route$8
	}),
	ApiWebhooksGithubRoute
};
var routeTree = Route$8._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { Route$2 as n, router_exports as t };
