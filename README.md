# Orange Deploy

> Experiment for BYOB(uilds) for Cloudflare Workers &amp; Pages.

## Why?

[Pages][pages] & [Workers][workers] have a divergent offering & experience in both how they're hosted
and the UX within the Cloudflare Dashboard.

For those that prefer to deploy within their existing CI (e.g. GitHub, GitLab), [Pages Action][pages-action]
has been deprecated since 2024 and [Wrangler Action][wrangler-action] has been needing focus for over a year.

Since I've joined Cloudflare in 2026 as a Principal Systems Engineer and now the Engineering Manager of these
products, I want to ["steel man][steelman] the current system with this project as a [straw man][strawman]
by answering:

> **How simple _could_ this be?**

## Product Surfaces

There are 3 primary places that users interact with Pages & Workers Builds & Deployments:

1. Wrangler (e.g. `wrangler deploy` or `wrangler pages deploy`)
2. GitHub Actions (e.g. CI & CD that calls `wrangler deploy`)
3. Dashboard UI (e.g. Click-Ops)

_I'm intentionally not listing [🧪 Alchemy][alchemy] here because it hasn't reached critical mass (yet) and
largely replaces `wrangler` in the CI/CD surface._

### Wrangler

I'm not looking to change this behavior at all. If anything, this is the foundational piece that,
at least for now, removes complexity from what's needed to build & deploy.

### GitHub Actions

The existing [Pages Action][pages-action] & [Wrangler Action][wrangler-action] is consistent with what
I want to offer here.

**However, I want to opt for _no action_ by default.**

The ideal is that `npm run deploy` just calls `npx wrangler` anyway.

### Dashboard UI

This is where things are most complex. The Pages UI is divergent from the Workers UI.
Different routes. Different components. Different configs. Different feature (e.g. deploy hooks)

My goal here is to create a unified interface that smooths out these details because,
whether you're using Pages or Workers, **you're just deploying your app**.

## Acceptance Criteria

This project will consist of both use-cases & examples to validate end-to-end behavior.
The point isn't to test the _current_ implementation – but to **verify the desired behavior**.

- Scaffolding
  - [x] App
    - [x] Using https://kumo-ui.com/ 💅
    - [x] Strongly typed `import.meta.env` with https://arkenv.js.org/docs/vite-plugin/typing-import-meta-env#as-your-project-grows
    - [x] Have `src` and `worker` for clean types
  - [x] Connect to GitHub
    - [x] SCM needs to be persisted
  - [x] Use TanStack Router for most state persistence
  - [ ] Move API to `apps/api` & env to `packages/env`
        https://developers.cloudflare.com/workers/development-testing/multi-workers/
    - [ ] Use [portless](https://github.com/vercel-labs/portless) for dashboard.localhost & api.localhost
  - [ ] Connect to Cloudflare
        _Should this just be a "Deploy to Cloudflare" button to run on your own infra, instead of multi-tenant?
        That would just require a Cloudflare API token..._
  - [ ] Switch to [better-result](https://github.com/dmmulroy/better-result#handling-errors) to avoid `try/catch`

- Pages
  - [ ] Deploy on push to `main`
  - [ ] Deploy on push to any branch (e.g. `staging`)
  - [ ] Preview URLs

- Workers
  - [ ] Deploy on push to `main`
  - [ ] Deploy on push to any branch (e.g. `pr-123`)
  - [ ] Preview URLs
  - [ ] Deploy button
  - [ ] Cancel Deploy
  - [ ] Queued builds
  - [ ] Custom `Dockerfile`
  - [ ] Fork Bomb

- DX
  - [ ] Knip to remove unused exports/types
  - [ ] `@cloudflare/vite-plugin` should build types on change to wrangler.json
  - [ ] When already connected (`/api/user`), just do a re-auth intead:
        https://github.com/login/oauth/authorize?client_id=Iv23liYnu0jvlO0mxE4n
  - [ ] ❌ Cloudflare doesn't support OAuth clients (i.e. [Sign in with Cloudflare](https://x.com/ericclemmons/status/2032970074638692784))
  - [ ] Auto-detect `vite-plus`:
    - [ ] `vp check`, `vp test`, `vp build`
  - [ ] Auto-fix lint errors
  - [ ] Auto-fix test errors
  - [ ] Auto-fix build errors
  - [ ] Auto-fix deploy errors
  - [ ] Wrangler-less
    - [ ] Infer bindings from code (e.g. `import { d1 } from "cloudflare:env"`)
  - [ ] `click-to-component` using https://www.element-source.com/
        See `vite-plugin-react-click-to-component`

[alchemy]: https://alchemy.run/
[pages]: https://pages.cloudflare.com/
[workers]: https://workers.cloudflare.com/
[wrangler-action]: https://github.com/cloudflare/wrangler-action
[pages-action]: https://github.com/cloudflare/pages-action
[steelman]: https://en.wikipedia.org/wiki/Straw_man#Steelmanning
[strawman]: https://en.wikipedia.org/wiki/Straw_man#Steelmanning
