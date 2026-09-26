import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  // Inline VITE_* variables into `import.meta.env` for every environment
  // (browser AND SSR). Only VITE_-prefixed vars are exposed; secrets must use
  // plain server-side names and are read via `process.env` in server-only
  // modules.
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(loadedEnv).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  );

  return {
    define: envDefine,
    // Route-level code splitting — explicit and deliberate.
    //
    // TanStack Start's router plugin code-splits every route into its own
    // lazy-loaded chunk (via `lazyRouteComponent` dynamic imports). We split
      // each route's component tree, error boundary, not-found view, and pending
    // fallback so they load on demand instead of shipping in the initial
    // bundle. See the build output: each route emits a small route-definition
    // chunk plus a lazily-imported component chunk.
    plugins: [
      tailwindcss(),
      ...(mode === "development"
        ? [
            devtools({
              logging: false,
              eventBusConfig: { enabled: false },
              enhancedLogs: { enabled: false },
              consolePiping: { enabled: false },
              removeDevtoolsOnBuild: false,
              injectSource: { enabled: true },
            }),
          ]
        : []),
      // Must come BEFORE the React JSX transform plugins: the router's code
      // splitter checks plugin ordering so route files can be rewritten into
      // lazy-loadable modules before React transforms run.
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        router: {
          codeSplittingOptions: {
            defaultBehavior: [
              ["component"],
              ["pendingComponent"],
              ["errorComponent"],
              ["notFoundComponent"],
            ],
          },
        },
      }),
      react(),
      nitro({
        preset: process.env.VERCEL ? "vercel" : "node-server",
      }),
    ],
    // Vite 8+ resolves tsconfig paths natively, so no extra plugin is needed
    // for the `@/*` alias (see tsconfig.json "paths").
    resolve: {
      tsconfigPaths: true,
    },
    css: {
      transformer: "lightningcss",
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      cors: true,
    },
  };
});
