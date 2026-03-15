# 006 — Auth

## Decision

GitHub App (Vercel/Netlify-style) for all SCM integration. No Cloudflare auth for MVP.

## Context

Need GitHub integration for webhooks, cloning, and PRs. Cloudflare OAuth client registration is internal-only (not public). For MVP, runs on your own Cloudflare account — `CLOUDFLARE_API_TOKEN` is a wrangler secret.

## GitHub App vs OAuth App

GitHub App wins:

- Webhooks built-in (not managed via API per repo)
- Installation tokens scoped to granted repos — never over-scoped
- Tokens generated on-demand, last as long as app is installed (years)
- Higher rate limits (5000/hr per installation)
- Acts as `orange-cloud-deploy[bot]` — clear provenance
- OAuth Apps deprecated for new integrations

One GitHub App provides:

1. **Connect to GitHub** — installing the app grants repo access AND identifies the user (single flow)
2. **Webhooks** — Push events delivered automatically
3. **Repo access** — Installation tokens (1hr, on-demand) for clone/PR
4. **PR bot** — Commits/PRs as `orange-cloud-deploy[bot]`

## GitHub App Setup

Register at **github.com/settings/apps/new**:

| Field          | Value                                                  |
| -------------- | ------------------------------------------------------ |
| App name       | `orange-cloud-deploy`                                  |
| Homepage URL   | Dashboard or repo URL                                  |
| Callback URL   | `http://localhost:5173/api/auth/github/callback` (dev) |
| Webhook URL    | Leave blank until Worker is deployed                   |
| Webhook secret | `openssl rand -hex 32` (save for later)                |

**Permissions (Repository):**

- Contents: `Read-only`
- Metadata: `Read-only`
- Pull requests: `Read & write`

**Webhook events** (enable later when webhook URL is set):

- `push`, `pull_request`, `installation`

**Settings:**

- Expire user authorization tokens: **Yes** (8hr access + 6mo refresh, more secure)
- Request user authorization during installation: **Yes** (combines sign-in + app install into one flow)
- Enable Device Flow: **No** (not needed, OIDC is a separate mechanism)

**Post-creation:**

1. **App ID:** `3094556`
2. **Client ID:** `Iv23liYnu0jvlO0mxE4n`
3. Generate a **Client Secret**
4. Generate a **Private Key** (downloads `.pem` file)

## Auth Model

- **No separate sign-in** — installing the GitHub App IS the auth flow (user authorization requested during installation)
- **Returning users** — redirect to GitHub OAuth, auto-approved since app is already authorized, instant redirect back
- **No D1** — AccountAgent DO SQL stores installation metadata, JWT is stateless
- **Cloudflare Access** (optional) — protect dashboard from public access

## Server Stack

Hono + `@hono/oauth-providers` + `@octokit/app` + `nodejs_compat` enabled.

### Routes

```
GET  /api/auth/github              → new user: install page / returning: OAuth authorize (instant)
GET  /api/auth/github/callback     → githubAuth middleware exchanges code + fetches user
                                     then: sign JWT, set cookie, redirect to /
GET  /api/auth/logout              → clear cookie, redirect to /

GET  /api/user                     → current user from JWT
GET  /api/installations            → user's app installations (orgs/accounts)
GET  /api/installations/:id/repos  → repos for a specific installation

POST /api/webhook/github           → verify HMAC, dispatch to AccountAgent (later)
```

### Example Wiring

```ts
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { csrf } from "hono/csrf";
import { githubAuth } from "@hono/oauth-providers/github";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

type Env = {
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", csrf());

// ============================================================
// Auth
// ============================================================

app.get("/api/auth/github", (c) => {
  const hasInstalled = getCookie(c, "gh_installed");
  if (hasInstalled) {
    // Returning user — OAuth authorize (auto-approved, instant redirect back)
    return c.redirect(
      `https://github.com/login/oauth/authorize?client_id=${c.env.GITHUB_CLIENT_ID}`,
    );
  }
  // New user — install page (installs app + authorizes in one flow)
  return c.redirect(`https://github.com/apps/orange-cloud-deploy/installations/new`);
});

