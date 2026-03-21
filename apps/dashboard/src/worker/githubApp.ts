import { env } from "cloudflare:workers";
import { App } from "octokit";

export const githubApp = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY,
});
