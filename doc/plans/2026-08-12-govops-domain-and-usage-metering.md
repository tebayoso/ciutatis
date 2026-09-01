# GovOps Control Plane — Domain Objects and Usage Metering

Status: Draft chapters for the full GovOps control-plane spec  
Date: 2026-08-12  
Audience: Product, engineering, platform ops, civic data warehouse consumers  
Source inputs: current monorepo (`packages/db`, `packages/db-cloudflare`, `packages/shared`, `server/`, `workers/api`, `apps/landing`), `doc/SPEC-implementation.md`, `doc/DEPLOYMENT-MODES.md`, `doc/plans/2026-03-14-billing-ledger-and-reporting.md`, `doc/plans/2026-03-14-budget-policies-and-enforcement.md`

These chapters are additive. They do not replace `doc/SPEC.md` or `doc/SPEC-implementation.md`. Control-plane invariants in `doc/SPEC-implementation.md` §3, §8, §10.4.1, §13, and §16 remain **REQUIRED**. Civic vocabulary is the operator-facing language; physical Postgres/SQLite table names stay Paperclip names until Phase 4.

---

## Locked TO-BE decisions

| Decision | Lock |
|---|---|
| Control-plane invariants | Single assignee, atomic checkout, approval gates, heartbeat invoke/status/cancel, budget hard-stop auto-pause, activity log on mutations |
| Civic vocabulary | Institution / request / objective / channel. Channel is the operator name for an **agent** (`agents` row). Do not invent a `channels` table. |
| Government | First-class billing and usage parent. Usage rolls up by `government_id`. |
| Warehouse export | Aggregated `usage_daily` only. No secrets, no PII, no transcripts, no key hashes. |
| Board UI | Compact government/institution board. Platform pages stay under `/instance/settings/*`. |
| Dual runtime | Hosted civic SaaS = Cloudflare Workers + D1. Self-host = Express + Postgres/PGlite. Shared contract in `packages/shared`. **No silent subset.** |

---

## 1. Domain objects and physical table map

### 1.1 Vocabulary

TypeScript already uses civic names with Paperclip aliases. Physical tables do not.

| Civic name (TO-BE) | TS export | Physical table | FK column today | Notes |
|---|---|---|---|---|
| Government | **new** `Government` | **new** `governments` | **new** `government_id` | Does not exist anywhere in the repo today (`government_id` / `governmentId` grep is empty). |
| Institution | `Institution` (`Company` alias) | `companies` | `company_id` | `packages/db/src/schema/institutions.ts` defines `institutions = pgTable("companies", …)`; `companies.ts` re-exports it. |
| Request | `Request` (`Issue` alias) | `issues` | `issue_id` | `packages/db/src/schema/requests.ts` → `pgTable("issues", …)`. |
| Objective | `Objective` (`Goal` alias) | `goals` | `goal_id` | `packages/db/src/schema/objectives.ts` → `pgTable("goals", …)`. |
| Channel | **alias of** `Agent` | `agents` | `agent_id` | Marketing copy in `apps/landing/src/admin/pages/GovOpsPage.tsx` already calls agents “channels”. No separate table. |
| Project | `Project` | `projects` | `project_id` | Unchanged. Institution-scoped work container. |
| Approval | `Approval` | `approvals` | — | Governed actions. Link table physical name `issue_approvals`. |
| Heartbeat run | `HeartbeatRun` | `heartbeat_runs` | `heartbeat_run_id` | Invocation record. |
| Cost event | `CostEvent` | `cost_events` | — | Metered inference/token spend. |
| Finance event | `FinanceEvent` | `finance_events` | — | Non-inference ledger (fees, credits, adjustments). |
| Budget policy | `BudgetPolicy` | `budget_policies` | — | Soft warn + hard stop. |
| Budget incident | `BudgetIncident` | `budget_incidents` | — | Open/resolved/dismissed threshold crossings. |
| Activity | `ActivityLogEntry` | `activity_log` | — | Mutation audit. |
| Tenant instance | `TenantInstance` | `tenant_instances` | — | **Platform deployment unit** (D1/KV/R2, hostname, path prefix). Not a billing key. Maps 1:1 to a government in hosted SaaS. |
| Geo entity | Cloudflare-only | `geo_entities` | — | `packages/db-cloudflare/src/schema/geo_entities.ts`. Not in Postgres `packages/db`. Hosted-only until Phase 3 copies or explicitly annotates. |
| Public request | `PublicRequest` | `public_requests` | `issue_id` | Citizen portal overlay on a board request. |
| Public contribution | Cloudflare-only | `public_contributions` | — | Collaborate uploads. Hosted-only. |

Shared path aliases already exist in `packages/shared/src/api.ts`:

- `API.institutions` = `API.companies` = `/api/companies`
- `API.requests` = `API.issues` = `/api/issues`
- `API.objectives` = `API.goals` = `/api/goals`

Workers additionally mount `/api/institutions` as a real alias (`workers/api/src/app.ts`). Express mounts only `/api/companies` (`server/src/app.ts`).

### 1.2 Tenancy stack (TO-BE)

```
government                    billing + usage parent (new)
  └── institution             work tenancy (physical: companies)
        ├── channel           AI workforce unit (physical: agents)
        ├── objective         civic goal (physical: goals)
        ├── project           work container
        └── request           unit of work (physical: issues)
              └── public_request   citizen-facing overlay (optional)

tenant_instance               platform deploy (D1/KV/R2, routing)
  └── government.tenant_instance_id   hosted SaaS link (nullable on self-host)
```

Rules:

- Every work entity stays **institution-scoped** (`company_id` until Phase 4).
- Every usage row is also **government-scoped** (`government_id`, required after backfill).
- A government may own many institutions (departments). A hosted tenant instance owns exactly one government.
- Self-host creates one local government with `tenant_instance_id` null.
- Agent API keys remain hashed on `agent_api_keys` and cannot cross `company_id`. After government lands, keys still cannot cross institution; they inherit government via the institution row.

### 1.3 Physical tables — AS-IS columns (Postgres `packages/db`)

Column names below are the SQL names. Sources are the Drizzle files cited.

#### `companies` (TS: `institutions`) — `packages/db/src/schema/institutions.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `name` | text not null | |
| `description` | text | |
| `status` | text not null default `active` | `active \| paused \| archived` (`INSTITUTION_STATUSES`) |
| `pause_reason` | text | |
| `paused_at` | timestamptz | |
| `issue_prefix` | text not null default `PAP` | unique |
| `issue_counter` | int not null default 0 | |
| `budget_monthly_cents` | int not null default 0 | legacy monthly cap; policies are the enforcement source of truth |
| `spent_monthly_cents` | int not null default 0 | denormalized month spend |
| `require_board_approval_for_new_agents` | boolean not null default true | |
| `brand_color` | text | |
| `created_at`, `updated_at` | timestamptz | |

**TO-BE add:** `government_id uuid not null` FK `governments.id` (nullable only during backfill window). Index `companies_government_id_idx`.

#### `issues` (TS: `requests`) — `packages/db/src/schema/requests.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `company_id` | uuid not null | institution |
| `project_id` | uuid | |
| `project_workspace_id` | uuid | |
| `goal_id` | uuid | objective |
| `parent_id` | uuid | request tree |
| `title` | text not null | |
| `description` | text | |
| `status` | text not null default `backlog` | `backlog \| todo \| in_progress \| in_review \| done \| blocked \| cancelled` |
| `priority` | text not null default `medium` | `critical \| high \| medium \| low` |
| `assignee_agent_id` | uuid | **single assignee** (channel) |
| `assignee_user_id` | text | human assignee; rare |
| `checkout_run_id` | uuid | FK `heartbeat_runs`; lock owner |
| `execution_run_id` | uuid | |
| `execution_agent_name_key` | text | |
| `execution_locked_at` | timestamptz | |
| `created_by_agent_id` | uuid | |
| `created_by_user_id` | text | |
| `issue_number` | int | |
| `identifier` | text unique | e.g. `PAP-12` |
| `request_depth` | int not null default 0 | |
| `billing_code` | text | |
| `assignee_adapter_overrides` | jsonb | **never warehouse-export** |
| `execution_workspace_id` | uuid | |
| `execution_workspace_preference` | text | |
| `execution_workspace_settings` | jsonb | **never warehouse-export** |
| `started_at`, `completed_at`, `cancelled_at`, `hidden_at` | timestamptz | |
| unused upstream monitor/origin columns | various | keep for type compat; not civic product |

