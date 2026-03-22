# 005 — Architecture

## System Overview

```
GitHub Push → Worker → AccountAgent → BuildWorkflow → Sandbox
                                           ↕
                                      BuildAgent → Browser (WebSocket)
```

Five components. Each leans on a Cloudflare primitive so we write minimal custom code.

---

## Components

### Worker — Entry Point

Standard `fetch` handler. Validates GitHub webhook signatures, routes push events to the right AccountAgent via `getAgentByName(env.AccountAgent, accountId)`. Also calls `routeAgentRequest()` to proxy dashboard WebSocket connections to BuildAgents.

- [routeAgentRequest](https://developers.cloudflare.com/agents/api-reference/#routeagentrequest)
- [getAgentByName](https://developers.cloudflare.com/agents/api-reference/#getagentbyname)

### AccountAgent — Per-Account Concurrency

One [Agent](https://developers.cloudflare.com/agents/) instance per Cloudflare account. Tracks `pendingBuilds[]` and `activeBuilds[]` in state. Free = 1 concurrent build, paid = 6.

On webhook: creates a BuildWorkflow instance immediately and adds its ID to `pendingBuilds`. If under the concurrency limit, sends a `"start-build"` event to the workflow right away. Otherwise the workflow hibernates until a slot opens.

On build finished: removes from `activeBuilds`, pops oldest from `pendingBuilds`, sends event via `instance.sendEvent({ type: "start-build" })`.

**Why not `queue()`?** Agent queues process tasks sequentially (1 at a time). Paid accounts need 6 concurrent builds. `waitForEvent` lets the Workflow itself be the queue entry — no separate data structure, durable across DO restarts, and the browser can connect immediately to see "queued" status.

- [Agent state](https://developers.cloudflare.com/agents/concepts/#state)
- [Workflow sendEvent](https://developers.cloudflare.com/workflows/build/events-and-parameters/#send-events-to-a-running-workflow)

### BuildAgent — WebSocket Hub + Log Storage

One [Agent](https://developers.cloudflare.com/agents/) instance per build. Two jobs:

1. **Stream logs** — receives `onWorkflowProgress()` callbacks, calls `broadcast()` to all connected browser clients
2. **Store logs** — writes each log line to embedded SQLite via `this.sql` for durability and post-mortem debugging

The browser connects via `useAgent({ agent: "BuildAgent", name: buildId })` and receives real-time logs + state updates. Historical logs available via `onRequest` for late-joining clients.

On workflow error: calls `getSandbox(this.env.Sandbox, buildId).destroy()` to kill the container (the cleanup step doesn't run on error — this handles fork bombs).

- [Agent broadcast](https://developers.cloudflare.com/agents/api-reference/#broadcast)
- [Agent SQL](https://developers.cloudflare.com/agents/concepts/#sql)
- [useAgent React hook](https://developers.cloudflare.com/agents/api-reference/client/#useagent-react-hook)
- [connections-agent example](https://github.com/cloudflare/agents/blob/main/examples/playground/src/demos/core/connections-agent.ts)

### BuildWorkflow — Durable Build Pipeline

An [AgentWorkflow](https://github.com/cloudflare/agents/blob/main/examples/playground/src/demos/workflow/processing-workflow.ts) tied to the BuildAgent. Each `step.do()` is durable — completed steps are cached and skipped on replay.

**Steps:**

1. **Wait for slot** — `step.waitForEvent("start-build", { timeout: "30 minutes" })`. Hibernates until AccountAgent sends the event.
2. **Restore or clone** — Try `sandbox.restoreBackup(backup)` from KV-cached backup for this branch. If miss: full `git clone`. If hit: `git fetch && git checkout`.
3. **Install** — `sandbox.exec("npm ci")`. Incremental if restored from backup.
4. **Build** — `sandbox.exec("npm run build", { stream: true, onOutput })` with batched `reportProgress()`. Timeout: 20 minutes.
5. **Deploy** — `sandbox.exec("npx wrangler deploy")` with `CLOUDFLARE_API_TOKEN` injected via `sandbox.setEnvVars()`.
6. **Cache** — `sandbox.createBackup({ dir: "/workspace/repo", useGitignore: true })`, save handle to KV keyed by branch.
7. **Cleanup** — `sandbox.destroy()`.

All steps use `NonRetryableError` on failure — build errors are deterministic. Real-time streaming within steps via `exec({ stream: true, onOutput })` batched into `reportProgress()` calls.

- [AgentWorkflow](https://developers.cloudflare.com/agents/api-reference/#agentworkflow)
- [step.waitForEvent](https://developers.cloudflare.com/workflows/build/events-and-parameters/#wait-for-events-within-a-workflow)
- [NonRetryableError](https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/#nonretryableerror)
- [Workflow rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/)

### Sandbox — Build Container

A [Cloudflare Container](https://developers.cloudflare.com/sandbox/) per build via `getSandbox(env.Sandbox, buildId)`. Custom Dockerfile extending `cloudflare/sandbox:0.7.0` with `wrangler` pre-installed.

- `exec()` for running build commands, with `{ stream: true, onOutput }` for real-time output
- `setEnvVars()` for injecting secrets (API tokens, npm tokens)
- `createBackup()` / `restoreBackup()` for caching repos + `node_modules` by branch
- `destroy()` for cleanup (also kills fork bombs)
- `keepAlive: true` prevents eviction during long builds

Backup handles stored in KV keyed by branch name. R2 lifecycle rules on `backups/` prefix auto-delete after 7 days.

- [Sandbox API](https://developers.cloudflare.com/sandbox/api-reference/)
- [Streaming output](https://developers.cloudflare.com/sandbox/guides/streaming-output/)
- [Backup/restore](https://developers.cloudflare.com/sandbox/guides/backup-restore/)
- [R2 lifecycle rules](https://developers.cloudflare.com/sandbox/guides/backup-restore/#configure-r2-lifecycle-rules-for-automatic-cleanup)

---

## Bindings (`wrangler.jsonc`)

| Binding         | Type           | Purpose                               |
| --------------- | -------------- | ------------------------------------- |
| `AccountAgent`  | Durable Object | Per-account concurrency control       |
| `BuildAgent`    | Durable Object | Per-build WebSocket hub + log storage |
| `BuildWorkflow` | Workflow       | Durable build pipeline                |
| `Sandbox`       | Container      | Build execution environment           |
| `BACKUP_BUCKET` | R2             | Sandbox backup storage                |
| `BUILD_CACHE`   | KV             | Branch → backup handle mapping        |

SQLite migrations needed for `AccountAgent`, `BuildAgent`, and `Sandbox`.

---

## Data Flow

### Happy Path

```
1. GitHub push → Worker → AccountAgent("acct-123")
2. AccountAgent creates BuildWorkflow, adds to pendingBuilds
3. Slot available → sendEvent({ type: "start-build" })
4. Workflow wakes → restore backup (or clone) → install → build → deploy → cache → cleanup
5. Each step: exec({ stream, onOutput }) → batched reportProgress() → BuildAgent.onWorkflowProgress()
6. BuildAgent: write to SQL + broadcast() → browser WebSocket
7. Complete → AccountAgent.buildFinished() → send event to next pending workflow
```

### Fork Bomb / Timeout

```
1. Build step timeout (20 min) → step throws → workflow "errored"
2. BuildAgent.onWorkflowError() → sandbox.destroy() (kills container)
3. AccountAgent.buildFinished() → frees slot → triggers next pending build
```

### Browser Reconnect

```
1. Connect to BuildAgent via useAgent → auto-receives current state
2. Fetch historical logs via onRequest endpoint
3. New logs arrive via broadcast() in real-time
```

---

## Effect Integration

[Effect v4](https://github.com/Effect-TS/effect-smol) (`effect@beta`) wraps `sandbox.exec()` calls for:

- **Typed errors** — `CloneError | BuildError | DeployError` tracked at the type level, handled with `catchTag`
- **Structured logs** — every log line annotated with `buildId` and step name via `Effect.annotateLogs()`
- **Spans** — each exec wrapped in `Effect.withSpan()` for tracing

Effect handles observability, not control flow. Cloudflare primitives (Agent, Workflow, Sandbox) handle orchestration.

---

## Key Decisions

| Decision                                      | Rationale                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `waitForEvent` over `queue()` for concurrency | `queue()` is sequential (1 at a time). Paid needs 6 concurrent. Workflow hibernation is free. |
| Sandbox backup/restore for caching            | Avoids full clone + install on every build. squashfs + FUSE overlayfs is fast.                |
| `exec({ onOutput })` + `reportProgress()`     | Real-time streaming within durable workflow steps. Users can't wait 20 min for output.        |
| Agent SQL for logs over R2                    | Co-located, zero-latency, queryable, survives DO restarts.                                    |
| `NonRetryableError` for build failures        | Compilation errors are deterministic — retrying won't help.                                   |
| Effect for observability, not control flow    | CF primitives already handle orchestration. Effect adds typed errors + structured logging.    |

---

## Open Questions

1. **GitHub App** — Webhook receiver needs a GitHub App. How does the user connect their account? OAuth flow in the dashboard?
2. **Secrets injection** — How does the user provide `CLOUDFLARE_API_TOKEN`? Stored where? Encrypted how?
3. **Branch filtering** — Build every push, or only configured branches? Config stored where?
4. **Cancel build** — User clicks "Cancel" → need to `sandbox.destroy()` + `instance.terminate()`. Sufficient?
5. **Monorepo** — Can a single repo have multiple deploy targets? Separate builds per target?
6. **Log retention** — DO SQLite has storage limits. Archive old logs to R2? After how long?
7. **Sandbox restore failure** — If backup is corrupt or expired, fallback to full clone silently? Or surface to user?
