# 007: User-Scoped Auth — Separate User Tokens from Installation Tokens

## Problem

The OAuth callback discards the user's access token. All GitHub API calls (including repo listing) use installation tokens, which show every repo the app was granted access to — not scoped to the authenticated user.

This means:

- User A installs the app on an org → User B (same Cloudflare account) sees all those repos
- No per-user visibility scoping in the dashboard
- Same class of bug Cloudflare's own Pages/Workers Builds hit with their old SCM system

## Decision

**Two tokens, two purposes:**

| Token                  | Storage                                  | Lifetime             | Used for                                      |
| ---------------------- | ---------------------------------------- | -------------------- | --------------------------------------------- |
| **User OAuth token**   | `gh_token` httpOnly cookie               | 8hr (GitHub default) | Dashboard: list/search repos the user can see |
| **Installation token** | Generated on-demand from app private key | 1hr                  | Builds, cloning, webhooks, deploy hooks       |

**No refresh token storage.** When the user token expires, redirect to GitHub OAuth flow (same UX as "Connect to GitHub" — fast redirect round-trip, new token each time).

**No "Grant" abstraction.** The user picks a repo using their own token. Once connected as a project, the installation token takes over. No need to track which user connected which repo for MVP.

## Token Flow

### User signs in (install + authorize)

```
GitHub App install page
  → /api/auth/github/callback
    → githubAuth middleware provides:
        c.get("token")          // user access token (8hr)
        c.get("user-github")    // user profile
        query: installation_id  // app installation
    → Set cookies:
        session   = JWT { sub, login, installation_id }  (identity, 30d)
        gh_token  = access_token                          (API access, 8hr)
    → Redirect to /
```

### User searches repos (dashboard)

```
GET /api/repos?org=ericclemmons&q=orange
  → Read gh_token cookie
  → If missing → 401 → frontend redirects to /api/auth/github
  → new Octokit({ auth: gh_token }).rest.search.repos(...)
  → Returns only repos THIS USER can see
```

### Build runs (automation)

```
ProjectAgent.createBuild(owner, repo, ref)
  → AccountAgent.getInstallationByOwner(owner)
  → githubApp.getInstallationOctokit(installation.id)
  → Clone via x-access-token:{installationToken}@github.com/...
  → No user token involved
```

## Implementation

### 1. OAuth callback (`apps/dashboard/src/worker/index.ts`)

- Read `c.get("token")` from Hono githubAuth middleware
- `setCookie(c, "gh_token", token, { httpOnly, secure, sameSite: "Lax", path: "/api/", maxAge: 28800 })`
- JWT `session` cookie unchanged (identity only)

### 2. New route: `GET /api/repos` (`apps/dashboard/src/worker/index.ts`)

- Read `gh_token` cookie → 401 if missing
- `new Octokit({ auth: gh_token })` → `octokit.rest.search.repos(...)`
- Why a Hono route, not an AccountAgent callable: Agent callables run over WebSocket, no cookie access

### 3. Frontend (`apps/dashboard/src/app/routes/_account.$orgName.index.tsx`)

- Replace `accountAgent.stub.searchRepositories(org, repo)` → `fetch("/api/repos?org=${org}&q=${repo}")`
- On 401 → redirect to `/api/auth/github`

### 4. No changes needed

- `AccountAgent.ts` — keep `searchRepositories` (useful for installation-scoped admin queries)
- `ProjectAgent.ts`, `BuildWorkflow.ts`, `githubApp.ts` — already use installation tokens
- Sandbox cloning — already planned as `x-access-token:{installationToken}@github.com/...`

## Why Not...

**Store refresh tokens?** — Adds complexity (storage, refresh endpoint, error handling) for minimal gain. Re-auth via GitHub is fast and gives a fresh token. Same UX pattern Cloudflare uses today.

**Encrypt tokens in JWT?** — Separate `gh_token` cookie avoids this. It's httpOnly + secure, never read client-side, and short-lived (8hr).

**Use a Grant/intersection model?** — Over-engineering for MVP. The user's own token already scopes repo visibility naturally. If user picks repo → it becomes a project → installation takes over. No drift to manage.

**Use a Durable Object for token storage?** — Unnecessary when cookies work. No server-side state to manage or clean up. Token lifecycle is GitHub's problem.