#### `goals` (TS: `objectives`) — `packages/db/src/schema/objectives.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `company_id` | uuid not null | |
| `title` | text not null | |
| `description` | text | |
| `level` | text not null default `task` | `company \| team \| agent \| task` (enum still company-named in `OBJECTIVE_LEVELS`) |
| `status` | text not null default `planned` | `planned \| active \| achieved \| cancelled` |
| `parent_id` | uuid | |
| `owner_agent_id` | uuid | owning channel |
| `created_at`, `updated_at` | timestamptz | |

#### `agents` (civic: Channel) — `packages/db/src/schema/agents.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | channel id |
| `company_id` | uuid not null | |
| `name` | text not null | |
| `role` | text not null default `general` | |
| `title` | text | |
| `icon` | text | |
| `status` | text not null default `idle` | `active \| paused \| idle \| running \| error \| pending_approval \| terminated` |
| `reports_to` | uuid | org tree |
| `capabilities` | text | |
| `adapter_type` | text not null default `process` | |
| `adapter_config` | jsonb not null default `{}` | **secret-bearing; never export** |
| `runtime_config` | jsonb not null default `{}` | **never export raw** |
| `default_environment_id` | uuid | Postgres-only environments table |
| `budget_monthly_cents`, `spent_monthly_cents` | int | |
| `pause_reason`, `paused_at` | text / timestamptz | |
| `permissions` | jsonb not null default `{}` | |
| `last_heartbeat_at` | timestamptz | |
| `metadata` | jsonb | **never warehouse-export raw** |
| `created_at`, `updated_at` | timestamptz | |

#### `agent_api_keys` — `packages/db/src/schema/agent_api_keys.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `agent_id` | uuid not null | |
| `company_id` | uuid not null | |
| `name` | text not null | |
| `key_hash` | text not null | SHA-256 hex of bearer token |
| `last_used_at`, `revoked_at` | timestamptz | |
| `created_at` | timestamptz | |

Plaintext token is returned **once** on create. Never stored. Never exported.

#### `projects` — `packages/db/src/schema/projects.ts`

`id`, `company_id`, `goal_id`, `name`, `description`, `status` default `backlog`, `lead_agent_id`, `target_date`, `color`, `pause_reason`, `paused_at`, `execution_workspace_policy` jsonb, `env` jsonb (**never export**), `archived_at`, timestamps.

#### `approvals` — `packages/db/src/schema/approvals.ts`

`id`, `company_id`, `type` (`hire_agent \| approve_ceo_strategy \| budget_override_required \| request_board_approval`), `requested_by_agent_id`, `requested_by_user_id`, `status` (`pending \| revision_requested \| approved \| rejected \| cancelled`), `payload` jsonb, `decision_note`, `decided_by_user_id`, `decided_at`, timestamps.

Link: `issue_approvals` (`packages/db/src/schema/request_approvals.ts`). Comments: `approval_comments`.

#### `heartbeat_runs` — `packages/db/src/schema/heartbeat_runs.ts`

`id`, `company_id`, `agent_id`, `invocation_source` (`timer \| assignment \| on_demand \| automation`), `trigger_detail`, `status` (`queued \| running \| succeeded \| failed \| cancelled \| timed_out`), `started_at`, `finished_at`, `error`, `wakeup_request_id`, `exit_code`, `signal`, `usage_json`, `result_json`, session ids, `log_store`, `log_ref`, `log_bytes`, `log_sha256`, `log_compressed`, `stdout_excerpt`, `stderr_excerpt`, `error_code`, `external_run_id`, `context_snapshot`, liveness fields, continuation, plus unused upstream process/retry columns.

Related: `heartbeat_run_events`, `heartbeat_run_watchdog_decisions` (Postgres only), `agent_wakeup_requests`, `agent_runtime_state`, `agent_task_sessions`, `agent_config_revisions`.

**TO-BE optional denorm:** `government_id` on `heartbeat_runs` for cheaper government run counts. Not required if `usage_daily.run_count` is derived via join `heartbeat_runs.company_id → companies.government_id`.

#### `cost_events` — `packages/db/src/schema/cost_events.ts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `company_id` | uuid not null | institution |
| `agent_id` | uuid not null | channel (required today) |
| `issue_id` | uuid | request |
| `project_id` | uuid | |
| `goal_id` | uuid | objective |
| `heartbeat_run_id` | uuid | |
| `billing_code` | text | |
| `provider` | text not null | model vendor |
| `biller` | text not null default `unknown` | who invoices |
| `billing_type` | text not null default `unknown` | `metered_api \| subscription_included \| subscription_overage \| credits \| fixed \| unknown` |
| `model` | text not null | |
| `input_tokens` | int not null default 0 | |
| `cached_input_tokens` | int not null default 0 | |
| `output_tokens` | int not null default 0 | |
| `cost_cents` | int not null | |
| `occurred_at` | timestamptz not null | |
| `created_at` | timestamptz not null | |

Indexes today: `(company_id, occurred_at)`, `(company_id, agent_id, occurred_at)`, `(company_id, provider, occurred_at)`, `(company_id, biller, occurred_at)`, `(company_id, heartbeat_run_id)`.

**TO-BE add:** `government_id uuid not null` FK `governments.id`. Index `cost_events_government_occurred_idx` on `(government_id, occurred_at)`. Keep `company_id`. API JSON may expose `institutionId` as an alias of `companyId` without renaming the column in Phase 2.

D1 copy: `packages/db-cloudflare/src/schema/cost_events.ts` (text ids, ISO text timestamps). Same columns. Same `government_id` add.

#### `finance_events` — `packages/db/src/schema/finance_events.ts`

`id`, `company_id`, optional `agent_id` / `issue_id` / `project_id` / `goal_id` / `heartbeat_run_id` / `cost_event_id`, `billing_code`, `description`, `event_kind` (`inference_charge \| platform_fee \| credit_purchase \| credit_refund \| credit_expiry \| byok_fee \| gateway_overhead \| log_storage_charge \| logpush_charge \| provisioned_capacity_charge \| training_charge \| custom_model_import_charge \| custom_model_storage_charge \| manual_adjustment`), `direction` (`debit \| credit`), `biller`, `provider`, `execution_adapter_type`, `pricing_tier`, `region`, `model`, `quantity`, `unit`, `amount_cents`, `currency` default `USD`, `estimated` boolean, `external_invoice_id`, `metadata_json` (**never warehouse-export raw**), `occurred_at`, `created_at`.

**TO-BE add:** `government_id uuid not null`. Index `finance_events_government_occurred_idx`.

#### `budget_policies` — `packages/db/src/schema/budget_policies.ts`

`id`, `company_id`, `scope_type` (`company \| agent \| project` today), `scope_id`, `metric` default `billed_cents`, `window_kind` (`calendar_month_utc \| lifetime`), `amount`, `warn_percent` default 80, `hard_stop_enabled` default true, `notify_enabled`, `is_active`, `created_by_user_id`, `updated_by_user_id`, timestamps.

Unique: `(company_id, scope_type, scope_id, metric, window_kind)`.

**TO-BE:** extend `BUDGET_SCOPE_TYPES` in `packages/shared/src/constants.ts` with `government`. For `scope_type=government`, `scope_id` = `governments.id` and `company_id` is the **primary institution of the acting board** or a dedicated platform-policy sentinel institution — see §4.3. Prefer a dedicated `government_id` column on the policy row so government quotas do not overload `company_id`. Add `government_id uuid` (nullable for legacy institution/agent/project policies; required for `scope_type=government`). Extend `BUDGET_METRICS` with `token_count` and `run_count` in addition to `billed_cents`.

#### `budget_incidents` — `packages/db/src/schema/budget_incidents.ts`

