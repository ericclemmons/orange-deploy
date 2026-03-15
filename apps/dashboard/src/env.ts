import { type } from "arkenv";

export const Env = type({
  GITHUB_CLIENT_ID: "string",
  GITHUB_CLIENT_SECRET: "string",
  PORT: "number.port = 5173",
  JWT_SECRET: "string",
});

export type Env = typeof Env.infer;
