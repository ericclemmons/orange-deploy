/// <reference types="vite/client" />

// https://arkenv.js.org/docs/vite-plugin/typing-import-meta-env#setup
type ImportMetaEnvAugmented = import("@arkenv/vite-plugin").ImportMetaEnvAugmented<
  typeof import("../env.ts").Env
>;

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv extends ImportMetaEnvAugmented {}
