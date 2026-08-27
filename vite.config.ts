import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// Lovable's TanStack Start config wires up the TanStack Start plugin, the
// React plugin, and the Nitro SSR adapter automatically. We layer on the
// path-alias and Tailwind plugins plus the dev-server settings here.
export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss()],
  vite: {
    server: {
      host: "127.0.0.1",
      port: 5173,
      cors: true,
    },
  },
});
