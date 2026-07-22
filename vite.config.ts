import { defineConfig } from "@tanstack/react-start/config";
import viteTsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss(), viteTsconfigPaths()],
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