`id`, `company_id`, `policy_id`, `scope_type`, `scope_id`, `metric`, `window_kind`, `window_start`, `window_end`, `threshold_type` (`soft \| hard`), `amount_limit`, `amount_observed`, `status` (`open \| resolved \| dismissed`), `approval_id`, `resolved_at`, timestamps.

**TO-BE add:** `government_id uuid`.

#### `activity_log` — `packages/db/src/schema/activity_log.ts`

`id`, `company_id`, `actor_type`, `actor_id`, `action`, `entity_type`, `entity_id`, `agent_id`, `run_id`, `details` jsonb, `created_at`.

**TO-BE optional:** `government_id` for platform-wide audit queries. `details` must be redacted before any export; default is **do not export** this table to the warehouse.

#### `public_requests` — `packages/db/src/schema/public_requests.ts`

`id`, `issue_id`, `company_id`, `public_id`, `institution_slug`, `submission_mode`, `owner_user_id`, `contact_name`, `contact_email`, `recovery_token_hash`, `category`, `location_label`, `public_title`, `public_summary`, `public_description`, `public_status` default `received` (`received \| triage \| routed \| in_progress \| waiting_on_city \| resolved \| closed`), `pii_detected`, timestamps.

**Never warehouse-export:** `contact_name`, `contact_email`, `recovery_token_hash`, `owner_user_id`.

#### `tenant_instances` — `packages/db/src/schema/tenant_instances.ts`

Municipality deployment: `id`, `name`, `municipality_name`, `country_code`, `jurisdiction_type` default `municipio`, `postal_code`, `city_slug`, `short_code`, `parent_subdivision_code`, `parent_subdivision_name`, `routing_mode`, `status`, `path_prefix`, `dispatcher_key`, `hostname`, `worker_name`, `dispatch_script_name`, `tenant_d1_database_id`, `tenant_d1_database_name`, `tenant_kv_namespace_id`, `tenant_kv_namespace_title`, `tenant_r2_bucket_name`, `bootstrap_status`, deployment timestamps/error, `notes`, timestamps.

This is **not** `government`. It is the Cloudflare tenancy record. `governments.tenant_instance_id` points here when hosted.

#### Secrets — `company_secrets` / `company_secret_versions`

`packages/db/src/schema/institution_secrets.ts` and `institution_secret_versions.ts`. Versions store encrypted `material` jsonb and `value_sha256`. **Never export. Never put on usage_daily.**

#### Auth / membership

Better Auth: `user`, `session`, `account`, `verification`. Memberships: `company_memberships` (`institution_memberships.ts`). Also `principal_permission_grants`, `invites` (`token_hash`), `join_requests` (`claim_secret_hash`), `instance_user_roles`, `instance_settings`.

#### Other institution-scoped tables (keep; not usage-metered)

labels / `issue_labels`, assets, documents / `document_revisions` / `issue_documents`, attachments, work products, read states, `project_goals`, `project_workspaces`, `execution_workspaces`, `environments`, `environment_leases` (Postgres), `workspace_operations`, `workspace_runtime_services`, `issue_tree_holds` + members (Postgres), `issue_reference_mentions` (Postgres), stub relation/thread/inbox/skills tables, `email_drafts`, plugins + plugin_* tables, `company_logos`.

### 1.4 New table: `governments`

Create in both `packages/db` and `packages/db-cloudflare`.

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid pk | |
| `tenant_instance_id` | uuid | FK `tenant_instances.id`, unique, **nullable** (self-host) |
| `name` | text not null | display name, usually `municipality_name` |
| `country_code` | text not null | ISO 3166-1 alpha-2 |
| `jurisdiction_type` | text not null | copy from tenant (`municipio`, etc.) |
| `status` | text not null default `active` | `active \| paused \| archived` |
| `created_at` | timestamptz not null | |
| `updated_at` | timestamptz not null | |

Indexes: unique `tenant_instance_id` where not null; `(country_code, status)`.

Backfill:

1. Hosted: one `governments` row per `tenant_instances` row (`name = municipality_name`, copy `country_code` / `jurisdiction_type`).
2. Self-host with no tenants: insert one row `name = 'Local government'`, `country_code = 'XX'`, `jurisdiction_type = 'self_host'`, `tenant_instance_id` null.
3. Stamp `companies.government_id` from the tenant that owns the institution, or the single local government.
4. Stamp `cost_events.government_id` and `finance_events.government_id` from `companies.government_id`.
5. Fail closed: after backfill, `government_id` is NOT NULL on cost/finance rows.

### 1.5 New table: `usage_daily`

Materialized nightly (and on-demand rebuild) from `cost_events` + `finance_events`. Warehouse-safe. Same schema on Postgres and D1.

See §4.5 for columns, uniqueness, and the export allowlist.

### 1.6 Dual-schema gap (must not stay silent)

Postgres-only today (`packages/db`, missing from `packages/db-cloudflare`):

- `environments`, `environment_leases`
- `issue_tree_holds`, `issue_tree_hold_members`
- `heartbeat_run_watchdog_decisions`
- `plugin_managed_resources`, `plugin_database_namespaces` / `plugin_migrations`
- `issue_reference_mentions`

D1-only today:

- `geo_entities`
- `public_contributions`

Phase 3 must either implement the missing tables on both runtimes or mark the feature `hosted-only` / `selfhost-only` in `packages/shared` with a non-empty error body (never `[]` / 404 that looks like “no data”).

---

## 2. Invariants and current code gaps

Required behavior is the V1 contract in `doc/SPEC-implementation.md`. Gaps are measured against **current code**, not against docs.

### 2.1 Single assignee

**Required:** one `assignee_agent_id` per request. No multi-assignee.

**AS-IS:** schema is a single UUID column (`packages/db/src/schema/requests.ts`). Org tree is `agents.reports_to` (strict tree).

**Gap:** checkout can overwrite `assignee_agent_id` without a conflict predicate (see §2.2). Single-column schema is not enough if the write is unconditional.

### 2.2 Atomic checkout — REQUIRED, currently broken on both runtimes

**Required** (`doc/SPEC-implementation.md` §10.4.1):

`POST /api/issues/:issueId/checkout` body (`packages/shared/src/validators/request.ts` `checkoutRequestSchema`):

```json
{
  "agentId": "uuid",
  "expectedStatuses": ["todo", "backlog", "blocked"]
}
```

Server:

1. Single SQL `UPDATE … WHERE id = :id AND status IN (:expectedStatuses) AND (assignee_agent_id IS NULL OR assignee_agent_id = :agentId)`.
2. Zero rows → `409` with current owner/status.
3. Success sets `assignee_agent_id`, `status = in_progress`, `started_at`, and `checkout_run_id`.

**Express gap (P0):**

- `server/src/services/requestService.ts` `checkout` (lines 254–261): `UPDATE issues SET assignee_agent_id, checkout_run_id, status='in_progress' WHERE id = :issueId` only. `_statuses` is ignored. No assignee predicate. No row-count check.
- `assertCheckoutOwner` is a no-op returning `{ adoptedFromRunId: null }`.
- `server/src/routes/issues.ts` `POST /issues/:id/checkout` (lines 712–716): `loadIssueOr404` then `issues.checkout(...)`. **Does not call `assertCompanyAccess`.** Neighbor `POST /issues/:id/release` uses `assertCanMutateIssue`, which does. Heartbeat auto-checkout at `server/src/services/heartbeat.ts` ~6750 calls the same non-atomic service with `expectedStatuses ["todo","backlog","blocked"]` that the service ignores.
- Express checkout does **not** write `activity_log`.

**Workers gap (P0 race, authz closer):**

- `workers/api/src/routes/requests.ts` `POST /issues/:id/checkout` (lines 515–551): **does** `assertCompanyAccess`. Then JS read of `checkoutRunId` and `status`, then unconditional `UPDATE … WHERE id = :issueId`. Two concurrent checkouts can both pass the read and both write. Default `expectedStatuses` is `["backlog","todo","in_progress"]` (spec default is `todo,backlog,blocked`). Success does **not** force `status = in_progress`; backlog becomes `todo`, other statuses stay. Requires `runId` from the actor (`X-Paperclip-Run-Id`); board checkout without a run fails `400`.
- Workers **does** log `issue.checked_out`.

