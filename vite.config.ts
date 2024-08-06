import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vercelPreset } from "@vercel/remix/vite";

export default defineConfig({
  plugins: [
    remix({
      presets: [vercelPreset()],
    }),
    tsconfigPaths(),
    {
      name: "fix-recast",
      transform(code, id) {
        if (id.includes("recast-detour.js")) {
          return code.replace(`this["Recast"]`, 'window["Recast"]');
        }
      },
    },
  ],
});
