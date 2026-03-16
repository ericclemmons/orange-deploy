import arkenv from "@arkenv/vite-plugin";
import { cloudflare } from "@cloudflare/vite-plugin";
import babel, { defineRolldownBabelPreset } from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

import { Env } from "./src/env";

const decorators = defineRolldownBabelPreset({
  preset: () => ({
    plugins: [["@babel/plugin-proposal-decorators", { version: "2023-11" }]],
  }),
  rolldown: {
    filter: { code: "@" },
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    arkenv(Env),
    babel({ presets: [decorators] } as Parameters<typeof babel>[0]),
    cloudflare(),
    react(),
    tailwindcss(),
  ],

  run: {
    tasks: {
      dev: {
        command: "vp dev",
        dependsOn: ["types"],
      },
      types: {
        command: "wrangler types",
      },
    },
  },
});
