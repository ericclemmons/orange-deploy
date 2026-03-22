import { githubAuth } from "@hono/oauth-providers/github";
import { sValidator } from "@hono/standard-validator";
import { getAgentByName, routeAgentRequest } from "agents";
import { type } from "arktype";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { sign, verify } from "hono/jwt";

import type { AccountAgent } from "./AccountAgent";

export { AccountAgent } from "./AccountAgent";
export { ProjectAgent } from "./ProjectAgent";
export { BuildWorkflow } from "./BuildWorkflow";

const GitHubCallback = type({
  code: "string",
  installation_id: "string.numeric.parse",
  setup_action: "'install' | 'update'",
});

const app = new Hono();

app.use("/api/*", csrf());

app.get("/api/auth/github", (c) =>
  c.redirect(`https://github.com/apps/orange-cloud-deploy/installations/new`),
);

app.get(
  "/api/auth/github/callback",
  githubAuth({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
  }),
  sValidator("query", GitHubCallback),
  async (c) => {
    const { installation_id } = c.req.valid("query");

    const account = await getAgentByName<Env, AccountAgent>(
      env.AccountAgent,
      env.VITE_CLOUDFLARE_ACCOUNT_ID,
    );

    await account.saveInstallation(installation_id);

    const user = c.get("user-github")!;
    const jwt = await sign({ installation_id, sub: user.id, login: user.login }, env.JWT_SECRET);

    setCookie(c, "session", jwt, {
      maxAge: 2592000,
      httpOnly: true,
      secure: true,
    });

    return c.redirect("/");
  },
);

app.get("/api/user", async (c) => {
  const jwt = getCookie(c, "session");

  if (!jwt) {
    throw new HTTPException(401, { message: "Unauthenticated" });
  }

  try {
    const user = await verify(jwt, env.JWT_SECRET, "HS256");

    return c.json(user);
  } catch (cause) {
    // @ts-ignore
    throw new HTTPException(400, { cause, message: cause.message });
  }
});

app.get("/agents/*", async (c) => {
  const agent = await routeAgentRequest(c.req.raw, env);

  if (!agent) {
    throw new HTTPException(404, { message: "Agent not found" });
  }

  return agent;
});

export default app;
