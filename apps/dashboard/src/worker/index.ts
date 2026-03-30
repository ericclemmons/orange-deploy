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
export { BuildWorkflow } from "./BuildWorkflow";
export { ProjectAgent } from "./ProjectAgent";

const GitHubCallback = type({ code: "string", "installation_id?": "string.numeric.parse" });

const app = new Hono();

app.use("/api/*", csrf());

app.get("/api/github/install", sValidator("query", type({ "org?": "string" })), async (c) => {
  const { org } = c.req.valid("query");

  if (!org) {
    return c.redirect(`https://github.com/apps/orange-cloud-deploy/installations/new`);
  }

  const account = await getAgentByName<Env, AccountAgent>(
    env.AccountAgent,
    env.VITE_CLOUDFLARE_ACCOUNT_ID,
  );

  try {
    const installation = await account.getInstallationByOwner(org);
    return c.redirect(
      `https://github.com/apps/orange-cloud-deploy/installations/new/permissions?target_id=${installation.account.id}`,
    );
  } catch {
    return c.redirect(`https://github.com/apps/orange-cloud-deploy/installations/new`);
  }
});

app.get("/api/auth/github", async (c) => {
  return c.redirect(`https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}`);
});
app.get(
  "/api/auth/github/callback",
  githubAuth({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
  }),
  sValidator("query", GitHubCallback),
  async (c) => {
    const query = c.req.valid("query");

    if (query.installation_id) {
      const account = await getAgentByName<Env, AccountAgent>(
        env.AccountAgent,
        env.VITE_CLOUDFLARE_ACCOUNT_ID,
      );

      await account.saveInstallation(query.installation_id);
    }

    const ghToken = c.get("token");

    if (ghToken) {
      setCookie(c, "gh_token", ghToken.token, {
        httpOnly: true,
        maxAge: ghToken.expires_in,
        secure: true,
      });
    }

    const user = c.get("user-github")!;
    const jwt = await sign({ sub: user.id, login: user.login }, env.JWT_SECRET);

    setCookie(c, "session", jwt, {
      httpOnly: true,
      maxAge: 2592000,
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
