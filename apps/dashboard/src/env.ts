/// <reference types="vite/client" />

import { type } from "arkenv";

export const Env = type({
  GITHUB_CLIENT_ID: "string",
  GITHUB_CLIENT_SECRET: "string",
  JWT_SECRET: "string",
  "VITE_CLOUDFLARE_ACCOUNT_ID?": type("string").describe(
    "This is used on both the client & server to partition builds",
  ),
});

export type Env = typeof Env.infer;
