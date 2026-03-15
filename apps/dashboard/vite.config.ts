import arkenv from "@arkenv/vite-plugin";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

import { Env } from "./src/env";

// https://vite.dev/config/
export default defineConfig({
  plugins: [arkenv(Env), cloudflare(), react(), tailwindcss()],
  run: {
    tasks: {
      dev: {
        command: "vp dev",
      },
      types: {
        command: "wrangler types",
      },
    },
  },
});