// githubAuth middleware: exchanges code for token, fetches user info + email
app.use(
  "/api/auth/github/callback",
  githubAuth({
    client_id: env.GITHUB_CLIENT_ID,
    client_secret: env.GITHUB_CLIENT_SECRET,
  }),
);

app.get("/api/auth/github/callback", async (c) => {
  const user = c.get("user-github");
  const token = c.get("token");

  // Sign JWT — contains user identity, NOT the GitHub token
  const jwt = await signJWT(
    { sub: user.id, login: user.login, avatar_url: user.avatar_url },
    c.env.JWT_SECRET,
  );

  // Session cookie (30 days)
  setCookie(c, "session", jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // Mark as installed so future auth skips the install page
  setCookie(c, "gh_installed", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Store the GitHub user token for API calls (list installations, repos)
  // This is the user-to-server token, NOT an installation token
  setCookie(c, "gh_token", token.token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/api/",
    maxAge: token.expires_in || 60 * 60 * 8,
  });

  return c.redirect("/");
});

app.get("/api/auth/logout", (c) => {
  deleteCookie(c, "session");
  deleteCookie(c, "gh_installed");
  deleteCookie(c, "gh_token");
  return c.redirect("/");
});

// ============================================================
// Auth Middleware — protects /api/* except /api/auth/ and /api/webhook/
// ============================================================

app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth/") || c.req.path.startsWith("/api/webhook/")) {
    return next();
  }
  const jwt = getCookie(c, "session");
  const user = jwt ? await verifyJWT(jwt, c.env.JWT_SECRET) : null;
  if (!user) return c.json({ error: "unauthorized" }, 401);
  c.set("user", user);
  return next();
});

// ============================================================
// API — User
// ============================================================

app.get("/api/user", (c) => {
  return c.json(c.get("user"));
});

// ============================================================
// API — Installations & Repos
// Uses the user's GitHub token (user-to-server) to list what THEY can access
// ============================================================

app.get("/api/installations", async (c) => {
  const ghToken = getCookie(c, "gh_token");
  if (!ghToken) return c.json({ error: "github token expired, re-auth" }, 401);

  const octokit = new Octokit({ auth: ghToken });

  // Returns installations the current user can access
  // Each installation = an org or personal account where the app is installed
  const { data } = await octokit.apps.listInstallationsForAuthenticatedUser();

  return c.json(
    data.installations.map((i) => ({
      id: i.id,
      account: i.account?.login,
      avatar_url: i.account?.avatar_url,
      target_type: i.target_type, // "Organization" | "User"
      repository_selection: i.repository_selection, // "all" | "selected"
    })),
  );
});

app.get("/api/installations/:id/repos", async (c) => {
  const ghToken = getCookie(c, "gh_token");
  if (!ghToken) return c.json({ error: "github token expired, re-auth" }, 401);

  const installationId = Number(c.req.param("id"));
  const octokit = new Octokit({ auth: ghToken });

  // Returns repos the user can access within this installation
  const { data } = await octokit.apps.listInstallationReposForAuthenticatedUser({
    installation_id: installationId,
  });

  return c.json(
    data.repositories.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      private: r.private,
      default_branch: r.default_branch,
      html_url: r.html_url,
    })),
  );
});

// ============================================================
// API — Installation Token (for builds)
// Uses the App's private key, NOT the user's token
// ============================================================

// Helper: create an Octokit instance authenticated as the GitHub App installation
function getInstallationOctokit(env: Env, installationId: number) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
      installationId,
    },
  });
}

// Example: clone a repo during a build
// const octokit = getInstallationOctokit(env, installationId);
// const { token } = await octokit.auth({ type: "installation" });
// // Use token for: git clone https://x-access-token:{token}@github.com/owner/repo.git

// Example: open a PR after a build
// const octokit = getInstallationOctokit(env, installationId);
// await octokit.pulls.create({
//   owner: "ericclemmons",
//   repo: "my-app",
//   title: "Deploy preview ready",
//   head: "deploy-preview-123",
//   base: "main",
//   body: "Build #123 deployed successfully.",
// });

