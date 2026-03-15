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
- Acts as `orange-deploy[bot]` — clear provenance
- OAuth Apps deprecated for new integrations

One GitHub App provides:

1. **User sign-in** — App's built-in OAuth flow (same `client_id`)
2. **Webhooks** — Push events delivered automatically
3. **Repo access** — Installation tokens (1hr, on-demand) for clone/PR
4. **PR bot** — Commits/PRs as `orange-deploy[bot]`

## Auth Model

- **GitHub sign-in** — OAuth via the GitHub App → signed JWT → HTTP-only cookie
- **GitHub App installation** — user installs app on repos for webhooks + access
- **No D1** — AccountAgent DO SQL stores installation metadata, JWT is stateless
- **Cloudflare Access** (optional) — protect dashboard from public access

### Flows

**Sign-In:**

```
"Sign in with GitHub" → /auth/github → GitHub OAuth (App client_id) → /auth/callback → sign JWT → cookie
```

JWT payload: `{ github_user_id, login, exp }`. Stateless, no DB.

**Connect Repos:**

```
Dashboard "Connect Repos" → github.com/apps/orange-deploy/installations/new
→ user picks repos/orgs → installation webhook → AccountAgent stores metadata
```

**Build:**

```
push webhook → Worker → verify HMAC-SHA256 → lookup AccountAgent by installation_id
→ generate installation token (JWT→exchange via @octokit/app) → BuildWorkflow
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

## SCM Abstraction

```ts
interface SCMProvider {
  authorize(req: Request): Response;
  callback(req: Request): Promise<{ userId: string; login: string }>;
  verifyWebhook(req: Request): Promise<WebhookEvent>;
  getCloneToken(installationId: string): Promise<string>;
  listRepos(userToken: string): Promise<Repo[]>;
  createPR(params: CreatePRParams): Promise<PR>;
}
```

GitHub implements this with `@octokit/app` + `@octokit/rest`. GitLab would use its own client.

## Dependencies

| Package         | Purpose                                            |
| --------------- | -------------------------------------------------- |
| `@octokit/app`  | GitHub App auth (JWT signing, installation tokens) |
| `@octokit/rest` | Typed GitHub API methods                           |

Server-side only. No auth framework.

## Future

- **Sign in with Cloudflare** — when/if OAuth becomes public
- **GitLab provider** — implement `SCMProvider`
- **OIDC for GitHub Actions** — `wrangler deploy` without API token secrets
- **Multi-tenant** — "Deploy to Cloudflare" button for self-hosting
