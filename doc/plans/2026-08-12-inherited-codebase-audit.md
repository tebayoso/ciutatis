# Inherited Codebase Audit — Ciutatis

Status: Complete  
Date: 2026-08-12  
Audience: A team that just inherited this repository and has no prior Paperclip/Ciutatis context  
Method: Static code and documentation review. Long-running servers were not started. Tests were not re-run as part of this pass.

Companion artifacts:

- Scanable HTML: [`reports/inherited-codebase-audit.html`](../../reports/inherited-codebase-audit.html) (also written to `tmp/reports/` locally; `tmp/` is gitignored)
- Day-one handbook: [`.cursor/project.mdc`](../../.cursor/project.mdc)

This document is the source of truth. It does not rewrite `doc/SPEC.md` or `doc/SPEC-implementation.md`. Findings are recorded, not fixed.

---

## 1. Executive summary

Ciutatis is a civic fork of [Paperclip](https://github.com/paperclipai/paperclip): a control plane for organizing AI agents (here called **channels**) into company-like **institutions**, assigning work as **requests**, aligning that work to **objectives**, enforcing **budgets**, and requiring **board approvals**.

The software that actually exists is larger and more dual-stacked than the V1 docs describe.

**What is true today**

- The control plane is a Node 20+ TypeScript monorepo. The Express API lives in `server/`. Shared contracts live in `packages/shared`. Postgres schema and migrations live in `packages/db`.
- There is **no top-level `ui/` package**. The operator board is a React Router SPA mounted inside Next.js at `/admin`, in `apps/landing`.
- Local default database is **embedded PostgreSQL**, not PGlite. Data lives under `~/.paperclip/instances/default/`.
- Two production stacks run in parallel: self-hosted Node + Postgres, and hosted Cloudflare Workers + D1 + OpenNext for `ciutatis.com`.
- Product copy is civic (institution / request / objective / channel). HTTP paths, npm package names, and many internals are still Paperclip (`/api/companies`, `/api/issues`, `@paperclipai/*`).

**Overall call:** treat this as a capable but forked control plane in mid-migration. Do not trust `AGENTS.md` as a map. Do not assume GitHub Actions on `main` are verifying PRs. Do not assume Docker images build. Do not assume issue checkout is atomic or company-scoped.

**Top risks (severity-ordered)**

1. GitHub workflows target `master`; the default branch is `main`. PR verify, lockfile policy, and canary release likely never run on this fork’s default branch.
2. `POST /issues/:id/checkout` does not call `assertCompanyAccess` and the service update is not conditional. Spec claims atomic, conflict-safe checkout.
3. `Dockerfile` copies files that are not in the repo (`scripts/docker-entrypoint.sh`, `packages/mcp-server`, `packages/adapters/acpx-local`).
4. ~60 admin UI tests and all Playwright e2e are outside the default test runner / PR CI.
5. Docs (`AGENTS.md`, README, V1 spec, Cloudflare routing notes) describe a smaller, older system than the tree.

**What is strong**

- Company-scoped data model with dual civic/Paperclip exports.
- Budget hard-stop path is real: policies, incidents, pause, heartbeat invocation block.
- Adapter registry, plugin host, CLI onboard/doctor, and a dense board UI all exist and are wired.
- `doc/DEVELOPING.md` and `doc/DATABASE.md` are closer to reality than `AGENTS.md`.

**Recommended first ten engineering moves** (not done in this PR)

1. Point CI workflows at `main`, or restore `master` as the default branch — pick one.
2. Add `assertCompanyAccess` (and activity logging) to checkout; make checkout a conditional update.
3. Fix or delete the broken Dockerfile COPY/ENTRYPOINT paths.
4. Wire `apps/landing` tests into `vitest.config.ts` and `pnpm test:run`.
5. Restore or delete missing files listed in `scripts/run-vitest-stable.mjs`.
6. Refresh `AGENTS.md` repo map (`apps/landing`, embedded-postgres, workers, CLI).
7. Decide whether plugins and Cloudflare are in-scope product or fork experiments.
8. Gate npm publish on Docker smoke; add a scheduled e2e run.
9. Document the two production stacks as separate runbooks (this audit starts that).
10. Delete or route orphan UI pages (`MyIssues`, `IssueDetail`, `Org`).

---

## 2. How to use this package

| Artifact | Use when |
|---|---|
| This file | Architecture, findings, citations, backlog |
| `.cursor/project.mdc` | Opening the repo and making a change |
| `.cursor/feature/control-plane.mdc` | Server, db, adapters, plugins |
| `.cursor/feature/admin-ui.mdc` | Board UI conventions |
| `.cursor/feature/deployment.mdc` | Self-host vs Cloudflare |
| `.cursor/specs/ux-flows.mdc` | Operator flows and page inventory |
| `.cursor/specs/test-map.mdc` | What tests exist and what CI runs |
| `reports/inherited-codebase-audit.html` | Sharing the audit with non-git readers |

Read order for a new engineer: this summary → day-one runbook → vocabulary map → the feature file for the area you will touch.

---

## 3. Day-one runbook

### 3.1 Identity

- GitHub: `tebayoso/ciutatis` (MIT, Paperclip fork).
- Root package name is still `paperclip`. CLI binary is `ciutatis` (also invoked as `paperclipai`).
- Default git branch in this environment: `main`.
- Node `>=20`, pnpm `9.15.4`.

### 3.2 Local start

```sh
pnpm install
pnpm dev          # API watch mode, http://localhost:3100
pnpm dev:landing  # Next public site + admin, http://localhost:3000
```

One-command local install:

```sh
pnpm paperclipai run   # onboard if needed, doctor, start server
```

Leave `DATABASE_URL` unset. The server starts embedded PostgreSQL and persists at `~/.paperclip/instances/default/db`. Reset by deleting that instance directory (not `data/pglite`).

Storage default: `~/.paperclip/instances/default/data/storage`.  
Agent workspaces: `~/.paperclip/instances/default/workspaces/<agent-id>`.

### 3.3 Ports and UI

| Surface | URL | Notes |
|---|---|---|
| API | `http://localhost:3100` | Express. Health: `/api/health` |
| Admin board | `http://localhost:3000/admin` | Next host, React Router basename `/admin` |
| Public site | `http://localhost:3000` | Marketing, portal, govops, scrutiny |
| Standalone Vite UI | gone | `AGENTS.md` and README still mention `ui/` |

Root scripts `dev:admin` and `dev:ui` both run `@ciutatis/landing`, not a Vite board.

### 3.4 Deployment modes

Canonical model in `doc/DEPLOYMENT-MODES.md` and `packages/shared`:

| Mode | Exposure | Human auth |
|---|---|---|
| `local_trusted` | n/a (loopback) | No login; implicit board principal |
| `authenticated` | `private` | Login required; hostname allowlist |
| `authenticated` | `public` | Login required; explicit public URL |

Env (Node): `PAPERCLIP_DEPLOYMENT_MODE`, `PAPERCLIP_DEPLOYMENT_EXPOSURE`, `PAPERCLIP_PUBLIC_URL`, `BETTER_AUTH_SECRET`.  
Env (Workers): `DEPLOYMENT_MODE` (different name).

### 3.5 Verification commands (DoD)

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

`pnpm lint` is a no-op (`node -e "process.exit(0)"`). Do not treat a green lint as quality signal.

---

## 4. Vocabulary map

Use this table every time you read a file. Mixing terms is the most common way to edit the wrong layer.

| Civic UI / docs | HTTP / DB physical | TypeScript export | Meaning |
|---|---|---|---|
| Institution | `companies` table, `/api/companies` | `institutions` / `companies` | First-order tenant object |
| Request / ticket | `issues` table, `/api/issues` | `requests` / `issues` | Work item |
| Objective | goals table, `/api/goals` | `objectives` / `goals` | Goal hierarchy |
| Channel | `agents` | `agents` | AI employee |
| Board / council | board actor | `req.actor.type === "board"` | Human operator |
| Company prefix | `issue_prefix` | `issuePrefix` | URL segment, e.g. `/PAP/requests` |

Physical table names were not renamed. Civic names are TypeScript aliases. Example: `packages/db/src/schema/institutions.ts` exports `institutions` as `pgTable("companies", ...)`.

Public README talks about municipal operations and “channels.” Internal product docs (`doc/GOAL.md`, `doc/PRODUCT.md`) still describe autonomous AI companies. Both frames map to the same objects.

---

## 5. Architecture and structure

### 5.1 Runtime picture

```
Operator browser
  ├─ Public civic site  (apps/landing Next.js)
  ├─ Citizen portal     (/portal)
  └─ Board SPA          (/admin → apps/landing/src/admin)

Self-hosted control plane
  cli/  →  server/ (Express /api)  →  packages/db (Postgres / embedded-postgres)
                ├─ heartbeat.ts (orchestration)
                ├─ adapters (process, http, claude_local, …)
                └─ plugin host

Hosted ciutatis.com
  workers/dispatcher  →  apps/landing (OpenNext ciutatis-web)
  admin.ciutatis.com/api/*  →  workers/api  →  packages/db-cloudflare (D1)
```

### 5.2 Monorepo map (actual)

Defined in `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `packages/adapters/*`, `packages/plugins/*` (with exclusions), `server`, `cli`, `workers/*`.

| Path | Role |
|---|---|
| `server/` | Express API, auth, heartbeat, plugin host |
| `apps/landing/` | Next.js public site + admin SPA. **This is the UI.** |
| `apps/superparser-portal/` | Hackathon-style demo console |
| `apps/superparser-service/` | Python GovOps extraction agent (Cloud Run) |
| `packages/db/` | Drizzle Postgres schema + ~66 SQL migrations |
| `packages/db-cloudflare/` | D1/SQLite twin schema + ~10 migrations |
| `packages/shared/` | Types, Zod validators, API path constants, config schema |
| `packages/adapter-utils/` | Shared adapter interfaces |
| `packages/adapters/*` | Claude, Codex, Cursor, Gemini, OpenCode, Pi, OpenClaw, Cloudflare Workers AI |
| `packages/plugins/sdk/` | Plugin SDK |
| `cli/` | `ciutatis` / `paperclipai` onboard, doctor, run, client commands |
| `workers/api` | Hono Workers API (hosted) |
| `workers/dispatcher` | Apex/www front door |
| `workers/status` | `status.ciutatis.com` |
| `workers/tenant-runtime` | Per-tenant template (not a full product yet) |
| `doc/` | Product/engineering contracts |
| `docs/` | Mintlify public docs |
| `tests/e2e`, `tests/release-smoke` | Playwright |
| `scripts/` | Dev runner, release, smoke, lockfile helpers |

`AGENTS.md` §3 lists only `server/`, `ui/`, `packages/db`, `packages/shared`, `doc/`. That map is stale.

### 5.3 Server

Entry: `server/src/index.ts` (`startServer`): load config, start embedded Postgres if needed, migrate, `createApp`, HTTP server, live-events WebSocket, heartbeat, plugin workers.

App factory: `server/src/app.ts`. Middleware: `actorMiddleware`, `boardMutationGuard`, `privateHostnameGuard`, pino logger, error handler. API mounted at `/api`. Optional static UI from `server/ui-dist` when `SERVE_UI=true`; comments in `AdminApp.tsx` state the primary UI is `apps/landing`.

Actor model (`server/src/types/express.d.ts`, `server/src/routes/authz.ts`):

- `board` — session, local implicit, or instance admin
- `agent` — bearer API key or local JWT; must stay in `req.actor.companyId`
- `none` — unauthenticated

`assertCompanyAccess` allows: local implicit board, instance admin, board with `companyIds` membership, or agent whose `companyId` matches. Agents crossing companies get `"Agent key cannot access another company"`.

Route modules (Express) include companies, agents, issues, goals, approvals, costs, activity, dashboard, plugins, adapters, environments, execution-workspaces, public-portal, health, instance settings/backups, secrets, access, and several civic aliases (`institutions.ts`, `requests.ts`, `objectives.ts`).

Orchestration hub: `server/src/services/heartbeat.ts` (**9720 lines**). This file owns run lifecycle, adapter execute, liveness, continuations, and budget invocation checks. Treat it as the highest-complexity module in the repo.

### 5.4 Data

- Schema: `packages/db/src/schema/` (~84 files), barrel `schema/index.ts` with civic exports plus Paperclip aliases.
- Migrations: `packages/db/src/migrations/` (~66 SQL files). Generate with `pnpm db:generate` (compiles db package first).
- Client: `packages/db/src/client.ts`. Runtime remaps legacy `pglite` config keys in `packages/db/src/runtime-config.ts`.
- Cloudflare twin: `packages/db-cloudflare/` with its own migrations directory referenced from `workers/api/wrangler.toml`.

Core tables (physical names): `companies`, `agents`, `agent_api_keys`, `issues`, `goals`, `projects`, `approvals`, `budget_policies`, `budget_incidents`, `cost_events`, `heartbeat_runs`, `activity_log`, auth tables (Better Auth), memberships, plugins, environments, execution workspaces, assets, public requests.

### 5.5 Adapters

Registry: `server/src/adapters/registry.ts`. Built-ins `process` and `http` live under `server/src/adapters/`. Packaged adapters register by type key.

| Type | Status |
|---|---|
| `process`, `http` | Built-in |
| `claude_local`, `codex_local`, `cursor`, `gemini_local`, `opencode_local`, `pi_local`, `openclaw_gateway` | Registered |
| `cloudflare_workers_ai` | Registered (`@ciutatis/adapter-cloudflare-workers-ai`) |
| `acpx_local` | Registered stub; `execute` throws “not available in this Ciutatis build” |
| `hermes_local` | Listed in `AGENT_ADAPTER_TYPES` (`packages/shared/src/constants.ts`); **not registered** |

Unknown types fall back to the process adapter. External adapters can load from a managed plugin install dir.

Onboarding UI currently locks new agents to `cloudflare_workers_ai` (`OnboardingWizard.tsx` `type AdapterType = "cloudflare_workers_ai"`), which is narrower than PRODUCT.md’s “unopinionated about how you run your agents.”

### 5.6 Plugins

V1 spec (`doc/SPEC-implementation.md` §5.2) lists plugin framework as **out of scope**. The tree has a full host: SDK, `create-paperclip-plugin`, examples, DB tables, routes, worker manager, job scheduler, UI slots (`PluginSlotOutlet` in the sidebar). Treat plugins as shipped-but-undocumented-as-V1, not as a future idea.

### 5.7 CLI

`cli/src/index.ts`, package name `paperclipai`, program name `ciutatis`. Commands: onboard, doctor, env, configure, allowed-hostname, heartbeat-run, run, auth bootstrap-ceo, db:backup, env-lab, worktree (disabled), plus client commands for company/issue/agent/approval/activity/dashboard/plugin/context.

### 5.8 Workers vs Express (parity)

Workers API route barrel: `workers/api/src/routes/index.ts`.

Present on Express, absent or incomplete on Workers (non-exhaustive): issue-tree-control, routines, sidebar-preferences, inbox-dismissals, adapters, instance-database-backups, environments, user-profiles, company-skills, org-chart-svg.

Present on Workers, civic/hosted-specific: collaborate, public-auth, me, public-portal (Express also has public-portal).

Do not assume a board feature that works against local Express works against `admin.ciutatis.com/api`.

---

## 6. Code audit

Findings first. Objection type is labeled so architectural problems are not filed as “docs are stale.”

### P0 — Checkout is neither atomic nor company-gated

**Type:** implementation + trust boundary  
**Spec:** `doc/SPEC-implementation.md` §3: “Single assignee; atomic checkout required for `in_progress` transition.” AGENTS.md: “Atomic issue checkout semantics.”

**Code:** `server/src/services/requestService.ts`

```254:264:server/src/services/requestService.ts
    async checkout(issueId, agentId, _statuses, runId) {
      await db.update(issues).set({
        assigneeAgentId: agentId,
        checkoutRunId: runId,
        status: "in_progress",
        updatedAt: new Date(),
      }).where(eq(issues.id, issueId));
    },
    async assertCheckoutOwner() {
      return { adoptedFromRunId: null };
    },
```

The `_statuses` argument is ignored. There is no `AND status IN (...)` and no row-count check. Two agents can both “win.” `assertCheckoutOwner` is a no-op.

**Route:** `server/src/routes/issues.ts` `POST /issues/:id/checkout` loads the issue and calls `checkout` **without** `assertCompanyAccess`. Neighboring routes (`GET /issues/:id`, comments, documents) do call it. `POST /issues/:id/release` uses `assertCanMutateIssue`. Checkout is the exception.

Heartbeat also calls `issuesSvc.checkout` (`server/src/services/heartbeat.ts` around the `["todo", "backlog", "blocked"]` call). The expected-status list is passed and discarded.

**Tests:** `issues-checkout-wakeup.test.ts` covers a small helper. `issues-service.test.ts` is listed in the serialized runner and **does not exist**.

### P0 — CI workflows listen to `master`; default branch is `main`

**Type:** rollout / ops  
`.github/workflows/pr-verify.yml`, `pr-policy.yml`, `refresh-lockfile.yml`, and `release.yml` trigger on `master`. This clone’s default branch is `main`. Unless GitHub still has a `master` branch receiving PRs, **PR verification and canary publish do not run for this fork.**

### P0 — Docker image as written cannot copy its entrypoint or some workspace packages

**Type:** ops  
`Dockerfile` lines 23–24 and 59–79:

- `COPY packages/mcp-server/package.json` — directory does not exist
- `COPY packages/adapters/acpx-local/package.json` — directory does not exist
- `COPY scripts/docker-entrypoint.sh` — file does not exist
- `ENTRYPOINT ["docker-entrypoint.sh"]`

Quickstart and ECS docs assume this image. `scripts/check-docker-deps-stage.mjs` exists and is not in PR CI.

### P1 — Heartbeat is a 9.7k-line god module

**Type:** architecture  
`server/src/services/heartbeat.ts` is 9720 lines. Budget blocks, adapter execution, liveness continuations, activity logging, and recovery all meet here. Recovery is partially split (`server/src/services/recovery/`), but the main file remains the change-risk hotspot. New work in this file will be hard to review and easy to regress.

### P1 — Dual schema (Postgres vs D1) without a single migration story

**Type:** architecture  
`packages/db` (~66 migrations) and `packages/db-cloudflare` (~10 migrations) must be updated in parallel for hosted vs self-host. D1 apply is manual (`wrangler d1 migrations apply`). Duplicate numeric prefixes are an apply-order risk. There is no automated D1 backup schedule (`doc/ROLLBACK-PLAN.md` is manual export/restore).

### P1 — Checkout authz hole is part of a broader “load then maybe gate” pattern

**Type:** trust  
`loadIssueOr404` does not check company access. Callers must remember `assertCompanyAccess`. Checkout forgot. Any new issue sub-route copied from checkout will repeat the hole. Prefer a `loadIssueForActorOr404` helper.

### P1 — Adapter surface does not match constants or onboarding

**Type:** implementation + product  
`hermes_local` is in `AGENT_ADAPTER_TYPES` but unregistered. `acpx_local` is registered and always fails. Onboarding only offers Cloudflare Workers AI. PRODUCT.md says the control plane is unopinionated about runtimes.

### P1 — UI tests and e2e are orphaned from the default quality gate

**Type:** implementation quality  
See §7. Sixty landing tests sit on disk and never run in `pnpm test:run`. Playwright e2e is `workflow_dispatch` only. Release smoke is not called from `release.yml`.

### P2 — `pnpm lint` is a stub

**Type:** implementation quality  
Root `package.json` `"lint": "node -e \"process.exit(0)\""`. No ESLint/Biome/Prettier config found. Forbidden-token check (`pnpm check:tokens`) is not in PR CI.

### P2 — Civic/Paperclip dual naming

**Type:** architecture  
Every schema/API/UI change must touch aliases. Easy to update `institutions` and miss `companies`, or update `/requests` UI and miss `/api/issues`. This is survivable if the team uses the vocabulary map; it is expensive if they do not.

### P2 — Activity logging is real but not universal

**Type:** implementation  
`logActivity` is used on issue create/update, budget policy upsert, heartbeat events, hire hooks, plugins, recovery. Checkout does not log. Some GETs correctly skip it. Do not assume “all mutations write activity_log” without checking the route.

### What is in good shape

- **Budget hard-stop:** `server/src/services/budgets.ts` upserts policies, creates soft/hard incidents, pauses company/agent/project with `pauseReason: "budget"`, and `getInvocationBlock` is consulted from heartbeat before new work (`heartbeat.ts` ~4732, ~5760, ~8518). Covered by `server/src/__tests__/budgets-service.test.ts`.
- **Approvals:** service + idempotency route tests exist.
- **Company list/create path guards:** `companies-route-path-guard.test.ts` exists; a dedicated `authz-company-access.test.ts` does not (but is listed in the runner).
- **Auth modes:** Better Auth + local board principal + board-claim flow are documented in `doc/DEPLOYMENT-MODES.md` and implemented on the Node server.

---

## 7. Tests and CI

### 7.1 What `pnpm test:run` actually runs

Root `vitest.config.ts` projects:

- `packages/shared`, `packages/db`, `packages/adapter-utils`
- six local adapters (claude, codex, cursor, gemini, opencode, pi)
- `server`, `cli`

Orchestration: `scripts/run-vitest-stable.mjs` (non-server projects, then server, then serialized route/authz files one-by-one).

**Not in that list:** `apps/landing` (60 tests), `workers/*` (2 tests in api only), most plugins, openclaw-gateway package tests, cloudflare-workers-ai package tests, Playwright.

### 7.2 Approximate counts (this tree)

| Area | Files | In default `test:run`? |
|---|---|---|
| `server/src/__tests__` | 132 | Yes (with serialized split) |
| `apps/landing` | 60 | No |
| `packages/adapters` | 17 | Partial (six locals yes) |
| `cli` | 11 | Yes |
| `packages/adapter-utils` | 8 | Yes |
| plugins | 4 | No |
| e2e | 3 | No (dispatch-only workflow) |
| release-smoke | 1 | No |
| `packages/db` / `shared` | 2 + 2 | Yes |
| `workers` | 2 | No |

### 7.3 Serialized allowlist drift

`scripts/run-vitest-stable.mjs` `additionalSerializedServerTests` names files that are **missing**:

- `authz-company-access.test.ts`
- `company-portability.test.ts`
- `express5-auth-wildcard.test.ts`
- `heartbeat-process-recovery.test.ts`
- `invite-accept-existing-member.test.ts`
- `issues-service.test.ts`
- `project-routes-env.test.ts`
- `routines-e2e.test.ts`

The runner will not fail solely because a listed file is absent (it walks the tests directory). The list is a false inventory of invariant coverage.

### 7.4 CI workflows

| Workflow | Trigger | Runs | Gap |
|---|---|---|---|
| `pr-verify.yml` | PR → **`master`** | typecheck, `test:run`, build, canary dry-run | Wrong branch; no UI tests; no e2e; Node 24; `--no-frozen-lockfile` |
| `pr-policy.yml` | PR → **`master`** | lockfile policy | Wrong branch |
| `refresh-lockfile.yml` | Push **`master`** | lockfile PR | Wrong branch |
| `e2e.yml` | `workflow_dispatch` only | Playwright | Not on PRs; Node 20; frozen lockfile |
| `release-smoke.yml` | dispatch / `workflow_call` | Docker onboard + Playwright | Not called from `release.yml` |
| `release.yml` | Push **`master`** | verify + npm canary | Wrong branch; no Docker smoke; does not deploy Cloudflare |

### 7.5 How to run locally

```sh
pnpm test:run
pnpm test:e2e                 # starts its own webServer; not a long-lived pnpm dev
pnpm test:release-smoke       # needs Docker
pnpm test:release-registry
```

Landing tests have no package script. Ad-hoc: `pnpm exec vitest run apps/landing` (not verified in this pass).

Server suites that need Postgres use `server/src/__tests__/helpers/embedded-postgres.ts` and skip when unsupported.

### 7.6 Invariant coverage snapshot

| Invariant | Coverage |
|---|---|
| Budget hard-stop | Good unit tests |
| Approvals | Good |
| Auth / Better Auth / agent JWT | Partial–good |
| Company scoping | Partial; dedicated authz file missing |
| Atomic checkout | Weak / missing service tests |
| Agent API key cross-company | Thin |
| Activity log on all mutations | Spotty |
| UI board flows | Tests exist, not executed in CI |
| Hosted Workers API | Almost none |

---

## 8. Deployment

Keep these runbooks separate. Mixing them is the fastest way to migrate the wrong database.

### 8.1 Stack A — Self-hosted Node + Postgres

**When:** local operator, Docker, ECS, npm `paperclipai` CLI.

**Code:** `server/`, `packages/db`, `Dockerfile`, `docker-compose.yml`, `docker-compose.quickstart.yml`, `docker/ecs-task-definition.json`.

**Auth env:** `PAPERCLIP_DEPLOYMENT_MODE`, `PAPERCLIP_DEPLOYMENT_EXPOSURE`, `BETTER_AUTH_SECRET`.

**DB:** embedded Postgres (no `DATABASE_URL`) or external Postgres. Migrations via startup `ensureMigrations` / `pnpm db:migrate`. Backups: `pnpm db:backup` (`scripts/backup-db.sh`).

**Health:** `GET /api/health`. ECS task def curls `http://localhost:3100/api/health`.

**Release:** `.github/workflows/release.yml` publishes npm canary on push to `master`, stable via `workflow_dispatch`. Docs: `doc/RELEASING.md`. Rollback: `scripts/rollback-latest.sh` (dist-tag only). **This does not deploy ciutatis.com.**

**Current blockers:** missing Docker entrypoint and COPY sources; CI branch name.

### 8.2 Stack B — Hosted Cloudflare

**When:** `ciutatis.com` / `admin.ciutatis.com` / `status.ciutatis.com`.

| Worker | Config | Role |
|---|---|---|
| `ciutatis-dispatcher` | `workers/dispatcher/wrangler.toml` | `ciutatis.com/*`, `www.ciutatis.com/*`; `LANDING_ORIGIN` currently `https://ciutatis-web.jorge-b9f.workers.dev` |
| `ciutatis-web` | `apps/landing/wrangler.toml` | OpenNext Next.js (public + `/admin`) |
| `ciutatis-admin-api` | `workers/api/wrangler.toml` | `admin.ciutatis.com/api/*`, `ciutatis.com/api/public/*`; D1 + R2 + session KV |
| `ciutatis-api` | `workers/api/wrangler.public.toml` | public API host |
| `ciutatis-status` | `workers/status/wrangler.toml` | status page + 5m cron |

Deploy is **manual** (`wrangler deploy` / `pnpm --filter @ciutatis/landing deploy`). No GitHub Action deploys Cloudflare.

**Auth env:** `DEPLOYMENT_MODE=authenticated`, `AUTH_DISABLE_SIGNUP=true`. `DEPLOYMENT_EXPOSURE` is not set in wrangler vars (health may default to `"private"`).

**DB:** D1 `ciutatis-db` (`database_id` committed). Migrations: `wrangler d1 migrations apply ciutatis-db --remote`.

**Secrets:** `wrangler secret put` for `BETTER_AUTH_SECRET`, Cloudflare API token, R2 keys, Superparser shared secret.

**Superparser:** `SUPERPARSER_URL=""` in wrangler; `/api/public/collaborate` returns 503 until set. Superparser itself is a separate GCP Cloud Run app (`apps/superparser-service`).

**Observability:** Cloudflare `[observability] enabled = true`, `wrangler tail`, status worker. No Sentry/OTel in deploy configs.

**Rollback:** `doc/ROLLBACK-PLAN.md` — redeploy known Worker, emergency `DEPLOYMENT_MODE=local_trusted` (unsafe if left on a public hostname), KV session clear, D1 export/restore.

**Bus factor:** dispatcher `LANDING_ORIGIN` points at a personal `workers.dev` subdomain. Cloudflare account id `b9f5ebc6c05975fab56f056782461b77` is committed in multiple wrangler files.

### 8.3 Local vs production differences

| Concern | Local | Self-host prod | Hosted CF |
|---|---|---|---|
| Runtime | Express + Next | Docker/ECS Node | Workers + OpenNext |
| DB | Embedded Postgres | Postgres | D1 |
| Auth default | `local_trusted` | `authenticated` | `authenticated`, signup off |
| UI | landing `:3000` | optional `SERVE_UI` static | `ciutatis-web` |
| Migrations | auto/prompt | auto-apply flag | manual D1 |
| Agents | local CLIs | container CLIs | Workers AI path; fewer local adapters |

---

## 9. UX / UI audit (operator + builder handbook)

Audit method: routes, pages, components, and `doc/spec/ui.md` / design-guide skill. No live browser session.

### 9.1 Two products in one app

Package: `@ciutatis/landing` (`apps/landing`). Next.js 16 + OpenNext. Board is **not** Vite.

Mount: `apps/landing/app/admin/[[...slug]]/page.tsx` dynamically loads `AdminApp` with `ssr: false`. `AdminApp.tsx` wraps React Router `BrowserRouter` with basename `/admin`.

1. **Public civic site** — marketing, bilingual `en`/`es`, citizen portal, GovOps, Scrutiny, geo entity pages (Next app router + some SPA routes).
2. **Operator board** — dense control plane under `/admin/:companyPrefix/...`.

They share a Next app and some tokens; they do not share a visual system evenly. Public pages use Fraunces / display fonts and light paper palettes. The board uses Tailwind semantic tokens (OKLCH) with a light `:root` and `.dark` class.

### 9.2 Tech stack (board)

React 19, react-router-dom 7, TanStack Query 5, Tailwind CSS 4, Radix, CVA, cmdk, dnd-kit, lucide-react, MDXEditor, mermaid. Path alias `@/*` → `apps/landing/src/admin/*`.

API client: `apps/landing/src/admin/api/client.ts` (`fetch` + credentials). Domain modules: agents, issues, goals, companies, approvals, budgets, costs, activity, heartbeats, plugins, auth, health, etc. HTTP still talks to `/api/companies` and `/api/issues`.

### 9.3 Shell and navigation

Layout: `apps/landing/src/admin/components/Layout.tsx` — CompanyRail + Sidebar (`w-60`) + main + optional PropertiesPanel (`w-80`) + BreadcrumbBar. Mobile: drawer + `MobileBottomNav`.

Company context: `CompanyContext.tsx` loads `companiesApi.list()`, persists `paperclip.selectedCompanyId`, prefixes routes with `issuePrefix` (`lib/company-routes.ts`, company-aware `Link` in `lib/router.tsx`).

**Sidebar (shipped)** — `Sidebar.tsx`:

- New Request, Dashboard, Inbox, plugin sidebar slots
- Work: Requests, Objectives, optional Workspaces (experimental flag)
- Projects list, Agents list
- Institution: Org, Costs, Activity, Settings

**Not in sidebar (spec wants them):** My Issues, Views, Approvals (Approvals exist as routes and in Inbox), notification bell. Company header is name + search icon, not the spec’s full switcher + New Issue icon row. Company switching is the left **CompanyRail** (drag-reorder).

Instance admin uses `InstanceSidebar` under `/instance/settings/*`.

### 9.4 Route inventory (board)

Router: `apps/landing/src/admin/App.tsx`. Company routes are nested in `councilRoutes()` under `/:companyPrefix`. Unprefixed board paths redirect into the selected prefix.

| Path (after `/admin/:prefix/`) | Page | Role | Primary APIs |
|---|---|---|---|
| `dashboard` | `Dashboard` | Health, live runs, activity | dashboard, activity, issues, agents, projects, heartbeats |
| `onboarding` | `OnboardingRoutePage` | Re-run wizard | dialog → OnboardingWizard |
| `institutions` | `Institutions` | Multi-institution list | companies |
| `institution/settings` | `InstitutionSettings` | Institution + branding | companies, access, assets |
| `institution/settings/environments` | `CompanyEnvironments` | Env/secrets | environments, secrets |
| `org` | `OrgChart` | Interactive org | agents |
| `agents/*` | `Agents`, `NewAgent`, `AgentDetail` | Hire, config, runs, budget | agents, heartbeats, budgets, activity, issues |
| `projects/*` | `Projects`, `ProjectDetail` | Project tabs | projects, issues, budgets, execution-workspaces |
| `requests`, `requests/:issueId` | `Requests`, `RequestDetail` | **Live work object UI** | issues, agents, heartbeats, activity, comments |
| `issues` | redirect → `/requests` | Legacy | — |
| `objectives/*` | `Objectives`, `ObjectiveDetail` | Goal tree | goals, projects, assets |
| `approvals/pending\|all`, `approvals/:id` | `Approvals`, `ApprovalDetail` | Governed actions | approvals, agents |
| `costs` | `Costs` | Spend + policies + incidents | costs, budgets |
| `activity` | `Activity` | Audit log | activity |
| `inbox/{recent,unread,all}` | `Inbox` | Approvals, failed runs, touched work | approvals, dashboard, issues, heartbeats |
| `search` | `Search` | Full search | search, agents |
| `workspaces`, `execution-workspaces/:id` | `Workspaces`, `ExecutionWorkspaceDetail` | Isolated workspaces (experimental) | execution-workspaces |
| `users/:userSlug` | `UserProfile` | Human profile | auth / userProfiles |
| `design-guide` | `DesignGuide` | Living DS | fixtures |
| `tests/ux/runs` | `RunTranscriptUxLab` | Transcript UX lab | fixtures |
| `:pluginRoutePath`, `plugins/:pluginId` | `PluginPage` | Plugin surfaces | plugins |
| `*` | `NotFoundPage` | 404 | — |

Instance (no company prefix): `/instance/settings/overview|heartbeats|tenants|cloudflare|experimental|plugins`.

Auth/public (SPA): `/`, `/portal`, `/govops`, `/scrutiny`, `/auth`, `/invite/:token`, `/council-claim/:token`, locale variants.

### 9.5 Orphan and dual implementations

| File | Status |
|---|---|
| `pages/RequestDetail.tsx` (1222 lines) | **Live** issue detail: comments, documents, live run, properties |
| `pages/IssueDetail.tsx` (388 lines) | **Unrouted**. Uses `IssueChatThread`. Has a large test file |
| `components/IssueChatThread.tsx` | Used by IssueDetail + labs, not by RequestDetail |
| `pages/MyIssues.tsx` | **Unrouted**. Spec §3.2 wants it. Filter logic is “unassigned open issues,” not “assigned to the board user” |
| `pages/Org.tsx` | **Unrouted**. `/org` uses `OrgChart` |
| `pages/DashboardLive.tsx`, `SystemNoticeUxLab.tsx`, `IssueChatLongThreadPerf.tsx` | Labs, not in router (except `RunTranscriptUxLab`) |
| `pages/ScrutinyPage.tsx` | Routed; several “Coming soon” sections |

`createIssueDetailPath` is imported by `IssueBlockedNotice.tsx` and `ProductivityReviewBadge.tsx` but **not exported** from `lib/issueDetailBreadcrumb.ts` (that file exports breadcrumb state helpers only). That is a typecheck/runtime footgun for those components.

### 9.6 Operator flows

**First run (`local_trusted`)**

1. `pnpm paperclipai run` or `pnpm dev` + `pnpm dev:landing`.
2. Open `/admin`. Health says `local_trusted`. No login.
3. If no companies, Layout auto-opens `OnboardingWizard`.
4. Wizard steps: institution → agent (Cloudflare Workers AI locked) → starter task (default text tells the CEO to clone `default/ceo/AGENTS.md`) → launch.
5. Land on `/:prefix/dashboard`.

**Authenticated bootstrap**

1. Health `bootstrapStatus === "bootstrap_pending"` → UI tells operator to run `pnpm ciutatis auth bootstrap-ceo`.
2. Invite landing `/invite/:token`. Session required for board.
3. Local→authenticated claim: `/council-claim/:token` (docs also mention `/board-claim/`).

**Create institution later:** CompanyRail `+`, Institutions page, or `/onboarding` (instance admin only).

**Hire agent:** `/agents/new` → `agentsApi.hire` (may require approval if `requireBoardApprovalForNewAgents`). Also `NewAgentDialog`.

**Work a request:** `C` or New Request → `NewIssueDialog` → `/requests` list or kanban → `/requests/:id` (`RequestDetail`) → comments (`CommentThread` + markdown) → live run widget. This is the product’s “conversation attached to work,” not a chatbot.

**Approvals:** Inbox is the operator attention surface. Dedicated `/approvals/pending`.

**Budgets:** Costs page policies/incidents; project Budget tab; agent budget on AgentDetail. Hard-stop pause is a backend behavior; UI should show paused status and incidents.

**Instance admin:** tenants, Cloudflare settings, experimental flags (isolated workspaces), plugin manager.

### 9.7 Keyboard, errors, a11y

Shortcuts (`useKeyboardShortcuts.ts`, `CommandPalette.tsx`):

| Key | Action |
|---|---|
| Cmd/Ctrl+K | Command palette |
| C | New request (ignored in inputs) |
| `[` / `]` | Toggle sidebar / properties panel |
| Cmd/Ctrl+Enter | Submit in several dialogs |
| / | Focus search on Search page |

Spec’s number-key status changes on rows are not implemented in the global shortcut hook.

Loading: `PageSkeleton` on many lists; several gates still say `"Loading..."`.  
Empty: shared `EmptyState`.  
Errors: toasts on mutations, inline `text-destructive`, top-level `ErrorBoundary`, `NotFoundPage`. Inconsistent: some pages skip `EmptyState`.

A11y positives: skip link in Layout, many `aria-label`s, Radix focus rings, Search `aria-live`. Gaps: CompanyRail DnD is mouse-first; status often color-only; keyboard-first spec is only partly met; public and board contrast systems differ.

### 9.8 Design system vs spec vs DesignGuide

- `doc/spec/ui.md` (2026-02-17 draft): dark-default, HSL charcoal, Inter, Vite board, My Issues, Views, GitBranch org icon.
- Shipped tokens: `apps/landing/src/admin/index.css` — OKLCH, light `:root`, `.dark` overrides, `--radius: 0` (sharp civic look, not spec’s 0.625rem).
- Theme: `ThemeContext` reads `documentElement` class; default document is light (`color-scheme: light` on `:root`). Toggle exists. Spec’s “dark theme default” is not the CSS default.
- `/design-guide` (`DesignGuide.tsx`, 1346 lines) covers primitives well (button, badge, status, entity row, empty, skeleton, shortcuts). Coverage badges omit `toggle-switch` (used by `RoutineList`). Missing from the guide: KanbanBoard, IssueChatThread, CompanyRail, OnboardingWizard, LiveRunWidget, budget/finance cards, transcript views, plugin slots.

When adding a reusable board component: add it to DesignGuide and to `.claude/skills/design-guide` component index if that skill is in use.

### 9.9 How to continue UI work

1. Edit `apps/landing/src/admin/`, not a `ui/` package.
2. Keep HTTP clients on Paperclip paths (`issuesApi`, `companiesApi`) even when the page says Request/Institution.
3. New board routes go in `councilRoutes()` in `App.tsx` and need a sidebar or command-palette entry if operators must find them.
4. Company-scoped links must use the company-aware `Link` from `lib/router.tsx` so the prefix stays in the URL.
5. Prefer `RequestDetail` for issue UX. Do not add features only to unrouted `IssueDetail` unless you also route it or merge the two.
6. Public marketing pages are a separate visual language; do not force board tokens onto `/scrutiny` or vice versa without an explicit unification decision.
7. Do not start `pnpm dev` from an unattended agent session; use `pnpm -r typecheck` and targeted vitest instead.

### 9.10 Spec vs shipped (short)

| Spec | Shipped |
|---|---|
| Vite `ui/` | Next `apps/landing` `/admin` |
| Dark default | Light default + toggle |
| Issues / Goals / Company | Requests / Objectives / Institution |
| My Issues, Views | Missing (MyIssues file unrouted) |
| Approvals in Inbox only | Inbox + `/approvals` routes, not in sidebar |
| Issue detail as chat-capable | Live path is comment thread on `RequestDetail` |
| Keyboard-first dense plane | Partial shortcuts, mobile bottom nav exists |

PRODUCT.md “not a chatbot” is mostly honored on live routes. `IssueChatThread` is the unfinished other path.

---

## 10. Doc drift register

Do not rewrite these files in this PR. Use this table for a later doc-maintenance pass.

| Document | Stale claim | Reality |
|---|---|---|
| `AGENTS.md` §3–4 | `ui/` package; PGlite; `data/pglite`; UI served from API `:3100` | `apps/landing`; embedded-postgres; `~/.paperclip/...` |
| `AGENTS.md` contract sync | Update `ui` | Update `apps/landing` (+ Workers API when hosted) |
| `README.md` | `ui/` workspace is the admin shell | Admin is `apps/landing/src/admin` |
| `doc/SPEC-implementation.md` §5.2 | Plugins out of scope; adapters `process`/`http` | Plugin host + many adapters exist |
| `doc/SPEC-implementation.md` §4 | “React UI pages” baseline as of 2026-02-17 | Still directionally true, location moved |
| `doc/spec/ui.md` | Vite, HSL, dark default, My Issues, Views | See §9.8 |
| `CLOUDFLARE-MIGRATION.md` | UI: Vite + Express; target Cloudflare Pages | OpenNext `ciutatis-web`; Pages admin removed (doc later notes this) |
| `doc/CLOUDFLARE-ROUTING-ARCHITECTURE.md` | “live public site served from the main `ui` app” | Dispatcher → landing worker |
| `package.json` `dev:admin` / `dev:ui` | Implies admin/UI packages | Both filter `@ciutatis/landing` |
| Plan `doc/plans/2026-02-23-deployment-auth-mode-consolidation.md` | `cloud_hosted` naming | Code uses `authenticated` |

Closer to truth: `doc/DEVELOPING.md`, `doc/DATABASE.md`, `doc/DEPLOYMENT-MODES.md`, `doc/DOCKER.md` (except the image may not build).

---

## 11. Recommended backlog

Not in this PR.

### P0

- Align GitHub default branch and workflow `branches:` filters (`main` vs `master`).
- Gate checkout: `assertCompanyAccess` + conditional `UPDATE ... WHERE status IN (...)` + row count → 409. Implement or delete `assertCheckoutOwner`. Log `issue.checked_out`.
- Restore `scripts/docker-entrypoint.sh` or drop ENTRYPOINT; remove COPY of missing `mcp-server` / `acpx-local` (or restore those packages).
- Add `issues-service` tests for checkout races and cross-company checkout attempts.

### P1

- Add `apps/landing` to `vitest.config.ts` and a `test` script; run it in PR CI.
- Run e2e on a schedule (or on PRs that touch `apps/landing` / `server`).
- Call `release-smoke` from the release pipeline before npm publish.
- Delete or restore the eight missing serialized test files.
- Split or module-map `heartbeat.ts` before adding features there.
- Write a Workers ↔ Express route parity checklist; do not add board features that only exist on one stack without labeling them.

### P2

- Refresh `AGENTS.md` repo map and reset instructions.
- Decide product scope: plugins, Cloudflare multi-tenant, Superparser, civic public site vs AI-company control plane.
- Merge or delete `IssueDetail` / `IssueChatThread` vs `RequestDetail`.
- Route or delete `MyIssues` and `Org`.
- Export `createIssueDetailPath` or stop importing it.
- Replace no-op `lint` with a real linter or remove the script.
- Expand DesignGuide to Kanban, CompanyRail, onboarding, budgets, transcripts.
- Unlock onboarding adapters or document Cloudflare-only as an intentional Ciutatis product decision.
- D1 backup schedule; stop committing to a personal `workers.dev` origin as the only landing origin.

---

## 12. Verification notes for this audit

Ran: repository reads, glob/grep, line counts, existence checks for Docker/CI/test files.  
Did not run: `pnpm test:run`, `pnpm build`, `pnpm -r typecheck`, Playwright, Docker build, wrangler, or any long-lived `pnpm dev`.  
Those commands remain the hand-off DoD for code changes; this PR is documentation only.