**Fix (both runtimes, same tests):** one parameterized UPDATE with the spec WHERE clause; `409` on 0 rows; `assertCompanyAccess` on Express; activity `issue.checked_out`; concurrent test: two checkouts → one 200, one 409.

### 2.3 Approvals

**Required:** hire, CEO strategy, budget override, board-requested approval. Board approve/reject. Activity on decision.

**AS-IS:** tables and routes exist on Express (`server/src/routes` approval module) and Workers (`workers/api/src/routes/approvals.ts`: list/create, approve/reject/request-revision/resubmit, comments). Inbox surfaces pending approvals (`apps/landing/src/admin/pages/Inbox.tsx`). Dedicated pages `/approvals/pending|all/:id` exist in `App.tsx` but are **not** in `Sidebar.tsx`.

**Gap:** none that voids the invariant. Keep Inbox as the compact surface; keep deep links.

### 2.4 Heartbeat

**Required:** invoke / status / cancel; skip when agent or institution is paused or budget-blocked; persist `heartbeat_runs`.

**AS-IS Express:** `server/src/services/heartbeat.ts` is a **9720-line** module (file ends at the service object close ~line 9720). Routes: `POST /api/agents/:id/heartbeat/invoke`, `POST /api/agents/:id/wakeup`, `GET /api/companies/:companyId/heartbeat-runs`, `GET /api/heartbeat-runs/:runId`, `POST /api/heartbeat-runs/:runId/cancel`, events/log/workspace-operations, watchdog-decisions. Consults `budgets.getInvocationBlock` in multiple invoke paths.

**AS-IS Workers:** `workers/api/src/lib/hosted-heartbeats.ts` (~800 lines) runs Workers AI via `@ciutatis/adapter-cloudflare-workers-ai`. Routes in `workers/api/src/routes/agents.ts`: invoke, list runs, get, cancel, events, log. No process/CLI adapters.

**Lock:** do **not** port the 9720-line module to Workers. Extract a small shared contract (checkout, budget block, wakeup queue, run status machine) into a package both runtimes call. Process adapters stay Express/self-host only (`selfhost-only`). Hosted uses queue + Workers AI (`hosted-only` adapter type `cloudflare_workers_ai`).

### 2.5 Budget hard-stop

**Required** (`SPEC-implementation.md` §13.2): 80% soft warn; at 100% pause the scope, block new checkout/invocation, emit high-priority activity (`budget.hard_threshold_crossed`). Board may raise budget or resume.

**AS-IS Express:** `server/src/services/budgets.ts` implements `hardStopEnabled`, `pauseAndCancelScopeForBudget`, `getInvocationBlock`. Cost ingest in `server/src/services/costs.ts` calls `budgets.evaluateCostEvent(event)` after insert. Heartbeat consults `getInvocationBlock`.

**AS-IS Workers:** `GET /api/companies/:companyId/budgets/overview` returns `policies: []`, `activeIncidents: []` (`workers/api/src/routes/costs.ts` ~431–456). `GET …/costs/quota-windows` returns `[]`. There is **no** `POST …/budgets/policies`. Cost ingest (`POST …/cost-events`) inserts the row, logs `cost.reported`, and **does not** evaluate policies or pause anyone.

**Gap:** hosted civic SaaS currently has **no hard-stop**. That is a silent subset of the REQUIRED invariant. Phase 0 must implement evaluate-on-ingest on Workers or fail closed (reject cost ingest / block invoke when policies cannot be evaluated). Empty `policies: []` is forbidden once a government has a budget.

### 2.6 Activity log

**Required:** every mutation writes `activity_log` (`SPEC-implementation.md` §15.3).

**Gaps:**

- Express checkout: no log.
- Workers finance-events POST (`workers/api/src/routes/costs.ts` ~97–115): insert only, no `logActivity`.
- Express cost-events and most board mutations do log.

### 2.7 Company / institution boundary

**Required:** every entity scoped; `assertCompanyAccess`; agent keys cannot cross company (`server/src/routes/authz.ts`).

**Gap:** Express checkout skips the check. Instance admins and `local_implicit` board bypass company allowlists by design — acceptable only when `local_trusted` is loopback (see §7).

### 2.8 Key hashing

**Required:** store only hashed agent API keys (`SPEC-implementation.md` §16).

**AS-IS:** SHA-256 hex. Express `server/src/middleware/auth.ts` `hashToken`. Workers `workers/api/src/lib/crypto.ts` WebCrypto SHA-256. Acceptable for high-entropy bearer tokens. Do not switch to bcrypt/argon2 for these tokens. Never warehouse-export `key_hash`.

### 2.9 Silent subset inventory (contract violations)

| # | Symptom | Express | Workers | Required close |
|---|---|---|---|---|
| 1 | Atomic checkout | Unconditional UPDATE; no company access | JS check then unconditional UPDATE | Both: SQL predicate + 409 |
| 2 | Objectives API | `server/src/routes/objectives.ts` exists, **not mounted** in `server/src/app.ts` | `objectiveRoutes` mounted | Mount Express `objectiveRoutes` |
| 3 | `/api/institutions` alias | Missing (only `/api/companies`) | Mounted | Mount alias on Express |
| 4 | `server/src/routes/requests.ts` | Stub 404 “Request system not available” | Real `requestRoutes` on `/issues` | Do not mount the stub; keep `issueRoutes` as the implementation; add `/api/requests` alias that hits the same handlers |
| 5 | Budget overview / policies / hard-stop | Real | Stub empty arrays; no policy POST; no evaluate on ingest | Implement or fail closed |
| 6 | Provider `quota-windows` | Real scrape (`server/src/services/quota-windows.ts`) | Always `[]` | Annotate `selfhost-only` **or** implement; civic quotas are `budget_policies` (§4.3), not provider scrape |
| 7 | Plugins | Real | `workers/api/src/routes/plugins.ts` stubs (`c.json([])` / “not available”) | Annotate `selfhost-only` until hosted plugins exist |
| 8 | Geo search | No `/api/public/geo/*` | `GET /api/public/geo/search`, `/geo/by-path`, `/geo/children` | Annotate `hosted-only` |
| 9 | Environments / tree holds / watchdog | Present | Tables missing | Annotate or port |
| 10 | `local_trusted` on a public Worker | Loopback + private enforced in `server/src/index.ts` | Default `DEPLOYMENT_MODE` is `local_trusted` (`workers/api/src/middleware/auth.ts`) → implicit board on whatever host | Forbid for civic SaaS |

---

## 3. Board pages: stay vs platform-only vs delete

UI lives in `apps/landing/src/admin/` (not `ui/`). Router: `apps/landing/src/admin/App.tsx`. Government/institution nav: `Sidebar.tsx`. Platform nav: `InstanceSidebar.tsx`. Board routes are prefixed by `:companyPrefix` (institution issue prefix).

Compact board rule: civic labels already in the sidebar (New Request, Requests, Objectives, Institution). Do not add My Issues. Approvals stay in Inbox plus deep links.

### 3.1 Stay — government / institution board (compact)