// ============================================================
// Webhooks (later)
// ============================================================

app.post("/api/webhook/github", async (c) => {
  // Verify HMAC-SHA256 signature using GITHUB_WEBHOOK_SECRET
  // const signature = c.req.header("x-hub-signature-256");
  // const body = await c.req.text();
  // const expected = await hmacSHA256(body, env.GITHUB_WEBHOOK_SECRET);
  // if (signature !== `sha256=${expected}`) return c.text("invalid", 401);
  //
  // const event = c.req.header("x-github-event");
  // const payload = JSON.parse(body);
  //
  // if (event === "push") {
  //   // Dispatch to AccountAgent by installation ID
  //   const installationId = payload.installation.id;
  //   // env.AccountAgent.get(env.AccountAgent.idFromName(installationId)).fetch(...)
  // }
  //
  // return c.text("ok");
});

export default app;
```

### Flows

**New User — "Connect to GitHub":**

```
Dashboard → /api/auth/github → github.com/apps/orange-cloud-deploy/installations/new
→ user picks repos/orgs → GitHub redirects to /api/auth/github/callback?code=xxx&setup_action=install
→ githubAuth middleware exchanges code + fetches user
→ sign JWT, set session + gh_installed + gh_token cookies → redirect /
```

User is now authenticated AND repos are connected. Single flow.

**Returning User — session expired:**

```
Dashboard → /api/auth/github → github.com/login/oauth/authorize (auto-approved, instant)
→ /api/auth/github/callback?code=xxx → same flow → JWT → cookies → redirect /
```

**Frontend check:**

```ts
// On app load, check auth status
const res = await fetch("/api/user");
if (res.ok) {
  // Authenticated — show dashboard, user avatar
  const user = await res.json(); // { sub, login, avatar_url }
} else {
  // Not authenticated — show "Connect to GitHub" button
  // Button links to /api/auth/github
}
```

**Two token types in play:**

| Token                                    | Source                            | Used for                                      |
| ---------------------------------------- | --------------------------------- | --------------------------------------------- |
| User-to-server token (`gh_token` cookie) | OAuth code exchange               | Dashboard API: list installations, list repos |
| Installation token (generated on-demand) | App private key + `createAppAuth` | Build operations: clone, open PRs             |

The user token represents "what can THIS USER see?" The installation token represents "what can THE APP do?"

**Build:**

```
push webhook → POST /api/webhook/github → verify HMAC-SHA256
→ lookup AccountAgent by installation_id
→ generate installation token via @octokit/app → BuildWorkflow
```

## Token Lifecycle

| Token                  | Lifetime  | Storage                      |
| ---------------------- | --------- | ---------------------------- |
| App private key        | Permanent | `wrangler secret`            |
| Webhook/client secrets | Permanent | `wrangler secret`            |
| JWT signing key        | Permanent | `wrangler secret`            |
| Installation token     | 1hr       | Not stored — on-demand       |
| User session JWT       | 30 days   | HTTP-only cookie (stateless) |
| `CLOUDFLARE_API_TOKEN` | Permanent | `wrangler secret`            |

## GitHub App Permissions

- `contents:read` — clone repos
- `pull_requests:write` — open PRs
- `metadata:read` — list repos
- Events: `push`, `pull_request`, `installation`

## Dependencies

| Package                 | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `hono`                  | Router, CSRF middleware, Web API native, Workers-first         |
| `@hono/oauth-providers` | GitHub OAuth flow (code exchange, user info) — no hand-rolling |
| `@octokit/app`          | Installation tokens for builds (JWT signing)                   |
| `@octokit/rest`         | Typed GitHub API methods                                       |

Server-side only. `nodejs_compat` enabled for octokit Node crypto usage.

## Future

- **Sign in with Cloudflare** — when/if OAuth becomes public
- **GitLab provider** — implement `SCMProvider` interface
- **OIDC for GitHub Actions** — `wrangler deploy` without API token secrets
- **Multi-tenant** — "Deploy to Cloudflare" button for self-hosting
