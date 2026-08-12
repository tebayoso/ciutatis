# AGENTS.md

Guidance for human and AI contributors working in this repository.

## 1. Purpose

Ciutatis is a control plane for civic coordination platforms.
The current implementation target is V1 and is defined in `doc/SPEC-implementation.md`.

## 2. Read This First

Before making changes, read in this order:

1. `doc/GOAL.md`
2. `doc/PRODUCT.md`
3. `doc/SPEC-implementation.md`
4. `doc/DEVELOPING.md`
5. `doc/DATABASE.md`

`doc/SPEC.md` is long-horizon product context.
`doc/SPEC-implementation.md` is the concrete V1 build contract.

## 3. Repo Map

- `server/`: Express REST API and orchestration services
- `ui/`: React + Vite board UI
- `packages/db/`: Drizzle schema, migrations, DB clients
- `packages/shared/`: shared types, constants, validators, API path constants
- `doc/`: operational and product docs

## 4. Dev Setup (Auto DB)

Use embedded PGlite in dev by leaving `DATABASE_URL` unset.

```sh
pnpm install
pnpm dev
```

This starts:

- API: `http://localhost:3100`
- UI: `http://localhost:3100` (served by API server in dev middleware mode)

Quick checks:

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

Reset local dev DB:

```sh
rm -rf data/pglite
pnpm dev
```

## 5. Core Engineering Rules

1. Keep changes company-scoped.
Every domain entity should be scoped to a company and company boundaries must be enforced in routes/services.

2. Keep contracts synchronized.
If you change schema/API behavior, update all impacted layers:
- `packages/db` schema and exports
- `packages/shared` types/constants/validators
- `server` routes/services
- `ui` API clients and pages

3. Preserve control-plane invariants.
- Single-assignee task model
- Atomic issue checkout semantics
- Approval gates for governed actions
- Budget hard-stop auto-pause behavior
- Activity logging for mutating actions

4. Do not replace strategic docs wholesale unless asked.
Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

5. Keep plan docs dated and centralized.
New plan documents belong in `doc/plans/` and should use `YYYY-MM-DD-slug.md` filenames.

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Ensure new tables are exported from `packages/db/src/schema/index.ts`
3. Generate migration:

```sh
pnpm db:generate
```

4. Validate compile:

```sh
pnpm -r typecheck
```

Notes:
- `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`
- `pnpm db:generate` compiles `packages/db` first

## 7. Verification Before Hand-off

Run this full check before claiming done:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

If anything cannot be run, explicitly report what was not run and why.

## 8. API and Auth Expectations

- Base path: `/api`
- Board access is treated as full-control operator context
- Agent access uses bearer API keys (`agent_api_keys`), hashed at rest
- Agent keys must not access other companies

When adding endpoints:

- apply company access checks
- enforce actor permissions (board vs agent)
- write activity log entries for mutations
- return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 9. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors

## 10. Definition of Done

A change is done when all are true:

1. Behavior matches `doc/SPEC-implementation.md`
2. Typecheck, tests, and build pass
3. Contracts are synced across db/shared/server/ui
4. Docs updated when behavior or commands change

## Cursor Cloud specific instructions

Environment prerequisites (Node 20+, pnpm 9+) are already provisioned, and the startup update script runs `pnpm install`. Standard commands live in `doc/DEVELOPING.md` and the root `package.json` scripts; the notes below are only the non-obvious caveats for running/testing in this VM.

- Services (both MUST for full-product work):
  - API server + embedded PostgreSQL: `pnpm dev` (watch) serves the REST API on `http://127.0.0.1:3100/api`. No external DB/Docker needed — embedded Postgres auto-starts and persists under `~/.paperclip/instances/default/db`. Health: `curl http://127.0.0.1:3100/api/health`.
  - Web UI (Next.js `apps/landing`): `pnpm dev:landing` on `http://localhost:3000` (public marketing/portal site + admin SPA under `/admin`).
- Non-obvious API/UI wiring caveat: the browser UI (public pages and the `/admin` SPA) calls the API via a relative same-origin `/api`. There is no local `/api` proxy in `apps/landing`, and the Express server sends no CORS headers, so a browser on `:3000` cannot reach the API on `:3100`. Same-origin `/api` only exists in production behind the edge dispatcher/worker. To exercise API/back-end behavior locally, hit the Express server directly on `:3100` (curl or the `pnpm paperclipai` CLI), or drop a prebuilt static bundle at `server/ui-dist` to have the API server serve a same-origin UI. `pnpm dev` runs API-only when `server/ui-dist` is absent (logs "UI dist not found").
- `main` is NOT CI-gated: the `pr-verify`/`e2e` GitHub workflows target `master`, so nothing runs them on `main`. As a result the current `main` tip can (and does) carry pre-existing failures in the strict verification suite even though dev mode runs fine:
  - `pnpm -r typecheck` and `pnpm build` currently fail on real source-level type errors (e.g. `server/src/services/public-portal.ts` builds a `PublicPlaceSummary` without the required `latitude/longitude/osmType/osmId`, plus type errors under `apps/landing/src/admin`).
  - `pnpm test:run` runs suites sequentially and hard-stops on the first failing project; a pre-existing tar round-trip test in `packages/adapters/cursor-local/src/server/execute.test.ts` fails deterministically and aborts the aggregate. Individual suites (shared, db, adapter-utils, server + embedded-PG, etc.) do pass.
  - Dev mode uses `tsx`, so `pnpm dev` runs regardless of these `tsc`/build failures. Do not assume a red typecheck/build/test means a broken environment — verify against `main` before attributing failures to your change.
- Reset local dev DB: `rm -rf ~/.paperclip/instances/default/db` then restart `pnpm dev`.