| Route | Page | Role |
|---|---|---|
| `/dashboard` | `Dashboard` | Live runs + counts |
| `/inbox/recent`, `/inbox/unread`, `/inbox/all` | `Inbox` | Approvals + failed runs. Canonical governance inbox. |
| `/requests`, `/requests/:issueId` | `Requests`, `RequestDetail` | Canonical request list/detail |
| `/issues`, `/issues/:issueId` | redirects to requests / `RequestDetail` | Keep redirects until Phase 4 |
| `/objectives`, `/objectives/:goalId` | `Objectives`, `ObjectiveDetail` | Civic goals |
| `/projects`, `/projects/:projectId` and tabs including `/budget` | `Projects`, `ProjectDetail` | Work containers |
| `/agents/all\|active\|paused\|error`, `/agents/new`, `/agents/:agentId` (+ tabs, runs) | `Agents`, `NewAgent`, `AgentDetail` | Channels |
| `/org` | `OrgChart` | Channel org tree |
| `/costs` | `Costs` | **Must become government rollup first**, channel/project as drill-down (today the page is “By agent” / “By project” — `Costs.tsx` ~719, ~807) |
| `/activity` | `Activity` | Institution audit stream |
| `/institution/settings`, `/institution/settings/environments` | `InstitutionSettings`, `CompanyEnvironments` | Institution config |
| `/search` | `Search` | |
| `/workspaces` | `Workspaces` | Behind experimental `enableIsolatedWorkspaces` |
| `/approvals/pending`, `/approvals/all`, `/approvals/:approvalId` | `Approvals`, `ApprovalDetail` | Keep as Inbox deep links; do not add a sidebar item |
| `/execution-workspaces/:workspaceId` | `ExecutionWorkspaceDetail` | Deep link from runs |
| `/users/:userSlug` | `UserProfile` | Board user |
| `/onboarding` | `OnboardingRoutePage` | First-run |
| `/institutions` | `Institutions` | Institution picker/create (board, not platform tenants) |

Legacy redirects to keep until Phase 4, then delete: `/company/settings` → `/institution/settings`.

### 3.2 Platform-only — `/instance/settings/*`

Nav in `InstanceSidebar.tsx`. These are **not** government operator pages.

| Route | Page | Role |
|---|---|---|
| `/instance/settings/overview` | `InstanceAdminOverview` | Control panel |
| `/instance/settings/heartbeats` | `InstanceSettings` | Scheduler heartbeats |
| `/instance/settings/tenants` | `InstanceTenants` | Municipality D1/KV/R2 provisioning (`tenant_instances`) |
| `/instance/settings/cloudflare` | `InstanceCloudflareSettings` | Cloudflare credentials |
| `/instance/settings/experimental` | `InstanceExperimentalSettings` | Flags |
| `/instance/settings/plugins`, `/instance/settings/plugins/:pluginId` | `PluginManager`, `PluginSettings` | Instance plugins |
| `/design-guide` | `DesignGuide` | Dev showcase; not a civic operator page. Keep routed for engineers; do not put in board or platform sidebar. |

**New platform pages (Phase 2):**

- `/instance/settings/governments` — list governments, link tenant, pause
- `/instance/settings/governments/:governmentId/usage` — `usage_daily` browser + CSV export
- `/instance/settings/governments/:governmentId/invoices` — invoice view

### 3.3 Public (not board)

`PublicSite`, `PublicPortalPage`, `PublicPortalRequestPage`, `GovOpsPage`, `ScrutinyPage`, `AuthPage`, `InviteLandingPage`, `CouncilClaimPage`. Citizen and marketing. No agent keys, no costs ledger, no secrets.

### 3.4 Delete from product surface

| File | Why |
|---|---|
| `apps/landing/src/admin/pages/MyIssues.tsx` | Dead. Not imported in `App.tsx`. Filters unassigned non-terminal issues, labels them “My Issues”, links to `/issues/...`. Civic board already has Requests + Inbox. **Delete the file.** |
| `apps/landing/src/admin/pages/IssueDetail.tsx` | Orphan. Routes use `RequestDetail`. `IssueDetail.test.tsx` still tests the orphan. **Delete the page.** Move still-valid tests onto `RequestDetail` or delete them. Keep `apps/landing/src/admin/lib/issueDetailBreadcrumb.ts` (used by `RequestDetail`, `Requests`, `Inbox`). |
| `apps/landing/src/admin/pages/RunTranscriptUxLab.tsx` | Routed at `tests/ux/runs` (board + unprefixed redirect). Not a civic or platform operator page. **Unroute and delete** from product; keep fixtures only if unit tests need them. |
| `apps/landing/src/admin/pages/IssueChatLongThreadPerf.tsx` | Unrouted. **Delete.** |
| `apps/landing/src/admin/pages/SystemNoticeUxLab.tsx` | Unrouted. **Delete.** |

Do not ship a “My Issues” nav item. Operator work is Requests + Inbox.

---

## 4. Usage schema

Nothing in this section exists as `government_id` today. `CostEvent` in `packages/shared/src/types/cost.ts` has `companyId` + `agentId` only. Costs UI is agent/project spend, not government rollup.

### 4.1 `government_id` on usage rows

Add `government_id uuid not null` (after backfill) to:

| Table | Why |
|---|---|
| `companies` | institution → government |
| `cost_events` | every metered row |
| `finance_events` | every ledger row |
| `budget_policies` | government-scoped quotas; nullable on legacy rows |
| `budget_incidents` | rollup of stops |
| `usage_daily` | warehouse grain |
| `heartbeat_runs` | optional denorm for run_count |

Ingest rule: callers still POST with `companyId`. Server stamps `government_id` from `companies.government_id`. Agents cannot set `government_id`. Reject ingest if the institution has no government (422) after Phase 2 backfill.

Index: `cost_events_government_occurred_idx (government_id, occurred_at)`; `finance_events_government_occurred_idx (government_id, occurred_at)`.

### 4.2 Civic quotas vs provider quota-windows

Today `GET /api/companies/:companyId/costs/quota-windows` returns provider remaining % (`QuotaWindow` in `packages/shared/src/types/quota.ts`: Anthropic/OpenAI windows). Express scrapes providers. Workers returns `[]`.

**Civic quotas are not provider scrape.** They are `budget_policies`:

| Field | Civic quota value |
|---|---|
| `scope_type` | `government` (new), plus existing `company` (institution), `agent` (channel), `project` |
| `scope_id` | `governments.id` / `companies.id` / `agents.id` / `projects.id` |
| `metric` | `billed_cents` (existing), plus `token_count` (`input_tokens + output_tokens + cached_input_tokens`), plus `run_count` (count of `heartbeat_runs` in window) |
| `window_kind` | `calendar_month_utc` or `lifetime` |
| `amount` | integer in metric units (cents, tokens, or runs) |
| `warn_percent` | default 80 |
| `hard_stop_enabled` | default true |

Constants to change: `BUDGET_SCOPE_TYPES` and `BUDGET_METRICS` in `packages/shared/src/constants.ts`; validator `packages/shared/src/validators/budget.ts`.

Provider `quota-windows` may remain as a **selfhost-only** operator convenience on the Costs page, labeled “Provider remaining (adapter)”, never as the government invoice number.

Hard-stop on `scope_type=government`: pause **all** institutions under that government (`companies.status = paused`, `pause_reason` budget), cancel in-flight heartbeat runs in scope, block invoke via `getInvocationBlock` that walks institution → government policies. Activity: `budget.hard_threshold_crossed` with `details.governmentId`.

### 4.3 Invoice views (computed API, not a secrets table)

Do not store payment-card data, API keys, or adapter env on an invoices table. Invoice is a **read model** over `cost_events` (metered) + `finance_events`.

`GET /api/platform/governments/:governmentId/invoices?from=&to=`

Query params: `from`, `to` ISO timestamps, UTC. Default: previous calendar month UTC.

Response item:

| JSON field | Source |
|---|---|
| `governmentId` | path |
| `periodStart` | `from` truncated to UTC day |
| `periodEnd` | `to` |
| `currency` | `USD` unless all finance rows share another ISO code; mixed currency → 422 |
| `usageCostCents` | `sum(cost_events.cost_cents)` where `billing_type = 'metered_api'` |
| `subscriptionIncludedTokens` | sum of tokens where `billing_type = 'subscription_included'` (informational, not added to net) |
| `subscriptionOverageCents` | `sum(cost_cents)` where `billing_type = 'subscription_overage'` |
| `financeDebitCents` | `sum(finance_events.amount_cents)` where `direction = 'debit'` |
| `financeCreditCents` | `sum(amount_cents)` where `direction = 'credit'` |
| `estimatedDebitCents` | debit subset where `estimated = true` |
| `netCents` | `usageCostCents + subscriptionOverageCents + financeDebitCents - financeCreditCents` |
| `runCount` | distinct `heartbeat_run_id` on cost rows in window, plus runs with no cost row if denorm exists |
| `inputTokens`, `outputTokens`, `cachedInputTokens` | sums on `cost_events` |
| `institutionCount` | distinct `company_id` |
| `channelCount` | distinct `agent_id` |
| `externalInvoiceIds` | distinct non-null `finance_events.external_invoice_id` (opaque vendor ids only) |

