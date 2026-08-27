import { r as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
import { i as getRequest, n as createMiddleware } from "./server-Brx4YFZf.mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
import processModule from "node:process";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-middleware-ABo1HzMN.js
var auth_middleware_ABo1HzMN_exports = /* @__PURE__ */ __exportAll({
	n: () => requireSupabaseAuth,
	t: () => auth_middleware_exports
});
var auth_middleware_exports = /* @__PURE__ */ __exportAll$1({
	requireSupabaseAuth: () => requireSupabaseAuth,
	verifySupabaseToken: () => verifySupabaseToken
});
function isNewSupabaseApiKey(value) {
	return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}
var supabaseFetchCache = /* @__PURE__ */ new Map();
function getSupabaseFetch(supabaseKey) {
	let wrapped = supabaseFetchCache.get(supabaseKey);
	if (!wrapped) {
		wrapped = (input, init) => {
			const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : void 0);
			if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
			if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) headers.delete("Authorization");
			headers.set("apikey", supabaseKey);
			return fetch(input, {
				...init,
				headers
			});
		};
		supabaseFetchCache.set(supabaseKey, wrapped);
	}
	return wrapped;
}
var verifyClient = null;
function getVerifyClient() {
	const SUPABASE_URL = processModule.env.SUPABASE_URL;
	const SUPABASE_PUBLISHABLE_KEY = processModule.env.SUPABASE_PUBLISHABLE_KEY;
	if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
		const message = `Missing Supabase environment variable(s): ${[...!SUPABASE_URL ? ["SUPABASE_URL"] : [], ...!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []].join(", ")}. Connect Supabase in Lovable Cloud.`;
		console.error(`[Supabase] ${message}`);
		throw new Error(message);
	}
	if (!verifyClient) verifyClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
		global: { fetch: getSupabaseFetch(SUPABASE_PUBLISHABLE_KEY) },
		auth: {
			storage: void 0,
			persistSession: false,
			autoRefreshToken: false
		}
	});
	return verifyClient;
}
/**
* Verifies a Supabase access token and returns the authenticated user.
* Shared by requireSupabaseAuth and by route handlers that authenticate
* request headers directly (e.g. api.scan.instant.ts), so no request ever
* allocates its own Supabase client.
*/
async function verifySupabaseToken(token) {
	const { data, error } = await getVerifyClient().auth.getClaims(token);
	if (error || !data?.claims) throw new Error("Unauthorized: Invalid token");
	if (!data.claims.sub) throw new Error("Unauthorized: No user ID found in token");
	return {
		userId: data.claims.sub,
		claims: data.claims
	};
}
var requireSupabaseAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
	const request = getRequest();
	if (!request?.headers) throw new Error("Unauthorized: No request headers available");
	const authHeader = request.headers.get("authorization");
	if (!authHeader) throw new Error("Unauthorized: No authorization header provided");
	if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized: Only Bearer tokens are supported");
	const token = authHeader.replace("Bearer ", "");
	if (!token) throw new Error("Unauthorized: No token provided");
	if (token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");
	const { userId, claims } = await verifySupabaseToken(token);
	return next({ context: {
		supabase: getVerifyClient(),
		userId,
		claims
	} });
});
//#endregion
export { requireSupabaseAuth as n, auth_middleware_ABo1HzMN_exports as t };
