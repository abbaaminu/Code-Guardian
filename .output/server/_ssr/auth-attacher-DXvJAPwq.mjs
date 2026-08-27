import { n as createMiddleware } from "./server-Brx4YFZf.mjs";
import { t as supabase } from "./client-qAspnl33.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-attacher-DXvJAPwq.js
var attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
	const { data } = await supabase.auth.getSession();
	const token = data.session?.access_token;
	return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
//#endregion
export { attachSupabaseAuth as t };
