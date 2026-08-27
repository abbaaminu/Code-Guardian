import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// M6: sitemap URLs must be absolute, and the origin must be correct on every
// deployment (production domain, preview deployments, custom domains). Prefer
// an explicitly configured canonical origin (SITE_URL / PUBLIC_SITE_URL), then
// fall back to the incoming request's own origin so it stays dynamic.
function resolveBaseUrl(request: Request): string {
  const configured = process.env.SITE_URL || process.env.PUBLIC_SITE_URL || "";
  if (configured) return configured.replace(/\/+$/, "");
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const baseUrl = resolveBaseUrl(request);
        const entries = [
          { path: "/dashboard", changefreq: "daily", priority: "1.0" },
          { path: "/policies", changefreq: "weekly", priority: "0.7" },
        ];
        const urls = entries.map(
          (e) =>
            `  <url><loc>${baseUrl}${e.path}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`,
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
