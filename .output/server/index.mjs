globalThis.__nitro_main__ = import.meta.url;
import { r as FastResponse } from "./_libs/h3-v2+rou3+srvx+unenv.mjs";
import { i as HTTPError, n as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/llms.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"196-1TAYSAJSZ20ueDZ3CBPYupbtEoA\"",
		"mtime": "2026-08-24T13:14:16.161Z",
		"size": 406,
		"path": "../public/llms.txt"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"2c-5k2Jq7jGTon3y1VAOwRFK5vXuvE\"",
		"mtime": "2026-08-24T13:14:16.162Z",
		"size": 44,
		"path": "../public/robots.txt"
	},
	"/assets/arrow-left-roj0RrXS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"268e-KGf4oKC0+ziXmPAstjx1pMnxWF4\"",
		"mtime": "2026-08-27T18:09:27.927Z",
		"size": 9870,
		"path": "../public/assets/arrow-left-roj0RrXS.js"
	},
	"/assets/card-DpYxPBB5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"838c-Ani1zjLsGQwY09o6QOMxnhmNOww\"",
		"mtime": "2026-08-27T18:09:27.927Z",
		"size": 33676,
		"path": "../public/assets/card-DpYxPBB5.js"
	},
	"/securepulse-icon.svg": {
		"type": "image/svg+xml",
		"etag": "\"4eb-B+CTYcLbHc/gK/cQmDobtsKebY4\"",
		"mtime": "2026-08-24T13:14:16.163Z",
		"size": 1259,
		"path": "../public/securepulse-icon.svg"
	},
	"/securepulse-logo.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"88c-WTBdnuUhz4nhr2QlpnyjyUOk7eA\"",
		"mtime": "2026-08-24T13:14:16.164Z",
		"size": 2188,
		"path": "../public/securepulse-logo.ico"
	},
	"/assets/dashboard-BwJtwxie.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4c-CqfJ85uu8QaarnK2d+E1rIx+jtA\"",
		"mtime": "2026-08-27T18:09:27.963Z",
		"size": 76,
		"path": "../public/assets/dashboard-BwJtwxie.js"
	},
	"/assets/dist-Bnsh5DIg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3c5df-Y6MVBIJISuoBgg/q8nYFK0brAQQ\"",
		"mtime": "2026-08-27T18:09:27.963Z",
		"size": 247263,
		"path": "../public/assets/dist-Bnsh5DIg.js"
	},
	"/assets/dashboard-nK1rEgoA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"75440-2+iOkgY2l1ihPMSncIglsNHvbSw\"",
		"mtime": "2026-08-27T18:09:27.963Z",
		"size": 480320,
		"path": "../public/assets/dashboard-nK1rEgoA.js"
	},
	"/assets/link-BwdC1w4p.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"53f6-fJbS2N2MFDQWSChay+dpw2704zs\"",
		"mtime": "2026-08-27T18:09:27.963Z",
		"size": 21494,
		"path": "../public/assets/link-BwdC1w4p.js"
	},
	"/assets/index-_OeuixYm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b5ba-Oq/c5xSbHXmoioHDcqwDyyq157M\"",
		"mtime": "2026-08-27T18:09:27.927Z",
		"size": 374202,
		"path": "../public/assets/index-_OeuixYm.js"
	},
	"/assets/loader-circle-BLIeONTi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8a-tix7NTLIiMkdiMwT4pMfsG3S7fE\"",
		"mtime": "2026-08-27T18:09:27.963Z",
		"size": 138,
		"path": "../public/assets/loader-circle-BLIeONTi.js"
	},
	"/assets/login-BwJtwxie.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4c-CqfJ85uu8QaarnK2d+E1rIx+jtA\"",
		"mtime": "2026-08-27T18:09:27.971Z",
		"size": 76,
		"path": "../public/assets/login-BwJtwxie.js"
	},
	"/assets/login-M87U1hpI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"137b-AE9TIxAEI26Jj8AT53El5S9dnOw\"",
		"mtime": "2026-08-27T18:09:27.971Z",
		"size": 4987,
		"path": "../public/assets/login-M87U1hpI.js"
	},
	"/assets/policies-BwJtwxie.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4c-CqfJ85uu8QaarnK2d+E1rIx+jtA\"",
		"mtime": "2026-08-27T18:09:27.971Z",
		"size": 76,
		"path": "../public/assets/policies-BwJtwxie.js"
	},
	"/assets/policies-DHfpdb2p.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3785-ftOuxBwHCbn+JQlL/Nv8zIcG4a8\"",
		"mtime": "2026-08-27T18:09:27.971Z",
		"size": 14213,
		"path": "../public/assets/policies-DHfpdb2p.js"
	},
	"/assets/routes-BwJtwxie.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4c-CqfJ85uu8QaarnK2d+E1rIx+jtA\"",
		"mtime": "2026-08-27T18:09:27.979Z",
		"size": 76,
		"path": "../public/assets/routes-BwJtwxie.js"
	},
	"/assets/scans._id-BA9Ktbb8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32f-mUoas6EvbntvqCpOiJaag6VOg1s\"",
		"mtime": "2026-08-27T18:09:27.979Z",
		"size": 815,
		"path": "../public/assets/scans._id-BA9Ktbb8.js"
	},
	"/assets/scans._id-BwJtwxie.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4c-CqfJ85uu8QaarnK2d+E1rIx+jtA\"",
		"mtime": "2026-08-27T18:09:27.979Z",
		"size": 76,
		"path": "../public/assets/scans._id-BwJtwxie.js"
	},
	"/assets/scans._id-DQ_EaQvA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a8bc-KuXsAJehEm33YjHH5aYWQoa/HQ8\"",
		"mtime": "2026-08-27T18:09:27.979Z",
		"size": 43196,
		"path": "../public/assets/scans._id-DQ_EaQvA.js"
	},
	"/assets/severity-badge-DvqtCTXp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30a1-hOfb7kzFdMk3N6BxGb0qJNenTgs\"",
		"mtime": "2026-08-27T18:09:27.979Z",
		"size": 12449,
		"path": "../public/assets/severity-badge-DvqtCTXp.js"
	},
	"/assets/shield-alert-B5g4nGXT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d4-Z7X+hxNXOsZQYzs/4nVozeZrc+c\"",
		"mtime": "2026-08-27T18:09:27.979Z",
		"size": 468,
		"path": "../public/assets/shield-alert-B5g4nGXT.js"
	},
	"/assets/use-scan-queries-DfHp9tFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1884c-4kV1d1Nokx+NIP7FcuyRC1c8hhY\"",
		"mtime": "2026-08-27T18:09:27.989Z",
		"size": 100428,
		"path": "../public/assets/use-scan-queries-DfHp9tFH.js"
	},
	"/assets/styles-PNwMBeHP.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"191e6-3i5qG9vMF5Haj1hMxLOuQRT1U30\"",
		"mtime": "2026-08-27T18:09:27.989Z",
		"size": 102886,
		"path": "../public/assets/styles-PNwMBeHP.css"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_vDbb1Z = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_vDbb1Z
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
