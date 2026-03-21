import arkenv from "@arkenv/vite-plugin";
import { cloudflare } from "@cloudflare/vite-plugin";
import babel, { defineRolldownBabelPreset } from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type PluginOption } from "vite-plus";

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
    // TanStack Router has to be passed *before* any React plugins
    tanstackRouter({
      autoCodeSplitting: true,
      // TODO: Remove when app is `src/*` and API is a separate app
      routesDirectory: "./src/app/routes",
      target: "react",
    }) as PluginOption,
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