Never include: API keys, `key_hash`, secret `material`, `adapter_config`, transcripts, `stdout_excerpt` / `stderr_excerpt`, `public_requests.contact_*`, `recovery_token_hash`, `metadata_json` blobs.

Board (government operator, not platform):

- `GET /api/governments/:governmentId/costs/summary?from=&to=`
- `GET /api/governments/:governmentId/costs/by-institution`
- `GET /api/governments/:governmentId/costs/by-channel`

Same numeric fields as institution `CostSummary` / `CostByAgent`, keyed by government. Access: board session whose memberships include at least one institution under that government, or instance admin.

Keep existing institution endpoints:

- `GET /api/companies/:companyId/costs/summary`
- `GET /api/companies/:companyId/costs/by-agent` (channel drill-down)
- `GET /api/companies/:companyId/costs/by-agent-model`
- `GET /api/companies/:companyId/costs/by-provider`
- `GET /api/companies/:companyId/costs/by-biller`
- `GET /api/companies/:companyId/costs/by-project`
- `GET /api/companies/:companyId/costs/window-spend`
- `GET /api/companies/:companyId/costs/finance-summary`
- `GET /api/companies/:companyId/costs/finance-by-biller`
- `GET /api/companies/:companyId/costs/finance-by-kind`
- `GET /api/companies/:companyId/costs/finance-events`
- `GET /api/issues/:id/cost-summary` (Express tree rollup; port or annotate)

### 4.4 Costs UI change

`apps/landing/src/admin/pages/Costs.tsx` today: metric tiles, **By agent**, By project, provider quota cards, finance ledger.

TO-BE default for civic SaaS:

1. Government rollup tiles (net cents, tokens, run count, institution count, channel count, hard-stop incidents).
2. By institution table.
3. By channel (agent) drill-down — keep current “By agent” as this.
4. By project.
5. Finance ledger (institution-scoped still available).
6. Provider quota cards only if the runtime implements quota-windows; otherwise hide (do not show empty “0%” cards from `[]`).

Platform export lives under instance settings, not this page.

### 4.5 `usage_daily` export columns

Physical table `usage_daily`:

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | uuid pk | no | |
| `government_id` | uuid | no | FK `governments.id` |
| `institution_id` | uuid | no | same value as `cost_events.company_id` |
| `day` | date | no | UTC calendar day of `occurred_at` |
| `channel_id` | uuid | yes | `agent_id`; null = unattributed finance |
| `provider` | text | no | `unknown` if finance-only |
| `biller` | text | no | |
| `billing_type` | text | no | `BILLING_TYPES` or `finance` for finance-only grains |
| `model` | text | no | `unknown` if finance-only |
| `input_tokens` | int not null default 0 | | |
| `cached_input_tokens` | int not null default 0 | | |
| `output_tokens` | int not null default 0 | | |
| `cost_cents` | int not null default 0 | | metered + overage cost from `cost_events` |
| `run_count` | int not null default 0 | | distinct `heartbeat_run_id` in the grain |
| `finance_debit_cents` | int not null default 0 | | |
| `finance_credit_cents` | int not null default 0 | | |
| `created_at` | timestamptz | no | row build time |
| `updated_at` | timestamptz | no | |

Unique:

```
(government_id, institution_id, day, channel_id, provider, biller, billing_type, model)
```

Treat SQL NULL `channel_id` as a single bucket (`COALESCE(channel_id, '00000000-0000-0000-0000-000000000000')` in the unique index if the engine needs it).

Nightly job: delete+rebuild or upsert the last 3 UTC days (late cost reports). On-demand: `POST /api/platform/governments/:governmentId/usage-daily/rebuild?from=&to=` instance-admin only.

`GET /api/platform/governments/:governmentId/usage-daily?from=&to=&format=json|csv`

CSV column order (allowlist — this is the warehouse contract):

```
government_id,institution_id,day,channel_id,provider,biller,billing_type,model,input_tokens,cached_input_tokens,output_tokens,cost_cents,run_count,finance_debit_cents,finance_credit_cents
```

**Exclude from the feed (explicit denylist):**

- `agent_api_keys.*` including `key_hash`
- `company_secrets.*`, `company_secret_versions.material`, `value_sha256`
- `agents.adapter_config`, `runtime_config`, `metadata`
- `projects.env`
- `heartbeat_runs.stdout_excerpt`, `stderr_excerpt`, `log_ref` bodies, `context_snapshot`, `usage_json` raw, `result_json` raw
- `activity_log.details`
- `finance_events.metadata_json`
- `public_requests.contact_name`, `contact_email`, `recovery_token_hash`, `owner_user_id`
- `invites.token_hash`, `join_requests.claim_secret_hash`
- session tokens, Better Auth `account` tokens
- request titles/descriptions, comments, documents, attachments
- tenant Cloudflare resource ids (`tenant_d1_database_id`, KV/R2 ids) — those are platform ops, not civic usage

### 4.6 Ingest paths (unchanged URLs, new stamp)

- `POST /api/companies/:companyId/cost-events` — board or agent (own `agentId` only). Validate `createCostEventSchema`. Stamp `government_id`. Then `evaluateCostEvent` including government policies. Activity `cost.reported`.
- `POST /api/companies/:companyId/finance-events` — board only. Stamp `government_id`. Activity `finance.recorded`.

Agent cannot POST finance events. Agent cannot set government budgets.

---

## 5. API groups

Base path `/api`. Dual-write aliases until Phase 4: `/api/companies` ≡ `/api/institutions`, `/api/issues` ≡ `/api/requests`, `/api/goals` ≡ `/api/objectives`. Civic names are canonical in this spec; old paths stay implemented.

Error semantics stay `400/401/403/404/409/422/500` (`SPEC-implementation.md` §10.9).

### 5.1 Platform (instance admin)

Not government work. Instance admin or `local_implicit` board on a **private loopback** self-host only.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | |
| GET, PATCH | `/api/instance-settings` | |
| GET | `/api/instance/settings/admin-overview` | |
| GET, PATCH | `/api/instance/settings/experimental` | |
| GET, PATCH | `/api/instance/settings/tenant-provisioning` | |
| GET, PATCH | `/api/instance/settings/cloudflare` | |
| POST | `/api/instance/settings/cloudflare/validate` | |
| GET, POST | `/api/instance/settings/tenants` | |
| PATCH | `/api/instance/settings/tenants/:tenantId` | |
| GET | `/api/instance/settings/tenants/:tenantId/jobs` | |
| POST | `/api/instance/settings/tenants/:tenantId/redeploy` | |
| POST | `/api/instance/settings/tenants/:tenantId/pause` | |
| POST | `/api/instance/settings/tenants/:tenantId/archive` | |
| GET | `/api/instance/scheduler-heartbeats` | |
| POST | `/api/instance/database-backups` | **selfhost-only** today |
| POST | `/api/admin/users/:userId/promote-instance-admin` | and related admin user routes |
| GET | `/api/plugins` | **selfhost-only** until hosted plugins exist; Workers must return 501 with `{ "error": "…", "availability": "selfhost-only" }` not `[]` |

**New:**

| Method | Path |
|---|---|
| GET | `/api/platform/governments` |
| GET | `/api/platform/governments/:governmentId` |
| PATCH | `/api/platform/governments/:governmentId` |
| GET | `/api/platform/governments/:governmentId/usage-daily` |
| POST | `/api/platform/governments/:governmentId/usage-daily/rebuild` |
| GET | `/api/platform/governments/:governmentId/invoices` |

### 5.2 Government / institution (board session)

Institution CRUD (keep paths; add `/institutions` alias):

- `GET|POST /api/companies`
- `GET|PATCH /api/companies/:companyId`
- `POST /api/companies/:companyId/archive` (and delete where enabled)
- logo, export/import portability (`SPEC-implementation.md` §21; secrets stripped)

Channels (agents):

