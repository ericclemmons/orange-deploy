/// <reference types="vite/client" />

// https://arkenv.js.org/docs/vite-plugin/typing-import-meta-env#setup
type ImportMetaEnvAugmented = import("@arkenv/vite-plugin").ImportMetaEnvAugmented<
  typeof import("./env").Env
>;

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv extends ImportMetaEnvAugmented {}

// https://alchemy.run/guides/cloudflare-vitejs/#typesenvdts
type Secrets = typeof import("./env").Env;

declare namespace Cloudflare {
  interface GlobalProps {
    mainModule: typeof import("./src/worker");
  }
  interface Env extends Secrets {}
}
interface Env extends Cloudflare.Env {}