- `GET|POST /api/companies/:companyId/agents`
- hire / pause / resume / terminate
- `POST /api/agents/:agentId/keys`
- `POST /api/agents/:agentId/wakeup`
- `POST /api/agents/:agentId/heartbeat/invoke`
- org, config-revisions, runtime-state
- `GET /api/companies/:companyId/heartbeat-runs`
- `GET /api/heartbeat-runs/:runId`
- `POST /api/heartbeat-runs/:runId/cancel`
- events, log, workspace-operations
- `POST /api/heartbeat-runs/:runId/watchdog-decisions` — **selfhost-only** until D1 table exists

Requests:

- `GET|POST /api/companies/:companyId/issues`
- `GET|PATCH|DELETE /api/issues/:id`
- comments, documents, attachments, work-products, labels
- `POST /api/issues/:id/checkout` — atomic, company-scoped, activity logged
- `POST /api/issues/:id/release`
- `POST /api/issues/:id/admin/force-release` — board; Express today (`server/src/routes/issues.ts` ~725)

Objectives (must be mounted on Express):

- `GET|POST /api/companies/:companyId/goals`
- `GET|PATCH|DELETE /api/goals/:id`

Projects, approvals, secrets, dashboard, activity, sidebar-badges, members, invites, join-requests: keep existing paths.

Costs / budgets (institution):

- `POST /api/companies/:companyId/cost-events`
- `POST /api/companies/:companyId/finance-events` (board)
- `GET /api/companies/:companyId/costs/{summary,by-agent,by-agent-model,by-provider,by-biller,by-project,window-spend,quota-windows,finance-summary,finance-by-biller,finance-by-kind,finance-events}`
- `GET /api/companies/:companyId/budgets/overview` — **must return real policies on both runtimes**
- `POST /api/companies/:companyId/budgets/policies`
- `POST /api/companies/:companyId/budget-incidents/:incidentId/resolve`
- `PATCH /api/companies/:companyId/budgets`
- `PATCH /api/agents/:agentId/budgets`
- `GET /api/issues/:id/cost-summary`

**New government rollup (board):**

- `GET /api/governments/:governmentId/costs/summary`
- `GET /api/governments/:governmentId/costs/by-institution`
- `GET /api/governments/:governmentId/costs/by-channel`
- `GET /api/governments/:governmentId/budgets/overview`
- `POST /api/governments/:governmentId/budgets/policies` — board of any member institution or instance admin; `scope_type=government`

Public portal (citizen, not board) — mounted at `/api/public`:

- `GET /api/public/search`
- `GET /api/public/institutions`, `GET /api/public/institutions/:institutionSlug`
- `GET /api/public/places/:pathPrefix`, `POST /api/public/places`
- `GET /api/public/nominatim/search`, `GET /api/public/nominatim/lookup`
- `GET|POST /api/public/requests`, `GET /api/public/requests/:publicId`, `POST /api/public/requests/:publicId/comments`
- `GET /api/public/geo/search`, `/geo/by-path`, `/geo/children` — **hosted-only**
- `GET|POST /api/public/auth/*`, `/api/public/me`, `/api/public/collaborate` — hosted citizen account / contribute

No secrets, no agent keys, no cost ledgers on `/api/public`.

### 5.3 Agent (bearer `agent_api_keys.key_hash`, optional `X-Paperclip-Run-Id`)

- Own `company_id` only (`assertCompanyAccess`; 403 `Agent key cannot access another company`)
- `GET /api/agents/me`
- `GET /api/agents/me/inbox-lite` (and Express `inbox/mine`)
- Read/write assigned requests, comments, documents
- `POST /api/issues/:id/checkout` with own `agentId`
- `POST /api/companies/:companyId/cost-events` with own `agentId`
- Heartbeat report in run context

Cannot: set institution or government budgets; approve/reject; mint keys; cross-company; bypass checkout; POST finance-events; read other governments’ usage-daily.

Second auth path: local agent JWT (`verifyLocalAgentJwt` in Workers `workers/api/src/lib/agent-auth-jwt.ts`). Claims `company_id` must match the agent row. Same authorization matrix.

---

## 6. Dual runtime

| | Hosted civic SaaS | Self-host |
|---|---|---|
| Process | Cloudflare Workers `workers/api` (Hono) | Express `server/` |
| DB | D1 `@ciutatis/db-cloudflare` (SQLite, text ids, ISO timestamps) | Postgres / PGlite / embedded Postgres `@paperclipai/db` |
| Heartbeat | `workers/api/src/lib/hosted-heartbeats.ts` + Workers AI | `server/src/services/heartbeat.ts` process/HTTP/CLI adapters |
| UI | `apps/landing` admin | same UI, served by Express in dev middleware / static |
| Contract | **`packages/shared` only** | same validators, types, constants, `API` paths |

**Recommendation:** hosted Workers + D1 for civic SaaS (per-municipality `tenant_instances`, geo, public portal). Express + Postgres for self-host and air-gapped councils. Shared `packages/shared` is the source of truth. Runtime-specific adapters implement the contract; they do not shrink it quietly.

**No silent subset rule:** if a path exists in `packages/shared` or in this chapter, each runtime must either (a) implement it with the same status codes and shapes, or (b) declare it in shared constants:

```ts
export const RUNTIME_AVAILABILITY = {
  "GET /api/public/geo/search": "hosted-only",
  "POST /api/instance/database-backups": "selfhost-only",
  "POST /api/heartbeat-runs/:runId/watchdog-decisions": "selfhost-only",
  "GET /api/plugins": "selfhost-only", // until hosted plugins ship
} as const;
```

Unimplemented-but-called endpoints return **501** `{ error, availability }` — never `200 []`, never a generic 404 that the UI treats as empty.

Heartbeat split: extract checkout + `getInvocationBlock` + wakeup persistence into a small shared module. Do not compile the 9720-line Express heartbeat into Workers. Hosted adapter type `cloudflare_workers_ai` is `hosted-only`. Process adapter is `selfhost-only`.

CI (Phase 3): a route inventory test that diffs Express `server/src/app.ts` mounts + Workers `workers/api/src/app.ts` mounts against `packages/shared` `API` + this chapter’s path list, allowing only annotated exceptions.

---

## 7. Security

### 7.1 Checkout hole (P0)

Express `POST /api/issues/:id/checkout` (`server/src/routes/issues.ts` 712–716) loads the issue by id and updates it with **no** `assertCompanyAccess`. Combined with `requestService.checkout`’s unconditional `WHERE id = :issueId`, any authenticated actor who can hit the route can assign any request in the database to any `agentId` in the body.

Who can hit it:

- `local_trusted` implicit board (full access by design, but still must not skip atomicity).
- Authenticated board users (should be limited to their institutions — **currently not checked on this route**).
- Agent bearers, if middleware authenticates them: they can steal another institution’s request by UUID.

Fix:

1. `assertCompanyAccess(req, issue.companyId)` before mutate.
2. Atomic UPDATE with status + assignee predicate; 409 on 0 rows.
3. Agents may only checkout as `req.actor.agentId`.
4. `logActivity` action `issue.checked_out`.
5. Same SQL on Workers (drop TOCTOU).

Release already uses `assertCanMutateIssue`. Checkout must be at least as strict.

### 7.2 Key hashing

- Create: generate high-entropy token, return plaintext once (`AgentKeyCreated.token`), store SHA-256 hex in `agent_api_keys.key_hash`.
- Auth: hash presented bearer, lookup `key_hash` where `revoked_at IS NULL`.
- List keys: never return `keyHash` (Workers already strips).
- Warehouse: denylist `key_hash`.
- Do not log the bearer. Redact `Authorization` headers (`SPEC-implementation.md` §16).

### 7.3 `local_trusted` never public

Canonical model: `doc/DEPLOYMENT-MODES.md`. Constants: `DEPLOYMENT_MODES` / `DEPLOYMENT_EXPOSURES` in `packages/shared/src/constants.ts`. Config: `packages/shared/src/config-schema.ts` superRefine — `local_trusted` ⇒ `exposure=private`.

Express boot (`server/src/index.ts` ~417–425): throws if `local_trusted` and host is not loopback, or exposure is not `private`.

Workers (`workers/api/src/middleware/auth.ts`): `DEPLOYMENT_MODE` default **`local_trusted`**, which sets `actor = { type: "board", userId: "local-board", isInstanceAdmin: true, source: "local_implicit" }` for every request without a bearer. On a public Worker this is implicit superuser.

**Lock:** civic SaaS production is `authenticated` + `public` with explicit `auth.publicBaseUrl`. `local_trusted` is forbidden on `workers/api` production and on any non-loopback host. Health/doctor must fail the deploy if `DEPLOYMENT_MODE=local_trusted` and the Worker is internet-reachable.

### 7.4 Secrets and export

- Secrets at rest: `company_secrets` / `company_secret_versions.material`.
- Redact `adapter_config`, env, auth headers in logs.
- Institution portability already strips secrets (`SPEC-implementation.md` §21).
- Warehouse feed: §4.5 denylist.
- CSRF on board session mutations; rate-limit key mint and auth (`SPEC-implementation.md` §16).

### 7.5 Agent JWT

Workers `verifyLocalAgentJwt` is a second agent auth path (`ActorSource` includes `agent_jwt`). Company id in claims must match `agents.company_id`. Same checkout and cost-report rules as hashed keys. JWT material never exported.

---

## 8. Migration phases

### Phase 0 — Close P0 holes (both runtimes, same tests)

Ship before any vocabulary or government work is considered “done”.

1. Atomic checkout SQL on Express `requestService.checkout` and Workers `POST /issues/:id/checkout`.
2. Express `assertCompanyAccess` on checkout; agent can only use own `agentId`.
3. Activity `issue.checked_out` on Express.
4. Concurrent checkout test: one 200, one 409 (`SPEC-implementation.md` §17.2 / §17.4 item 2).
5. Mount `objectiveRoutes` on Express `server/src/app.ts`.
6. Mount `/api/institutions` alias on Express (same handlers as `/api/companies`).
7. Workers: `evaluateCostEvent` (or equivalent) on cost ingest; `GET budgets/overview` returns real policies; `POST budgets/policies` exists; hard-stop pauses channels. If that cannot land in the same change, cost ingest and heartbeat invoke **fail closed** with 503 `availability` — do not accept spend that cannot be capped.
8. Workers finance-events POST writes activity.

Do not port the heartbeat god module in this phase.

### Phase 1 — Vocabulary dual-write and compact board

1. API aliases: `/api/institutions`, `/api/requests` (same handlers as `/api/issues`, **not** the Express stub in `server/src/routes/requests.ts`), `/api/objectives`.
2. Shared `API` object already aliases TS names; document civic names as canonical.
3. Delete `MyIssues.tsx`, `IssueDetail.tsx` (+ migrate or drop `IssueDetail.test.tsx`), unroute/delete UX labs (`RunTranscriptUxLab`, `IssueChatLongThreadPerf`, `SystemNoticeUxLab`).
4. Costs page: add government rollup **placeholder** only if Phase 2 tables are not ready; otherwise wait for Phase 2 rather than fake tiles.
5. Sidebar stays civic; no My Issues.

Physical tables stay `companies` / `issues` / `goals`.

### Phase 2 — Government + usage

1. Add `governments` to `packages/db` and `packages/db-cloudflare`; `pnpm db:generate` on both.
2. Add `government_id` to `companies`, `cost_events`, `finance_events`, `budget_policies`, `budget_incidents`.
3. Backfill from `tenant_instances` / local government.
4. Extend `BUDGET_SCOPE_TYPES` with `government`; `BUDGET_METRICS` with `token_count`, `run_count`.
5. Create `usage_daily`; nightly rebuild job (Express cron / Workers scheduled handler).
6. Platform endpoints: governments CRUD, usage-daily GET/CSV, invoices GET.
7. Board endpoints: government cost summary / by-institution / by-channel.
8. Costs UI: government rollup default; channel drill-down keeps “By agent”.
9. Stamp `government_id` on ingest; 422 if missing after backfill.

### Phase 3 — Dual runtime contract freeze

1. Publish the path list from §5 in `packages/shared` (constants + `RUNTIME_AVAILABILITY`).
2. CI inventory: Express vs Workers vs shared; 501 for annotated gaps; fail CI on new silent `[]`.
3. Split heartbeat: shared checkout/budget/wakeup; Express keeps process adapters; Workers keeps hosted-heartbeats.
4. Close or annotate remaining schema gaps (environments, tree holds, watchdog, geo, plugins, public collaborate).
5. Workers production: refuse `DEPLOYMENT_MODE=local_trusted`.

### Phase 4 — Physical rename (optional, later)

Only after all clients use civic API paths.

Drizzle migrations: `companies` → `institutions`, `issues` → `requests`, `goals` → `objectives`, and FK columns `company_id` → `institution_id`, `issue_id` → `request_id`, `goal_id` → `objective_id`. High risk. Dual-write views if needed. Do not combine with Phase 0–2.

Then remove `/company/settings` redirects and Paperclip path aliases.

### Phase 5 — Warehouse

1. Nightly `usage_daily` push to the civic warehouse (HTTPS PUT/POST of the CSV allowlist, or signed object storage).
2. Column allowlist frozen; additive columns only with a version header `X-Ciutatis-Usage-Schema: 1`.
3. Monitoring: row counts per `government_id` per day; alert on drop to zero for an active government.
4. No secret/PII tables in the feed. Quarterly access review of who can call `/api/platform/governments/:id/usage-daily`.

---

## File index

| Area | Paths |
|---|---|
| Postgres schema | `packages/db/src/schema/{institutions,requests,objectives,agents,agent_api_keys,cost_events,finance_events,budget_policies,budget_incidents,heartbeat_runs,activity_log,approvals,tenant_instances,public_requests,institution_secrets,institution_secret_versions}.ts` |
| D1 schema | `packages/db-cloudflare/src/schema/` (plus `geo_entities.ts`, `public_contributions.ts`) |
| Shared contract | `packages/shared/src/{api.ts,constants.ts,config-schema.ts,types/{cost,finance,budget,quota,request,institution,tenant-instance}.ts,validators/{cost,finance,budget,request}.ts}` |
| Express checkout | `server/src/services/requestService.ts`, `server/src/routes/issues.ts`, `server/src/routes/authz.ts` |
| Workers checkout | `workers/api/src/routes/requests.ts`, `workers/api/src/lib/authz.ts` |
| Heartbeat | `server/src/services/heartbeat.ts`, `workers/api/src/lib/hosted-heartbeats.ts` |
| Budgets / costs | `server/src/services/budgets.ts`, `server/src/services/costs.ts`, `server/src/routes/costs.ts`, `workers/api/src/routes/costs.ts` |
| Auth | `server/src/middleware/auth.ts`, `workers/api/src/middleware/auth.ts`, `workers/api/src/lib/crypto.ts` |
| App mounts | `server/src/app.ts`, `workers/api/src/app.ts` |
| UI | `apps/landing/src/admin/{App.tsx,components/Sidebar.tsx,components/InstanceSidebar.tsx,pages/Costs.tsx,pages/RequestDetail.tsx,pages/IssueDetail.tsx,pages/MyIssues.tsx,pages/RunTranscriptUxLab.tsx,pages/IssueChatLongThreadPerf.tsx,pages/SystemNoticeUxLab.tsx,pages/GovOpsPage.tsx}` |
| Specs | `doc/SPEC-implementation.md`, `doc/DEPLOYMENT-MODES.md`, `doc/plans/2026-03-14-billing-ledger-and-reporting.md`, `doc/plans/2026-03-14-budget-policies-and-enforcement.md` |

---

## Acceptance for these chapters

These chapters are the build contract for GovOps domain + usage when:

1. Invariants in §2 are implemented (Phase 0), not merely documented.
2. `government_id` is on cost/finance rows and `usage_daily` matches §4.5.
3. Board vs platform vs deleted pages match §3.
4. Both runtimes honor §5 paths or annotated 501s — no silent subset.
5. `local_trusted` cannot run on public Workers; checkout cannot skip company access.
6. Warehouse export contains only the CSV allowlist.
