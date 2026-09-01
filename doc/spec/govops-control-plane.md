# GovOps Control Plane

Status: Forward contract (supersedes V1 single-board / no-RBAC for this product line)  
Date: 2026-08-12  
Audience: Platform engineers and government operators  
Companion: [civic-data-platform.md](./civic-data-platform.md)  
As-is baseline: [../plans/2026-08-12-inherited-codebase-audit.md](../plans/2026-08-12-inherited-codebase-audit.md)

This is the full product and architecture specification for the **GovOps Control Plane**: Ciutatis as the institution that enrolls governments, and Paperclip as the execution control plane each enrolled government operates. It does **not** rewrite [SPEC.md](../SPEC.md) or [SPEC-implementation.md](../SPEC-implementation.md) wholesale. Where this document conflicts with V1 “single human board” / “RBAC out of scope,” **this document wins for GovOps**.

The Civic Data Platform (ingest, warehouse, Dune-like SQL) is specified separately. This control plane **exports aggregated usage** into that warehouse and **gates** `data:publish` via entitlements. It never exposes Paperclip OLTP (API keys, sessions, secret material) to ad-hoc SQL.

---

## How to read this document

| Part | Chapters |
|---|---|
| I | 1 Problem and product boundary (locked decisions + as-is) |
| II | 2–5 Actors, tenancy, enrollment, RBAC/entitlements |
| III | 6–9 Paperclip domain, usage, APIs, UI IA |
| IV | 10–12 Security, migration, backlog |
| V | Appendix A (shared UI host), Appendix B (deferred) |

---


## Contents

1. [Problem and product boundary](#1-problem-and-product-boundary) (includes as-is baseline)
2. [Actors](#2-actors-and-principals)
3. [Tenancy model](#3-tenancy-model)
4. [Enrollment lifecycle](#4-enrollment-lifecycle)
5. [RBAC and entitlements](#5-rbac-and-permission-matrix)
6. [Paperclip domain](#6-domain-objects-and-physical-table-map)
7. [Usage metering](#7-usage-schema)
8. [API surface](#8-api-groups)
9. [UI information architecture](#9-board-pages-stay-vs-platform-only-vs-delete)
10. [Security](#10-security)
11. [Migration](#11-migration-phases)
12. [Open implementation backlog](#12-open-implementation-backlog)
- [Appendix A — UI host](#appendix-a--ui-host-identical-in-both-product-specs) (identical in both product specs)
- [Appendix B — Deferred](#appendix-b--deferred)

## 1. Problem and product boundary

### 1.1 What this system is

Ciutatis enrolls public-sector governments. Each enrolled government gets a Paperclip control plane: channels (agents), requests (issues), objectives (goals), approvals, heartbeats, budgets, and an activity log. Platform staff (Ciutatis) manage **which governments exist**, **what they may operate** (entitlements), **who may administer them** (RBAC), and **how much Paperclip they consume** (usage).

Government staff manage **their** institutions, channels, and work. They do not manage other governments. They do not get a second website: the only human product UI is `apps/landing` (Next.js).

### 1.2 What this system is not

- Not a chatbot. Conversation stays on requests (comments, documents, run transcripts).
- Not GitHub / Jira. No PR review product, no general issue tracker for the public internet.
- Not the Civic Data Platform. SQL, parsers, and visualization panels live in [civic-data-platform.md](./civic-data-platform.md).
- Not a general SQL tool over Paperclip OLTP. Agent keys, session tokens, secret material, and adapter config never enter the warehouse.
- Not two Next.js apps. Public site, government board, platform admin, and (later) data studio share `apps/landing`.

### 1.3 Locked decisions

1. **One human product UI:** `apps/landing` only.
2. **Two product systems:** this control plane, and the civic data platform.
3. **Two data planes:** Paperclip OLTP vs analytics warehouse. Never mixed.
4. **Enrolled government is the tenant.** New table `governments` is the billing, RBAC, entitlement, and usage parent. `tenant_instances` remains the Cloudflare **deploy unit** (D1/KV/R2, hostname, path). Hosted SaaS: `governments.tenant_instance_id` unique. Self-host: `tenant_instance_id` null.
5. **Real RBAC.** `grantsForHumanRole()` in `server/src/services/company-member-roles.ts` must not return `[]`. Roles are `owner | admin | operator | viewer | auditor` on the government plane and the same names on the institution plane. Platform roles are a separate enum.
6. **Entitlements** are what a government may operate (agents, adapters, portal, data publish, budgets, plugins), independent of who is logged in.
7. **Control-plane invariants are required behavior**, including atomic checkout (code currently fails this).
8. **Dual runtime:** hosted civic SaaS = Workers + D1; self-host = Express + Postgres. Shared contract in `packages/shared`. Unimplemented paths return **501** with `availability`, never a silent empty list.

### 1.4 Resolving draft identity conflict

An earlier tenancy draft treated `tenant_instances.id` as `government_id` to avoid a rename. That overloads a Cloudflare routing row and breaks self-host. **This spec locks `governments` as its own table.** Where tenancy chapters below say “`tenant_instances.id` is `government_id`,” read **`governments.id`**, and treat `tenant_instances` as the optional hosted deploy record linked by `governments.tenant_instance_id`. Entitlement and membership FKs target `governments.id`.

---

## 1.5 As-is (repo snapshot)

This section is descriptive. Citations are the current code, not the target.

### 1.1 V1 spec still says single board / RBAC out of scope

`doc/SPEC-implementation.md` §3:

| Topic | V1 decision |
|---|---|
| Tenancy | Single-tenant deployment, multi-company data model |
| Board | Single human board operator per deployment |

`doc/SPEC-implementation.md` §5.2 out of scope: “Multi-board governance or role-based human permission granularity.”

`doc/PRODUCT.md` still says “Do not build enterprise-grade RBAC first.”

`doc/SPEC.md` §1 Board Governance: “V1: Single human Board. One human operator.” Board has unrestricted access.

Those statements are the inherited Paperclip company-control-plane contract. They are **not** the GovOps contract.

### 1.2 Tenant rows are disconnected from institutions

Physical table `tenant_instances` (`packages/db/src/schema/tenant_instances.ts`, Postgres; `packages/db-cloudflare/src/schema/tenant_instances.ts`, D1) has routing and Cloudflare resource columns. It has **no** `company_id` / `institution_id` / `government_id` inbound FK from `companies`.

Physical table `companies` (`packages/db/src/schema/institutions.ts`, aliased as `institutions` / `companies`) has no `tenant_id` / `government_id`. Creating a company (`POST /api/companies` in `server/src/routes/institutions.ts`) does not create or attach a tenant. Creating a tenant (`POST /api/instance/settings/tenants` in `server/src/routes/instance-settings.ts`) does not create a company.

Public place creation (`POST /api/public/places` → `publicPortalService.createPlaceFromNominatim` in `server/src/services/public-portal.ts`) inserts a `tenant_instances` row with `status = "draft"` and `bootstrap_status = "pending"` and returns a place summary. No institution is created.

D1 `geo_entities` (`packages/db-cloudflare/src/schema/geo_entities.ts`) links to tenants via `tenant_instance_id` / `geo_id`. That is a geography claim, not an institution membership.

### 1.3 Instance roles are a single value

`packages/shared/src/constants.ts`:

```ts
export const INSTANCE_USER_ROLES = ["instance_admin"] as const;
```

Table `instance_user_roles` (`packages/db/src/schema/instance_user_roles.ts`): `user_id`, `role` default `"instance_admin"`. Unique on `(user_id, role)`.

`accessService.isInstanceAdmin()` (`server/src/services/access.ts`) is a boolean existence check for that row. `canUser()` short-circuits to `true` for every `PERMISSION_KEYS` value when the user is instance admin.

### 1.4 Company membership roles exist but grant nothing

`company_memberships` is the physical name of `institution_memberships` (`packages/db/src/schema/institution_memberships.ts`):

| Column | Notes |
|---|---|
| `company_id` | FK `companies.id` |
| `principal_type` | `user \| agent` (`PRINCIPAL_TYPES`) |
| `principal_id` | user id or agent id |
| `status` | `pending \| active \| suspended` |
| `membership_role` | unconstrained text |

Typed human roles in `server/src/services/company-member-roles.ts`: `owner | admin | operator | viewer`.

`grantsForHumanRole()` in that file **returns `[]`**. Comment: “Ciutatis: simplified grants - board has full access.”

`humanJoinGrantsFromDefaults()` in `server/src/services/invite-grants.ts` **returns `[]`**. Comment: “Ciutatis: simplified - no granular grants.”

Invite accept still writes `defaultsPayload.human.grants = grantsForHumanRole(humanRole)` (`server/src/routes/access.ts` `mergeInviteDefaults`), so approved humans get a membership role and **zero** `principal_permission_grants` rows unless an admin later PATCHes grants by hand.

Cloud tenant header auth (`server/src/middleware/auth.ts` `stackMembershipRole`) accepts `owner | admin | member | support` and then sets `isInstanceAdmin: true` for every cloud-tenant actor. That is a third, incompatible role vocabulary, and it elevates every stack user to instance admin.

### 1.5 Permission keys exist; enforcement is partial and coarse

`packages/shared/src/constants.ts` `PERMISSION_KEYS`:

| Key | Used today |
|---|---|
| `agents:create` | `server/src/routes/agents.ts` hire/create |
| `users:invite` | `server/src/routes/access.ts` invite create/list/revoke |
| `users:manage_permissions` | members list/patch, grant replace |
| `tasks:assign` | agent permission patch / assign checks |
| `tasks:assign_scope` | stored on grants; scope JSON |
| `joins:approve` | join-request approve/reject; sidebar badge |
| `environments:manage` | `server/src/routes/environments.ts` |

Table `principal_permission_grants` (`packages/db/src/schema/principal_permission_grants.ts`): `(company_id, principal_type, principal_id, permission_key)` unique, optional `scope` JSON, `granted_by_user_id`.

`assertCompanyPermission` lives **inside** `server/src/routes/access.ts` (not in `authz.ts`). It calls `assertCompanyAccess`, then `access.hasPermission` for agents or `access.canUser` for board users. Local implicit board skips the grant check.

Most other routers only call `assertCompanyAccess` / `assertBoard` / `assertInstanceAdmin` from `server/src/routes/authz.ts`.

`assertCompanyAccess` (`server/src/routes/authz.ts`):

1. Reject unauthenticated (`actor.type === "none"`).
2. Allow `board` + `source === "local_implicit"`.
3. Allow `board` + `isInstanceAdmin`.
4. Allow `board` if `companyId ∈ actor.companyIds`.
5. Allow `agent` if `actor.companyId === companyId`.
6. Else 403.

It does **not** read `membership_role`, does **not** read `principal_permission_grants`, does **not** distinguish viewer vs owner, does **not** bind a request to a tenant.

Workers copy (`workers/api/src/lib/authz.ts`) is the same coarse check. Workers access routes (`workers/api/src/routes/access.ts`) create invites with `assertBoard` + `assertCompanyAccess` only — no `users:invite` grant check.

### 1.6 Actor model on the wire

`server/src/types/express.d.ts` `req.actor.type`: `"board" | "agent" | "none"`.

Sources: `"local_implicit" | "session" | "board_key" | "agent_key" | "agent_jwt" | "cloud_tenant" | "none"`.

`getActorInfo()` maps board → `actorType: "user"` for activity logs, agent → `"agent"`, else `"system"` with `actorId: "board"`.

`ActorType` in `authz.ts` also lists `"plugin"` but request actors are never `plugin` today. Plugin routes (`server/src/routes/plugins.ts` `canAccessCompany`) reuse instance-admin-or-membership.

Authenticated humans are always `type: "board"` even when they are viewers. `assertBoard` therefore means “is a human session,” not “is a governing board member.”

### 1.7 Routing and UI as-is

`TENANT_ROUTING_MODES = ["path", "subdomain", "custom_domain"]` (`packages/shared/src/constants.ts`).

`deriveTenantRoute` / `deriveTenantUrl` / `parseTenantRoutePathname` (`packages/shared/src/tenant-routing.ts`). Default path template: `/{countryCode}/{jurisdictionType}/{routeSegment}` (example: `/ar/municipio/7000-tandil`).

Dispatcher (`workers/dispatcher/src/index.ts`) looks up `tenant_instances` by path/hostname.

UI is already one Next.js app (`apps/landing`): public site on `ciutatis.com`, operator SPA under `/admin` (`apps/landing/src/admin/AdminApp.tsx` `BrowserRouter basename="/admin"`), host rewrite in `apps/landing/next.config.ts` for `admin.ciutatis.com`. Company-prefixed board routes live in `apps/landing/src/admin/lib/router.tsx` (`applyCompanyPrefix` using `issuePrefix`), not government path prefixes.

Platform tenant CRUD UI: `apps/landing/src/admin/pages/InstanceTenants.tsx` against `/api/instance/settings/tenants`.

### 1.8 Audit as-is

`activity_log` (`packages/db/src/schema/activity_log.ts`) is **company-scoped only** (`company_id` NOT NULL). There is no tenant/government/platform audit table. Tenant create/pause/archive in `instance-settings.ts` does not call `logActivity`. Instance-admin promote/demote in `access.ts` does not call `logActivity`. Entitlements do not exist, so they are not logged.

`logActivity` (`server/src/services/activity-log.ts`) writes the row, publishes `activity.logged`, and optionally forwards a plugin domain event. `companyId` is required.

### 1.9 Dual API stacks

| Stack | Authz | DB |
|---|---|---|
| `server/` Express | `server/src/routes/authz.ts`, `server/src/middleware/auth.ts` | `packages/db` Postgres |
| `workers/api` Hono | `workers/api/src/lib/authz.ts` | `packages/db-cloudflare` D1 |

Both must change. The Express routes listed in Chapter 5.9 are the contract; Workers must not remain coarser.

---

## 1.6 Target vocabulary

| Term | Meaning | Physical identity |
|---|---|---|
| **Platform** | Ciutatis operator plane. Not a government. | Deployment + `instance_settings` singleton |
| **Government** | Enrolled public-sector tenant. The tenancy root. | `governments.id` |
| **Institution** | Operating unit inside a government (municipality, ministry, department, agency). Today’s `companies` row. | `companies.id` (`institutions` alias) |
| **Department** | Child institution. Same table, `parent_institution_id` set. | `companies.id` |
| **Principal** | User, agent, plugin, or system acting on data. | `(principal_type, principal_id)` |
| **Role** | Named bundle of permissions. Stored on membership. | See Chapter 2 |
| **Grant** | Concrete `permission_key` (+ optional scope) on a principal. | `principal_permission_grants` |
| **Entitlement** | What the **government** is allowed to operate, regardless of who is logged in. | `government_entitlements` |
| **Usage** | Metered consumption counted against entitlements. | `government_usage_windows` + existing `cost_events` |

API and TypeScript use `governmentId`. SQL table `governments` is the tenancy root. `tenant_instances` remains the Cloudflare **deploy unit** (D1/KV/R2, hostname, path). Hosted SaaS: `governments.tenant_instance_id` unique. Self-host: `tenant_instance_id` null.

Backward-compat aliases (`companies`, `company_memberships`, `issues`, `goals`) remain exported from `packages/db/src/schema/index.ts`. New code uses `institutions`, `institution_memberships`, `requests`, `objectives` at the civic layer, but permission keys keep the existing `agents:` / `tasks:` / `users:` prefixes so current grant rows stay valid.

---

## 2. Actors and principals

### 2.1 Request actor (to-be)

Replace `req.actor.type: "board" | "agent" | "none"` with a discriminated union. File: `server/src/types/express.d.ts` and `workers/api/src/lib/types.ts`.

```ts
type Actor =
  | { type: "none"; source: "none" }
  | {
      type: "platform";
      userId: string;
      platformRole: PlatformRole;
      source: "session" | "local_implicit";
    }
  | {
      type: "user";
      userId: string;
      governmentId: string;
      governmentRole: GovernmentRole | null;
      institutionIds: string[];
      memberships: Array<{
        institutionId: string;
        membershipRole: GovernmentRole;
        status: "pending" | "active" | "suspended";
      }>;
      source: "session" | "board_key";
    }
  | {
      type: "agent";
      agentId: string;
      governmentId: string;
      companyId: string; // institution id
      keyId?: string;
      runId?: string | null;
      source: "agent_key" | "agent_jwt";
    }
  | {
      type: "plugin";
      pluginId: string;
      pluginKey: string;
      governmentId: string;
      companyId: string | null;
      source: "plugin_worker";
    }
  | {
      type: "system";
      actorId: "scheduler" | "provisioner" | "recovery" | "dispatcher";
      source: "system";
    }
  | {
      type: "public";
      governmentId: string | null;
      institutionId: string | null;
      source: "public_portal";
    };
```

`type: "board"` is removed. During migration, `actorMiddleware` may still *accept* legacy board sessions and rewrite them to `type: "user"` or `type: "platform"` before any route runs.

`local_trusted` (`doc/DEPLOYMENT-MODES.md`): the implicit actor becomes `type: "platform", platformRole: "platform_owner", source: "local_implicit"`. It is a platform principal, not a government owner. Local single-node still uses one embedded DB; government rows are still required once any institution exists.

`authenticated` mode: no implicit actor. Session → `platform` if `instance_user_roles` has a platform role; else `user` if the session has at least one `government_memberships` or `institution_memberships` row; else `none` (can only hit public portal and self-service claim).

### 2.2 Mapping from today’s actor types

| Today (`req.actor`) | File | To-be actor | Notes |
|---|---|---|---|
| `{ type: "none" }` | `server/src/middleware/auth.ts` | `{ type: "none" }` or `{ type: "public" }` on `/api/public/*` | Public portal currently logs `requestedByActorType: "system"` for anonymous submits (`server/src/routes/public-portal.ts`). Anonymous becomes `public`. |
| `{ type: "board", source: "local_implicit", isInstanceAdmin: true, userId: "local-board" }` | `auth.ts` L23–25 | `{ type: "platform", platformRole: "platform_owner", source: "local_implicit" }` | Stops being treated as a company member. |
| `{ type: "board", source: "session", isInstanceAdmin: true }` | `auth.ts` L51–77 | `{ type: "platform", platformRole }` | Role taken from `instance_user_roles.role` (expanded enum). Platform users may *also* hold government memberships; those are separate. |
| `{ type: "board", source: "session", isInstanceAdmin: false, companyIds }` | `auth.ts` | `{ type: "user", governmentId, governmentRole, institutionIds }` | `companyIds` become `institutionIds`. `governmentId` is loaded from `companies.government_id`. If memberships span multiple governments, the request must carry an explicit government context (host/path/`X-Ciutatis-Government-Id`); otherwise 400. |
| `{ type: "board", source: "board_key" }` | `server/src/services/board-auth.ts` | `{ type: "user", source: "board_key" }` | CLI/board API keys inherit the user’s government + institution memberships. They never become platform actors unless the user has a platform role **and** the key was minted with `scope: "platform"`. |
| `{ type: "board", source: "cloud_tenant", isInstanceAdmin: true }` | `auth.ts` `resolveCloudTenantActor` | `{ type: "user" }` with mapped government role | **Must stop setting `isInstanceAdmin: true`.** Map stack roles: `owner→owner`, `admin→admin`, `member→operator`, `support→platform_support` (platform plane only if the user is actually platform staff). |
| `{ type: "agent", source: "agent_key" \| "agent_jwt" }` | `auth.ts` | `{ type: "agent", governmentId, companyId }` | `governmentId` from `companies.government_id`. Agent keys still hashed in `agent_api_keys`. Cross-institution access remains forbidden. |
| Plugin worker host calls | `server/src/routes/plugins.ts` | `{ type: "plugin", governmentId, companyId }` | Today plugin routes impersonate the incoming human/agent. Host-originated plugin work must be attributed as `plugin`. |
| Scheduler / heartbeat / provisioner | `server/src/services/heartbeat.ts`, `instance-settings.ts` jobs | `{ type: "system" }` | Activity `actorType: "system"`. |

`getActorInfo()` (`server/src/routes/authz.ts`) mapping to-be:

| Actor.type | activity `actor_type` | `actor_id` |
|---|---|---|
| `platform` | `user` | `userId` |
| `user` | `user` | `userId` |
| `agent` | `agent` | `agentId` |
| `plugin` | `plugin` | `pluginId` |
| `system` | `system` | `actorId` |
| `public` | `user` if signed-in portal account; else `system` | `userId` or `"public-portal"` |

### 2.3 Role enums (locked)

`packages/shared/src/constants.ts` replacements:

```ts
export const PLATFORM_ROLES = [
  "platform_owner",
  "platform_operator",
  "platform_support",
  "platform_auditor",
] as const;

export const GOVERNMENT_ROLES = [
  "owner",
  "admin",
  "operator",
  "viewer",
  "auditor",
] as const;

export const INSTANCE_USER_ROLES = PLATFORM_ROLES; // replaces ["instance_admin"]
```

| Role | Plane | Intent |
|---|---|---|
| `platform_owner` | Platform | Full platform control, including promoting platform roles and setting entitlements. |
| `platform_operator` | Platform | Day-to-day enrollment, provision, pause, adapter/plugin install, Cloudflare settings. Cannot demote the last `platform_owner`. |
| `platform_support` | Platform | Read all governments + impersonation-free diagnostics. Cannot change entitlements or RBAC. |
| `platform_auditor` | Platform | Read-only across governments, including audit logs and usage. No mutations. |
| `owner` | Government | Accountable government administrator. Manages members, institutions, routing, pause of own government. |
| `admin` | Government | Operates the control plane inside the government: agents, budgets, portal, plugins (within entitlements). Cannot transfer ownership or destroy the government. |
| `operator` | Government | Runs work: issues, comments, approvals they are assigned, agent invoke/pause of non-CEO agents they manage. Cannot change members or entitlements. |
| `viewer` | Government | Read dashboards, issues, costs summaries, activity. No mutations. |
| `auditor` | Government | Read-only including audit log, cost ledger, secret *metadata* (never values), membership lists. No mutations. Distinct from `viewer` because audit access is an explicit grant. |

`instance_admin` is migrated: every `instance_user_roles.role = 'instance_admin'` row becomes `platform_operator`. The first bootstrap user (`invite_type = "bootstrap_ceo"` in `packages/db/src/schema/invites.ts`) becomes `platform_owner`. Bootstrap invite semantics stay in `doc/DEPLOYMENT-MODES.md` / `server/src/routes/access.ts` but the promoted role name changes.

Human institution roles stay the same four-plus-auditor set. There is no `member` and no `support` on the government plane. Cloud stack `member` → `operator`; cloud stack `support` is not a government role.

### 2.4 Principals that are not humans

| Principal | `principal_type` | Membership | Grants |
|---|---|---|---|
| Human user | `user` | `government_memberships` and/or `institution_memberships` | Role bundle + optional extra grants |
| Agent | `agent` | `institution_memberships` (`principal_type='agent'`) already written on join approve (`server/src/routes/access.ts`) | Explicit grants only. Agents never inherit human role bundles. CEO default grants are listed in §5.6. |
| Plugin | `plugin` | none (capability manifest) | `PLUGIN_CAPABILITIES` in `packages/shared/src/constants.ts`, intersected with government entitlement `plugins.allowed_keys` and per-institution `plugin_company_settings.enabled` |
| System | `system` | none | Implicit, code-gated. Cannot be granted via API. |
| Public | n/a | none | Entitlement-gated public portal only |

Agents keep `agents.permissions` JSON (`packages/db/src/schema/agents.ts`) as a **deprecated** cache. Authorization source of truth is `principal_permission_grants`. `PATCH /api/agents/:id/permissions` must write grants, not only the JSON blob.

---

## 3. Tenancy model

### 3.1 Isolation rule

Every domain row belongs to exactly one government, either directly (`government_id`) or through `companies.government_id`.

Cross-government reads return 404, not 403, to avoid leaking existence. Cross-government writes return 404. Platform actors may list across governments only on platform routes (`/api/platform/*` and `/api/governments` index).

Agent API keys cannot leave their institution (`assertCompanyAccess` agent branch stays). They also cannot act if `governments.status` is not `active` (paused/archived/suspended → 403 `government_not_active`). On hosted SaaS, a linked `tenant_instances.status` of `error`/`paused`/`archived` also blocks invoke.

Object storage keys already require a company prefix (`doc/plans/2026-02-20-storage-system-implementation.md`). To-be keys are `{government_id}/{institution_id}/...`.

Cloudflare isolation already provisioned per tenant (`tenant_d1_database_id`, `tenant_kv_namespace_id`, `tenant_r2_bucket_name` on `tenant_instances`) remains. Logical Postgres/D1 rows still carry `government_id` so a mis-routed worker cannot read another government’s institutions even if bindings were wrong — the query filter is mandatory.

### 3.2 Identity: `government_id`

`government_id` = `governments.id` (uuid). `tenant_instances.id` is the hosted routing/deploy unit, linked by `governments.tenant_instance_id` (nullable on self-host).

API path parameter `:governmentId`. Header `X-Ciutatis-Government-Id` is accepted on the admin host when the path is not government-prefixed. The resolver prefers: (1) hostname match, (2) path prefix match, (3) header, (4) session’s sole government membership. Ambiguity → 400 `government_context_required`.

### 3.3 Schema changes (additive)

#### 3.3.1 `governments` (new) and `tenant_instances` (deploy unit)

**Lock:** `governments` is the billing, RBAC, entitlement, enrollment, and usage parent. `tenant_instances` is **not** `government_id`. It is the Cloudflare deploy/routing record.

Create in both `packages/db` and `packages/db-cloudflare`:

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid pk | This **is** `government_id` |
| `tenant_instance_id` | uuid | FK `tenant_instances.id`, unique, **nullable** (self-host) |
| `name` | text not null | Display name, usually `municipality_name` |
| `legal_name` | text null | Official name |
| `country_code` | text not null | ISO 3166-1 alpha-2 |
| `jurisdiction_type` | text not null | Copy from tenant (`municipio`, etc.) |
| `status` | text not null default `active` | `active \| paused \| archived` (operational) |
| `enrollment_status` | text not null default `'draft'` | See Chapter 4. Distinct from operational `status` |
| `primary_institution_id` | uuid null FK `companies.id` | Set when the first institution is created |
| `geo_id` | text null | Join key to D1 `geo_entities.id` |
| `claimed_by_user_id` | text null | First claimant |
| `enrolled_at` | timestamptz null | When `enrollment_status` became `active` |
| `suspended_at` / `suspension_reason` | timestamptz / text | Entitlement or policy suspension |
| `created_at` | timestamptz not null | |
| `updated_at` | timestamptz not null | |

Indexes: unique `tenant_instance_id` where not null; `(country_code, status)`; `enrollment_status`.

Backfill:

1. Hosted: one `governments` row per `tenant_instances` row (`name = municipality_name`, copy `country_code` / `jurisdiction_type`, `tenant_instance_id` set).
2. Self-host with no tenants: insert one row `name = 'Local government'`, `country_code = 'XX'`, `jurisdiction_type = 'self_host'`, `tenant_instance_id` null.
3. Stamp `companies.government_id` from the linked tenant or the single local government.
4. Stamp `cost_events.government_id` and `finance_events.government_id` from `companies.government_id`.
5. Fail closed: after backfill, `government_id` is NOT NULL on cost/finance rows.

##### `tenant_instances` (keep name; this is the **deploy unit**)

Existing columns stay (`packages/db/src/schema/tenant_instances.ts`). Add columns that are routing/provisioning-only (not billing identity):

| Column | Type | Notes |
|---|---|---|
| `geo_id` | text null | Already on D1 schema (`packages/db-cloudflare/src/schema/tenant_instances.ts`); add to Postgres |
| `latitude` / `longitude` / `osm_type` / `osm_id` | as D1 | Add to Postgres so both stacks match |
| `custom_domain_status` | text null | `pending_dns \| active \| failed` |

Keep operational `status`: `draft | provisioning | active | paused | error | archived` (`TENANT_INSTANCE_STATUSES`).

Keep `bootstrap_status`: `pending | ready | unknown`.

Indexes: existing unique `path_prefix`, `dispatcher_key`, `hostname`, `worker_name`. Add unique `(country_code, jurisdiction_type, postal_code, city_slug)` where status is not `archived`.

Enrollment lifecycle fields (`enrollment_status`, `claimed_by_user_id`, `enrolled_at`, `primary_institution_id`) live on **`governments`**, not on `tenant_instances`.

#### 3.3.2 `companies` / `institutions`

Add to `packages/db/src/schema/institutions.ts`:

| Column | Type | Notes |
|---|---|---|
| `government_id` | uuid not null FK `governments.id` | **Required** after backfill |
| `parent_institution_id` | uuid null FK `companies.id` | Department/child. Same government required |
| `kind` | text not null default `'institution'` | `institution \| department \| agency \| ministry` |
| `slug` | text not null | Portal slug; today derived at read time via `buildInstitutionPortalSlug` in `server/src/services/public-portal.ts`. Persist it. Unique per government |
| `public_portal_enabled` | boolean not null default false | AND with entitlement `portal.public_enabled` |

Drop uniqueness of `issue_prefix` **globally** (`companies_issue_prefix_idx`). Replace with unique `(government_id, issue_prefix)`.

Backfill: for each existing `companies` row with no government, create a `governments` row (`enrollment_status='active'`, `status='active'`). On hosted SaaS also create or link a `tenant_instances` row (`routing_mode='path'`, synthetic `path_prefix='/local/{issue_prefix}'` in `local_trusted`; in cloud, leave tenant `draft` and flag for operator linking). Set `companies.government_id`. Set `governments.primary_institution_id` to that company.

Existing `tenant_instances` with no company: create a primary institution named `municipality_name`, `kind='institution'`, owner membership for `claimed_by_user_id` if present.

#### 3.3.3 `government_memberships` (new)

Government-plane membership. Distinct from `company_memberships`.

| Column | Type |
|---|---|
| `id` | uuid pk |
| `government_id` | uuid not null FK `governments.id` |
| `principal_type` | text not null (`user` only for V1 of this spec; agents are institution-scoped) |
| `principal_id` | text not null |
| `status` | `pending \| active \| suspended` |
| `membership_role` | text not null (`GOVERNMENT_ROLES`) |
| `created_at` / `updated_at` | timestamptz |

Unique `(government_id, principal_type, principal_id)`.

Invariant: at least one active `owner` per non-archived government.

#### 3.3.4 `institution_memberships` (`company_memberships`)

Keep table. Constrain `membership_role` to `GOVERNMENT_ROLES`. Add:

| Column | Type | Notes |
|---|---|---|
| `government_id` | uuid not null | Denormalized from parent institution; filter/index |

A user may be government `owner` and not appear on every child institution; government `owner`/`admin` still pass institution access via role inheritance (Chapter 5). Operators/viewers/auditors must have an institution membership (or a government role that inherits).

#### 3.3.5 `principal_permission_grants`

Add `government_id uuid not null`. Unique key becomes `(government_id, company_id, principal_type, principal_id, permission_key)` with `company_id` nullable for government-scoped grants (`company_id IS NULL` means government-wide).

#### 3.3.6 `instance_user_roles`

`role` uses `PLATFORM_ROLES`. Unique `(user_id)` — one platform role per user. A platform user may additionally hold government memberships.

#### 3.3.7 Child institutions / departments

Tree rules:

- `parent_institution_id` must be in the same `government_id`.
- Depth max 3 (government primary → institution → department). Deeper → 422.
- Cycles forbidden.
- Deleting/archiving a parent archives children.
- Entitlement `institutions.max_count` counts all non-archived rows for that `government_id`.
- Primary institution (`governments.primary_institution_id`) cannot be a child.

Org chart of **agents** (`agents.reports_to`) stays inside one institution. It is not the department tree.

### 3.4 Routing

Routing modes stay `path | subdomain | custom_domain` (`TENANT_ROUTING_MODES`). `deriveTenantRoute` in `packages/shared/src/tenant-routing.ts` remains the generator. Country configs stay in `packages/shared/src/tenant-routing-configs/` (`ar`, `us`; jurisdiction types in `TENANT_JURISDICTION_TYPES`).

| Mode | Public URL | Operator UI URL | API |
|---|---|---|---|
| `path` | `https://{baseDomain}{pathPrefix}/` e.g. `https://ciutatis.com/ar/municipio/7000-tandil` | `https://admin.ciutatis.com/admin/g/{governmentId}/...` **or** `https://ciutatis.com{pathPrefix}/admin/...` | Dispatcher strips prefix; API sees `/api/...` plus resolved `governmentId` |
| `subdomain` | `https://{hostname}/` where `hostname` is `{routeSegment}.{baseDomain}` unless overridden | Same host `/admin/...` | Host lookup on `tenant_instances.hostname` (`workers/dispatcher/src/index.ts`) |
| `custom_domain` | `https://{hostname}/` (government DNS CNAME) | Same host `/admin/...` after TLS | Same hostname lookup; `custom_domain_status` must be `active` |

`instance_settings.tenant_provisioning` (`packages/shared/src/validators/instance.ts`): `baseDomain`, `pathTemplate`, `workerNameTemplate`, `defaultRoutingMode` — unchanged.

Locked routing policy:

1. New enrollments default to `path` (matches `defaultRoutingMode`).
2. `subdomain` requires entitlement `routing.subdomain`.
3. `custom_domain` requires entitlement `routing.custom_domain` plus platform_operator approval of DNS (`custom_domain_status`).
4. One Next.js app serves all three. `apps/landing/app/[[...slug]]/page.tsx` already resolves public geo/tenant paths. Operator SPA stays `basename="/admin"` on the admin host and also mounts at `{pathPrefix}/admin` on path tenants.
5. Company issue-prefix URL prefixes (`apps/landing/src/admin/lib/router.tsx`) become institution-scoped **inside** a government: `/admin/g/{governmentId}/i/{issuePrefix}/...`. Old `/admin/{issuePrefix}/...` redirects when the session has exactly one government.

Dispatcher (`workers/dispatcher/src/index.ts`) continues to parse `parseTenantRoutePathname`. After lookup it must attach `X-Ciutatis-Government-Id: {id}` to the origin request. API middleware trusts that header only from the dispatcher (existing cloud-tenant header pattern in `auth.ts` `requiredCloudHeader`, tightened to dispatcher-signed or internal network).

### 3.5 What is in the tenant boundary

Included (must carry `government_id` after backfill, directly or via institution):

- `companies` / institutions, memberships, grants, invites, join_requests
- agents, agent_api_keys, projects, issues/requests, goals/objectives, approvals
- cost_events, finance_events, budget_policies, budget_incidents
- activity_log
- secrets, environments, execution_workspaces, assets, documents
- public_requests (already `company_id` + `institution_slug`)
- plugin_company_settings (enablement). Installed plugin *packages* remain platform-global (`plugins` table has no company_id — `packages/db/src/schema/plugins.ts`); enablement is per institution and allowed-list is per government entitlement

Excluded (platform-global):

- `user` / `session` / `account` / `verification` (`packages/db/src/schema/auth.ts`)
- `instance_settings`, `instance_user_roles`
- `plugins` + `plugin_config` (install catalog)
- `geo_entities` (reference data)
- adapter plugin packages on disk (`server/src/routes/adapters.ts`)

### 3.6 API paths for governments

Replace platform tenant CRUD as the public contract. Keep old paths as aliases for one release.

| Method | Path | Who | Replaces |
|---|---|---|---|
| `GET` | `/api/governments` | platform `tenants.read`; government users see only their governments | `GET /api/instance/settings/tenants` |
| `POST` | `/api/governments` | platform `tenants.create` **or** authenticated claimant creating `enrollment_status=draft` | `POST /api/instance/settings/tenants` |
| `GET` | `/api/governments/:governmentId` | platform read **or** government membership | `GET` by list filter |
| `PATCH` | `/api/governments/:governmentId` | platform `tenants.update` or government `government:update` | `PATCH /api/instance/settings/tenants/:tenantId` |
| `POST` | `/api/governments/:governmentId/provision` | platform `tenants.provision` | `POST .../redeploy` for first provision |
| `POST` | `/api/governments/:governmentId/redeploy` | platform `tenants.provision` | `POST /api/instance/settings/tenants/:tenantId/redeploy` |
| `POST` | `/api/governments/:governmentId/pause` | platform `tenants.pause` or government owner `government:pause` | `POST .../pause` |
| `POST` | `/api/governments/:governmentId/resume` | platform `tenants.pause` or government owner | (missing today) |
| `POST` | `/api/governments/:governmentId/archive` | platform `tenants.archive` | `POST .../archive` |
| `GET` | `/api/governments/:governmentId/jobs` | platform read or government admin | `GET .../tenants/:tenantId/jobs` |
| `GET` | `/api/governments/:governmentId/members` | `government:members.manage` or auditor read | new |
| `POST` | `/api/governments/:governmentId/members/invite` | `government:members.invite` | new (invite_type `government_join`) |
| `PATCH` | `/api/governments/:governmentId/members/:memberId` | `government:members.manage` | new |
| `GET` | `/api/governments/:governmentId/entitlements` | platform `entitlements.read` or government `government:entitlements.read` | new |
| `PUT` | `/api/governments/:governmentId/entitlements` | platform `entitlements.manage` only | new |
| `GET` | `/api/governments/:governmentId/usage` | platform support+ or government `government:usage.read` | new |
| `GET` | `/api/governments/:governmentId/audit` | platform auditor+ or government `government:audit.read` | new |
| `GET` | `/api/governments/:governmentId/institutions` | government read | filtered `GET /api/companies` |
| `POST` | `/api/governments/:governmentId/institutions` | `government:institutions.create` | `POST /api/companies` (body must include `governmentId`) |

Platform-only (keep, rename role checks):

| Method | Path | Permission |
|---|---|---|
| `GET/PATCH` | `/api/instance/settings/general` | `platform:settings.manage` (read: any platform role) |
| `GET/PATCH` | `/api/instance/settings/experimental` | `platform:settings.manage` |
| `GET/PATCH` | `/api/instance/settings/tenant-provisioning` | `platform:settings.manage` |
| `GET/PATCH` | `/api/instance/settings/cloudflare` | `platform:cloudflare.manage` |
| `POST` | `/api/instance/settings/cloudflare/validate` | `platform:cloudflare.manage` |
| `GET` | `/api/instance/settings/admin-overview` | any platform role |
| `POST` | `/api/instance/database-backups` | `platform:backups.manage` (`server/src/routes/instance-database-backups.ts`) |
| `GET` | `/api/admin/users` | `platform:users.manage` (auditor may read) |
| `POST` | `/api/admin/users/:userId/promote-instance-admin` | **replace** with `PUT /api/platform/users/:userId/role` `{ role }` |
| `POST` | `/api/admin/users/:userId/demote-instance-admin` | same |
| `GET/PUT` | `/api/admin/users/:userId/company-access` | **replace** with government + institution membership APIs; keep as alias writing `institution_memberships` |

Institution APIs stay under `/api/companies/:companyId/...` (alias `/api/institutions/:institutionId/...`) and **must** verify `companies.government_id === req.actor.governmentId` (or platform).

Public portal (`server/src/app.ts` mounts at `/api/public`):

| Method | Path | Change |
|---|---|---|
| `GET /api/public/search` | unchanged | Filter to `enrollment_status=active` and `status=active` |
| `GET /api/public/institutions` | unchanged | Join `companies.government_id`; hide if portal entitlement off |
| `GET /api/public/places/:pathPrefix` | unchanged | |
| `POST /api/public/places` | **auth required** | Today unauthenticated (`server/src/routes/public-portal.ts`). To-be: signed-in user creates `enrollment_status=draft` government. |
| `POST /api/public/requests` | entitlement `portal.public_enabled` + institution `public_portal_enabled` | |

Constants: add `API.governments = "/api/governments"` in `packages/shared/src/api.ts` next to `tenantInstances: "/api/instance/settings/tenants"`.

---

## 4. Enrollment lifecycle

### 4.1 States

Two status fields:

- `enrollment_status` — legal/onboarding lifecycle (this chapter).
- `status` — runtime/provisioning (`TENANT_INSTANCE_STATUSES` today).

`enrollment_status` values (locked):

| State | Meaning |
|---|---|
| `unclaimed` | No `tenant_instances` row. Geo entity exists (`geo_entities.tenant_instance_id IS NULL`). |
| `draft` | Claim started. Tenant row exists. No entitlements billed. Public page shows unclaimed/claim-in-progress banner (`apps/landing/app/region/RegionPage.tsx` `UnclaimedBanner`). |
| `submitted` | Claimant submitted org proof / contact. Waiting on platform. |
| `provisioning` | Platform accepted. Cloudflare job running (`tenant_provisioning_jobs.kind='initial_provision'`). |
| `bootstrap` | Worker/DB ready (`bootstrap_status='pending'`). Waiting for first government owner to accept invite. |
| `active` | First owner accepted. Institutions may operate within entitlements. |
| `paused` | Government or platform paused operations. Data retained. Heartbeats refused. |
| `suspended` | Platform penalty / entitlement lapse / abuse. Government humans can read; cannot mutate. |
| `error` | Provisioning or runtime failure (`status='error'` mirrored). |
| `archived` | Soft-deleted. Routing released after grace. |

`unclaimed` is not stored on `tenant_instances`; it is the absence of a row (or `geo_entities` without `tenant_instance_id`).

Mapping from today’s `TENANT_INSTANCE_STATUSES`:

| Today `status` | Today `bootstrap_status` | To-be `enrollment_status` |
|---|---|---|
| `draft` | `pending` | `draft` |
| `provisioning` | `pending` | `provisioning` |
| `active` | `pending` | `bootstrap` |
| `active` | `ready` | `active` |
| `paused` | * | `paused` |
| `error` | * | `error` |
| `archived` | * | `archived` |
| (new) | | `submitted`, `suspended` |

Provisioning job kinds stay `initial_provision | redeploy | archive` (`TENANT_PROVISIONING_JOB_KINDS`). Steps stay as in `TENANT_PROVISIONING_STEPS`.

### 4.2 Who does what

| State / transition | Actor | Action | API |
|---|---|---|---|
| Geo browse | `public` | View unclaimed place | `GET /api/public/places/:pathPrefix`, geo pages |
| Start claim | authenticated `user` (no government yet) or platform | Create draft government bound to `geo_id` | `POST /api/public/places` (auth) or `POST /api/governments` `{ geoId, ... }` |
| Edit draft | claimant (`claimed_by_user_id`) or platform | Name, contacts, routing mode | `PATCH /api/governments/:id` while `draft` |
| Submit | claimant | `enrollment_status=submitted` | `POST /api/governments/:id/submit` |
| Reject | `platform_operator`+ | Back to `draft` with reason | `POST /api/governments/:id/reject` `{ reason }` |
| Accept + provision | `platform_operator`+ | Sets entitlements, queues `initial_provision` | `POST /api/governments/:id/provision` `{ entitlements }` |
| Provision fail | `system` | `enrollment_status=error`, `last_deployment_error` | job row |
| Retry | `platform_operator`+ | `POST /api/governments/:id/redeploy` | existing job trigger `manual_redeploy` |
| Bootstrap invite | `system` on provision success | Create `invite_type='government_owner'` (new; not `bootstrap_ceo`) emailed/linked to claimant | `GET /api/invites/:token` |
| Accept owner invite | claimant session | Creates `government_memberships` owner, primary institution, `enrollment_status=active`, `bootstrap_status=ready` | `POST /api/invites/:token/accept` |
| Invite government staff | government `owner`/`admin` | `invite_type='government_join'` | `POST /api/governments/:id/members/invite` |
| Invite institution staff | institution `users:invite` | existing `POST /api/companies/:companyId/invites` | |
| Pause | government `owner` **or** platform `tenants.pause` | Heartbeats stop; portal read-only | `POST /api/governments/:id/pause` |
| Resume | same as pause | | `POST /api/governments/:id/resume` |
| Suspend | platform `tenants.suspend` (`platform_operator`+) | Entitlement or policy | `POST /api/governments/:id/suspend` `{ reason }` |
| Archive | platform `tenants.archive` only | Soft delete, release hostname after 30 days | `POST /api/governments/:id/archive` |

Government humans cannot archive the government. They can pause. They cannot edit entitlements.

### 4.3 First institution

On owner-invite accept:

1. Insert `companies` with `government_id`, `name = tenant_instances.municipality_name`, `kind='institution'`, `slug` from name+prefix, `public_portal_enabled=false`.
2. Set `tenant_instances.primary_institution_id`.
3. Insert `government_memberships` owner for the user.
4. Insert `institution_memberships` owner for the same user on the primary institution.
5. Call `grantsForHumanRole("owner")` and write `principal_permission_grants`.
6. `logActivity` with `company_id` = primary institution **and** a platform audit row (Chapter 5.10).

`POST /api/companies` today requires instance admin (`server/src/routes/institutions.ts` L122–124). To-be: creating the *first* institution is part of bootstrap (system). Creating *additional* institutions requires `government:institutions.create` and entitlement headroom.

### 4.4 Invariants during enrollment

- `draft` / `submitted`: no agent heartbeats, no public request intake, no plugin enablement.
- `provisioning` / `bootstrap`: platform may hit health; government UI shows setup checklist only.
- `paused` / `suspended`: `assertGovernmentActive` fails on mutations; GET allowed for roles with read.
- `archived`: all API except platform read → 404.
- `path_prefix` and `hostname` unique among non-archived rows (already unique indexes — archive must rewrite `path_prefix` to `/archived/{id}/{original}` or null hostname to free the route).

---

## 5. RBAC and permission matrix

### 5.1 Evaluation order (locked)

Implemented in `server/src/services/access.ts` (replace `canUser` / `hasPermission`) and called only via helpers in Chapter 5.9.

For a request against institution `C` in government `G`:

1. If `actor.type === "none"` → 401.
2. If `actor.type === "public"` → allow only entitlement-gated public portal routes; else 401.
3. If `actor.type === "system"` → allow only internal paths (scheduler, provisioner); else 403.
4. If `actor.type === "plugin"` → intersect manifest capabilities, `plugin_company_settings.enabled`, entitlement `plugins.allowed_keys`; else 403.
5. If `actor.type === "platform"` → allow if the **platform** permission is in the platform role bundle. Platform does **not** automatically receive government mutation rights except `platform_owner` and `platform_operator` on enrollment/pause/entitlements/provision routes. Platform `support`/`auditor` are read-only on government data.
6. If government `enrollment_status` not in `{ active, paused, suspended }` and the route is not enrollment/bootstrap → 403 `government_not_ready`.
7. If route is a mutation and `enrollment_status` in `{ paused, suspended }` and actor is not platform_operator+ → 403 `government_not_active`.
8. If `actor.type === "agent"` → membership active on `C`, grant contains key, entitlement allows the feature; else 403. Never inherit human roles.
9. If `actor.type === "user"`:
   1. Load `government_memberships` for `(G, user)`. If missing and no institution membership in `G` → 404.
   2. If government role is `owner` or `admin`, institution access to every institution in `G` is implied.
   3. Else require active `institution_memberships` on `C` (or on an ancestor institution when `parent_institution_id` chain includes `C` — **no**: child access does not flow downward from a parent membership unless role is owner/admin at government plane). Operator/viewer/auditor are institution-scoped.
   4. Effective permissions = `grantsForHumanRole(effectiveRole)` ∪ extra rows in `principal_permission_grants`.
   5. Extra grants may add keys; they must not add keys outside the role’s **ceiling** (see §5.4). Ceiling prevents an operator from being granted `users:manage_permissions`.
10. Entitlement check: if the permission implies a feature flag/limit, enforce Chapter 5.8. 402 `entitlement_denied` or 403 `entitlement_limit`.

`local_implicit` platform_owner skips government membership but still has a `governmentId` context when operating a local government row.

### 5.2 Permission keys

`PERMISSION_KEYS` in `packages/shared/src/constants.ts` is replaced by the union of the tables below. Existing seven keys keep their strings.

#### 5.2.1 Platform keys

| Key | Meaning |
|---|---|
| `platform:tenants.read` | List/get governments, jobs, overview |
| `platform:tenants.create` | Create draft governments |
| `platform:tenants.update` | Patch routing/notes before/after enroll |
| `platform:tenants.provision` | Provision, redeploy |
| `platform:tenants.pause` | Pause/resume any government |
| `platform:tenants.suspend` | Suspend |
| `platform:tenants.archive` | Archive |
| `platform:entitlements.read` | Read entitlement catalog values |
| `platform:entitlements.manage` | PUT entitlements |
| `platform:users.manage` | Promote/demote platform roles |
| `platform:adapters.install` | `POST /api/adapters/install` etc. |
| `platform:plugins.install` | Install/upgrade/uninstall plugin packages |
| `platform:settings.manage` | instance_settings general/experimental/provisioning |
| `platform:cloudflare.manage` | Cloudflare settings + validate |
| `platform:backups.manage` | `POST /api/instance/database-backups` |
| `platform:audit.read` | Cross-government audit |
| `platform:impersonate` | Reserved; **not granted to any role in this spec** (see Deferred) |

#### 5.2.2 Government keys

| Key | Meaning |
|---|---|
| `government:read` | Get government profile, routing, status |
| `government:update` | Patch display name, notes, branding at government level |
| `government:pause` | Pause/resume own government |
| `government:members.invite` | Invite government-plane humans |
| `government:members.manage` | Change government roles; suspend members |
| `government:institutions.create` | Create child institutions/departments |
| `government:institutions.archive` | Archive institutions |
| `government:entitlements.read` | See what the government may operate |
| `government:usage.read` | Usage vs entitlements |
| `government:routing.manage` | Request subdomain/custom domain (still platform-approved for DNS) |
| `government:audit.read` | Government-wide audit log |

#### 5.2.3 Institution keys (company-scoped)

Existing keys kept:

| Key | Meaning |
|---|---|
| `agents:create` | Hire/create agents |
| `users:invite` | Institution invite links |
| `users:manage_permissions` | Replace grants / change institution role |
| `tasks:assign` | Assign issues to agents/users |
| `tasks:assign_scope` | Scope JSON for chain-of-command assign |
| `joins:approve` | Approve/reject join requests |
| `environments:manage` | Create/update/delete environments |

New institution keys:

| Key | Meaning |
|---|---|
| `institutions:read` | Get institution, dashboard, org chart |
| `institutions:update` | Patch institution fields |
| `institutions:branding` | Logo/brand color (`server/src/routes/companies.ts` branding) |
| `agents:update` | Patch agent config, instructions |
| `agents:pause` | Pause/resume agents |
| `agents:terminate` | Terminate |
| `agents:invoke` | Manual heartbeat / wakeup |
| `agents:keys.manage` | Mint/revoke agent API keys |
| `tasks:create` | Create issues |
| `tasks:update` | Update issues |
| `tasks:comment` | Comment |
| `tasks:checkout` | Checkout / tree control |
| `approvals:decide` | Approve/reject/revision |
| `projects:manage` | Projects CRUD |
| `goals:manage` | Goals/objectives CRUD |
| `budgets:read` | Cost dashboards |
| `budgets:manage` | Upsert policies, resolve incidents |
| `costs:write` | Ingest cost events (agents typically) |
| `secrets:read` | List secret metadata |
| `secrets:manage` | Create/rotate/delete secrets |
| `plugins:enable` | Toggle `plugin_company_settings.enabled` |
| `plugins:configure` | Write `settings_json` |
| `portal:publish` | Enable public portal, publish request categories |
| `portal:moderate` | Moderate public requests/comments |
| `data:publish` | Publish open-data artifacts |
| `activity:read` | Institution activity log |
| `assets:manage` | Upload/delete assets |
| `workspaces:manage` | Execution workspaces |
| `org:manage` | Reparent agents |

### 5.3 `grantsForHumanRole()` (locked implementation)

File: `server/src/services/company-member-roles.ts`. **Must not return `[]`.**

Ceiling = the set below. Extra grants cannot exceed ceiling. `owner` ceiling is the full institution + government set for that plane.

#### Government-plane role → government keys

| Permission | owner | admin | operator | viewer | auditor |
|---|---|---|---|---|---|
| `government:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `government:update` | ✓ | ✓ | — | — | — |
| `government:pause` | ✓ | — | — | — | — |
| `government:members.invite` | ✓ | ✓ | — | — | — |
| `government:members.manage` | ✓ | ✓ | — | — | — |
| `government:institutions.create` | ✓ | ✓ | — | — | — |
| `government:institutions.archive` | ✓ | — | — | — | — |
| `government:entitlements.read` | ✓ | ✓ | ✓ | — | ✓ |
| `government:usage.read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `government:routing.manage` | ✓ | ✓ | — | — | — |
| `government:audit.read` | ✓ | ✓ | — | — | ✓ |

#### Institution-plane role → institution keys

| Permission | owner | admin | operator | viewer | auditor |
|---|---|---|---|---|---|
| `institutions:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `institutions:update` | ✓ | ✓ | — | — | — |
| `institutions:branding` | ✓ | ✓ | — | — | — |
| `agents:create` | ✓ | ✓ | — | — | — |
| `agents:update` | ✓ | ✓ | ◐ | — | — |
| `agents:pause` | ✓ | ✓ | ◐ | — | — |
| `agents:terminate` | ✓ | ✓ | — | — | — |
| `agents:invoke` | ✓ | ✓ | ✓ | — | — |
| `agents:keys.manage` | ✓ | ✓ | — | — | — |
| `users:invite` | ✓ | ✓ | — | — | — |
| `users:manage_permissions` | ✓ | ✓ | — | — | — |
| `joins:approve` | ✓ | ✓ | — | — | — |
| `tasks:assign` | ✓ | ✓ | ✓ | — | — |
| `tasks:assign_scope` | ✓ | ✓ | — | — | — |
| `tasks:create` | ✓ | ✓ | ✓ | — | — |
| `tasks:update` | ✓ | ✓ | ✓ | — | — |
| `tasks:comment` | ✓ | ✓ | ✓ | — | — |
| `tasks:checkout` | ✓ | ✓ | ✓ | — | — |
| `approvals:decide` | ✓ | ✓ | ✓ | — | — |
| `projects:manage` | ✓ | ✓ | ✓ | — | — |
| `goals:manage` | ✓ | ✓ | — | — | — |
| `budgets:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `budgets:manage` | ✓ | ✓ | — | — | — |
| `costs:write` | ✓ | ✓ | — | — | — |
| `environments:manage` | ✓ | ✓ | — | — | — |
| `secrets:read` | ✓ | ✓ | — | — | ✓ |
| `secrets:manage` | ✓ | ✓ | — | — | — |
| `plugins:enable` | ✓ | ✓ | — | — | — |
| `plugins:configure` | ✓ | ✓ | — | — | — |
| `portal:publish` | ✓ | ✓ | — | — | — |
| `portal:moderate` | ✓ | ✓ | ✓ | — | — |
| `data:publish` | ✓ | ✓ | — | — | — |
| `activity:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `assets:manage` | ✓ | ✓ | ✓ | — | — |
| `workspaces:manage` | ✓ | ✓ | ✓ | — | — |
| `org:manage` | ✓ | ✓ | — | — | — |

◐ = operator may update/pause agents in their reporting subtree only (`tasks:assign_scope` style `subtree:<agentId>` automatically bound to the operator’s linked agent if any; otherwise operator cannot patch agents). If the user has no linked agent, ◐ is —.

`invite-grants.ts` `humanJoinGrantsFromDefaults`: if `defaultsPayload.human.grants` is present, intersect with ceiling of `defaultsPayload.human.role`; else use `grantsForHumanRole(role)`.

### 5.4 Platform role matrix

| Permission | platform_owner | platform_operator | platform_support | platform_auditor |
|---|---|---|---|---|
| `platform:tenants.read` | ✓ | ✓ | ✓ | ✓ |
| `platform:tenants.create` | ✓ | ✓ | — | — |
| `platform:tenants.update` | ✓ | ✓ | — | — |
| `platform:tenants.provision` | ✓ | ✓ | — | — |
| `platform:tenants.pause` | ✓ | ✓ | — | — |
| `platform:tenants.suspend` | ✓ | ✓ | — | — |
| `platform:tenants.archive` | ✓ | ✓ | — | — |
| `platform:entitlements.read` | ✓ | ✓ | ✓ | ✓ |
| `platform:entitlements.manage` | ✓ | ✓ | — | — |
| `platform:users.manage` | ✓ | — | — | — |
| `platform:adapters.install` | ✓ | ✓ | — | — |
| `platform:plugins.install` | ✓ | ✓ | — | — |
| `platform:settings.manage` | ✓ | ✓ | — | — |
| `platform:cloudflare.manage` | ✓ | ✓ | — | — |
| `platform:backups.manage` | ✓ | ✓ | — | — |
| `platform:audit.read` | ✓ | ✓ | — | ✓ |
| `platform:impersonate` | — | — | — | — |
| Read government data (GET institution/agents/costs/activity) | ✓ | ✓ | ✓ | ✓ |
| Mutate government data (issues, agents, members) | — | — | — | — |
| Enrollment mutations (provision/pause/entitlements) | ✓ | ✓ | — | — |

Platform staff who need to operate a specific government must take a **government membership** (typically `auditor` or `operator`) rather than impersonating. That membership is audited.

### 5.5 Public / anonymous matrix

| Action | `public` actor | Entitlement |
|---|---|---|
| Search places/institutions | ✓ | none (only `active` governments) |
| View public institution page | ✓ | `portal.public_enabled` |
| Submit public request | ✓ if `portal.anonymous_submit`; else signed-in `user` | `portal.public_enabled` |
| Comment on public request | same | `portal.public_enabled` |
| Create place / start claim | authenticated user only | none |
| Anything under `/api/companies`, `/api/agents`, `/api/governments` | — | — |

### 5.6 Agent default grants

On agent create / join approve (`server/src/routes/access.ts` agent branch currently writes `agentJoinGrantsFromDefaults`):

| Agent role (`agents.role`) | Default grants |
|---|---|
| `ceo` | `agents:create`, `tasks:assign`, `tasks:assign_scope` `{ subtree: self }`, `joins:approve`, `goals:manage`, `budgets:read` |
| manager roles (`cto`, `cmo`, `cfo`, `pm`) | `tasks:assign` `{ subtree: self }`, `tasks:create`, `tasks:update`, `tasks:comment`, `tasks:checkout`, `costs:write`, `budgets:read` |
| others | `tasks:create`, `tasks:update`, `tasks:comment`, `tasks:checkout`, `costs:write` |

Board/human `agents:create` remains required to hire (`server/src/routes/agents.ts`). CEO `agents:create` still subject to `requireBoardApprovalForNewAgents` on the institution (`packages/db/src/schema/institutions.ts`).

Agents never receive `users:manage_permissions`, `secrets:manage`, `budgets:manage`, `portal:publish`, `government:*`, or `platform:*`.

### 5.7 Last-owner and last-platform-owner

Already sketched in `access.ts` member patch (SELECT … `membership_role = 'owner' FOR UPDATE`). Extend:

- Cannot demote/suspend the last active government `owner`.
- Cannot demote the last `platform_owner`.
- Cannot archive the primary institution while other institutions exist.
- `PUT` grants that would strip `users:manage_permissions` from the last owner → 409.

---

## 5.8 Entitlement catalog

Entitlements answer “may this **government** use feature X / up to N?” They are not RBAC. A government owner with `agents:create` still fails if `agents.max_count` is reached.

### 5.8.1 Storage

New table `government_entitlements`:

| Column | Type |
|---|---|
| `id` | uuid pk |
| `government_id` | uuid not null FK `governments.id` |
| `key` | text not null |
| `value_bool` | boolean null |
| `value_int` | integer null |
| `value_text` | text null |
| `value_json` | jsonb null |
| `updated_by_user_id` | text null |
| `created_at` / `updated_at` | timestamptz |

Unique `(government_id, key)`. Missing key → catalog default (not “unlimited”).

New table `government_usage_windows`:

| Column | Type |
|---|---|
| `government_id` | uuid not null |
| `window_kind` | text not null (`calendar_month_utc`) |
| `window_start` | timestamptz not null |
| `metric` | text not null |
| `amount` | integer not null default 0 |
| `updated_at` | timestamptz |

Unique `(government_id, window_kind, window_start, metric)`.

Metrics: `agents_active`, `heartbeats_concurrent`, `billed_cents`, `public_requests`, `storage_bytes`, `institutions_count`.

`cost_events` remain institution-scoped; roll up by `companies.government_id` into `billed_cents`.

### 5.8.2 Catalog

| Key | Type | Default | Enforcement |
|---|---|---|---|
| `agents.enabled` | bool | `true` | `POST /api/companies/:id/agents`, `/agent-hires` |
| `agents.max_count` | int | `10` | Count non-terminated agents in government |
| `agents.max_concurrent_heartbeats` | int | `3` | Heartbeat scheduler skip + 409 on manual invoke |
| `adapters.allowed_types` | json string[] | `["process","http","claude_local","codex_local","gemini_local","opencode_local","pi_local","cursor","openclaw_gateway","hermes_local","cloudflare_workers_ai"]` (subset of `AGENT_ADAPTER_TYPES`) | Agent create/update `adapterType`; 422 if not listed |
| `adapters.external_install` | bool | `false` | Government cannot call `/api/adapters/install` (platform only anyway). When false, government cannot *enable* an adapter type the platform has disabled (`setAdapterDisabled`) |
| `portal.public_enabled` | bool | `false` | Public institution pages + `POST /api/public/requests` |
| `portal.anonymous_submit` | bool | `true` | If false, public submit requires session |
| `data.publish_enabled` | bool | `false` | `data:publish` routes |
| `data.publish_categories` | json string[] | `[]` | Category allowlist for open data |
| `budgets.monthly_cents_cap` | int | `0` (0 = no platform cap; institution policies still apply) | Sum of institution `budget_policies` / spend cannot exceed cap; `budgets:manage` rejected if new policy would exceed |
| `budgets.hard_stop_required` | bool | `true` | Cannot set `hard_stop_enabled=false` on policies (`packages/db/src/schema/budget_policies.ts`) |
| `plugins.enabled` | bool | `false` | `plugins:enable` |
| `plugins.allowed_keys` | json string[] or `["*"]` | `[]` | Intersect with `plugins.plugin_key` |
| `plugins.max_count` | int | `0` | Enabled plugin_company_settings rows in government |
| `institutions.max_count` | int | `1` | Child institution create |
| `routing.subdomain` | bool | `false` | PATCH `routing_mode=subdomain` |
| `routing.custom_domain` | bool | `false` | PATCH hostname + custom domain flow |
| `storage.r2_gb_cap` | int | `5` | Asset upload 413 when over |
| `audit.retention_days` | int | `365` | Compaction job; auditors still read remaining |

Platform `PUT /api/governments/:id/entitlements` replaces the set (full PUT). Partial PATCH is not allowed (avoid silent defaulting). Body:

```json
{
  "items": [
    { "key": "agents.max_count", "valueInt": 25 },
    { "key": "portal.public_enabled", "valueBool": true },
    { "key": "adapters.allowed_types", "valueJson": ["claude_local", "cloudflare_workers_ai"] }
  ]
}
```

Unknown keys → 422. Platform-only. Logged as `entitlement.replaced`.

### 5.8.3 Feature mapping (what a government may operate)

| Capability | Entitlement gate | RBAC gate | Today’s code |
|---|---|---|---|
| Run agents | `agents.enabled` + `agents.max_count` | `agents:create` / invoke | `server/src/routes/agents.ts` |
| Choose adapters | `adapters.allowed_types` | `agents:update` | `AGENT_ADAPTER_TYPES`; install is platform (`server/src/routes/adapters.ts` `assertInstanceAdmin`) |
| Public citizen portal | `portal.public_enabled` | `portal:publish` to turn institution flag on | `server/src/routes/public-portal.ts`, `public_requests` |
| Open data publish | `data.publish_enabled` | `data:publish` | **no routes today** — add `POST /api/companies/:companyId/data-publications` |
| Budgets / spend | `budgets.monthly_cents_cap`, `budgets.hard_stop_required` | `budgets:manage` / `budgets:read` | `server/src/routes/costs.ts`, `server/src/services/budgets.ts` |
| Plugins | `plugins.enabled`, `allowed_keys`, `max_count` | `plugins:enable` | `plugin_company_settings`; install catalog is platform |
| Child departments | `institutions.max_count` | `government:institutions.create` | `POST /api/companies` instance-admin-only today |
| Custom domain | `routing.custom_domain` | `government:routing.manage` + platform DNS | `tenant_instances.hostname` |

### 5.8.4 HTTP errors for entitlements

| Code | When |
|---|---|
| `402` | Metered cap exceeded (`agents.max_count`, `storage.r2_gb_cap`, `budgets.monthly_cents_cap`) — payment/plan shaped |
| `403` `entitlement_denied` | Boolean entitlement false (`portal.public_enabled`, `plugins.enabled`) |
| `422` | Adapter type / plugin key / publish category not in allowlist |

Do not use 404 for entitlement failures (that is tenancy isolation).

---

## 5.9 Enforcement points

### 5.9.1 Helpers to add (single module)

File: `server/src/routes/authz.ts` (and `workers/api/src/lib/authz.ts` with identical signatures).

| Helper | Replaces | Behavior |
|---|---|---|
| `assertAuthenticated(req)` | existing | 401 if `none` |
| `assertPlatformRole(req, minRole \| permissionKey)` | `assertInstanceAdmin` | Platform plane. `assertInstanceAdmin` becomes a deprecated wrapper for `platform:tenants.read` **not** full admin — call sites must switch to a permission key |
| `assertGovernmentAccess(req, governmentId)` | new | Membership or platform read |
| `assertGovernmentPermission(req, governmentId, key)` | new | Government keys |
| `assertCompanyAccess(req, companyId)` | existing, **tighten** | Resolve institution → `government_id`; require government context match; then membership/inheritance; **no** “any board session with companyIds” without role; **no** local_implicit skip unless platform_owner in local_trusted |
| `assertCompanyPermission(req, companyId, key, scope?)` | move out of `access.ts` | After access, evaluate §5.1 |
| `assertGovernmentActive(req, governmentId)` | new | Mutations require `enrollment_status=active` (or platform pause/resume routes) |
| `assertEntitlement(req, governmentId, key, opts?)` | new | Chapter 5.8 |
| `assertBoard(req)` | existing | **Deprecated.** Rewrite to `assertAuthenticated` + human actor (`platform` or `user`). Must not mean “full control” |
| `assertBoardOrgAccess(req, orgId)` | existing | If `orgId==="instance"` → `assertPlatformRole(req, "platform:tenants.read")`; else treat `orgId` as `governmentId` or institution id explicitly (`kind` query) |

`server/src/routes/instance-settings.ts` `assertCanManageInstanceSettings` (board + instance admin) → `assertPlatformRole(req, "platform:settings.manage")`.

`access.canUser` must **stop** short-circuiting all keys for instance admins. Platform short-circuit applies only to `platform:*` keys. Government data uses platform read rules in §5.4.

`grantsForHumanRole` and `humanJoinGrantsFromDefaults` must return the matrices in §5.3.

### 5.9.2 Route files that must change

Every file below currently calls `assertCompanyAccess` and/or `assertBoard` and/or `assertInstanceAdmin` without a permission key (except `access.ts` and parts of `agents.ts` / `environments.ts`).

| File | Today | To-be helper(s) |
|---|---|---|
| `server/src/routes/authz.ts` | coarse access | implement §5.9.1 |
| `server/src/middleware/auth.ts` | board/agent/none; cloud_tenant elevates admin | new actor union; resolve `governmentId` |
| `server/src/middleware/board-mutation-guard.ts` | CSRF for `type==="board"` | apply to `user` and `platform` |
| `server/src/services/access.ts` | `canUser` admin bypass; no government | evaluation order §5.1 |
| `server/src/services/company-member-roles.ts` | empty grants | role bundles |
| `server/src/services/invite-grants.ts` | empty grants | ceiling intersect |
| `server/src/routes/access.ts` | `assertCompanyPermission` local; instance admin promote | government + institution member APIs; `PUT /api/platform/users/:id/role` |
| `server/src/routes/instance-settings.ts` | `assertBoardOrgAccess("instance")` | platform permissions; government CRUD aliases |
| `server/src/routes/instance-database-backups.ts` | `assertInstanceAdmin` | `platform:backups.manage` |
| `server/src/routes/adapters.ts` | GET public; mutations instance admin | GET: authenticated; mutations `platform:adapters.install`; government agent adapter type still entitlement-checked on agent routes |
| `server/src/routes/institutions.ts` / `companies.ts` | create = instance admin; patch = any company access | create = `government:institutions.create`; patch = `institutions:update`; branding = `institutions:branding`; archive = `government:institutions.archive`; export/import = owner/admin |
| `server/src/routes/agents.ts` | mix of access + `agents:create` | map pause/invoke/keys/org to new keys; list requires `institutions:read` |
| `server/src/routes/issues.ts` / `requests.ts` | access only | create/update/comment/checkout keys; agents keep checkout rules |
| `server/src/routes/issue-tree-control.ts` | `assertBoard` + access | `tasks:checkout` |
| `server/src/routes/projects.ts` | access | `projects:manage` on writes; read `institutions:read` |
| `server/src/routes/objectives.ts` / `goals.ts` | access | `goals:manage` on writes |
| `server/src/routes/approvals.ts` | access; board for some | `approvals:decide` |
| `server/src/routes/costs.ts` | access; board for finance write / budget patch | `budgets:read` / `budgets:manage` / `costs:write`; cap entitlement |
| `server/src/routes/secrets.ts` | `assertBoard` + access | `secrets:read` / `secrets:manage` |
| `server/src/routes/environments.ts` | `environments:manage` already | add entitlement none; keep grant |
| `server/src/routes/execution-workspaces.ts` | access | `workspaces:manage` on writes |
| `server/src/routes/assets.ts` | access | `assets:manage` on writes; storage cap |
| `server/src/routes/activity.ts` | access; board for some | `activity:read`; government audit route separate |
| `server/src/routes/dashboard.ts` | access | `institutions:read` |
| `server/src/routes/sidebar-badges.ts` | access + `joins:approve` | keep |
| `server/src/routes/public-portal.ts` | mostly open | entitlement + auth on `POST /places` |
| `server/src/routes/plugins.ts` | `canAccessCompany` coarse; `route.auth === "board"` | `plugins:enable` / `plugins:configure`; plugin actor type; `platform:plugins.install` for install when those routes exist |
| `server/src/routes/user-profiles.ts` | access | self or `users:manage_permissions` |
| `workers/api/src/lib/authz.ts` | coarse | **same helpers** |
| `workers/api/src/routes/*.ts` | `assertCompanyAccess` everywhere | same mapping as Express |
| `workers/dispatcher/src/index.ts` | route lookup | attach government header; refuse archived |

`assertBoard` call sites that mean “human operator, not agent” (e.g. secrets, some cost writes) become `assertCompanyPermission(..., key)` instead of a blanket board check. Agents with `costs:write` may still POST cost events (`server/src/routes/costs.ts` already allows agents for their own `agentId`).

### 5.9.3 Middleware resolve order

`actorMiddleware` then `resolveGovernmentMiddleware`:

1. Parse host / path prefix / header (`packages/shared/src/tenant-routing.ts`).
2. Load `tenant_instances`.
3. Set `req.government`.
4. If actor is `user` and memberships exist in a different government only → 403.

Platform routes under `/api/instance/*`, `/api/platform/*`, `/api/admin/*`, `/api/adapters`, `/api/plugins` (install) skip government resolution.

### 5.9.4 UI enforcement

One Next.js app (`apps/landing`):

- Hide nav items the session’s permission set does not include (same keys; API remains authoritative).
- Platform pages (`InstanceTenants`, `InstanceCloudflareSettings`, `InstanceAdminOverview`) require a platform actor; government users hitting `/admin/instance/*` → 404.
- Government settings show entitlements as read-only.
- Viewer/auditor: mutation buttons not rendered; API still 403 if called.

---

## 5.10 Audit log requirements

### 5.10.1 Two streams

| Stream | Table | Scope |
|---|---|---|
| Institution activity | `activity_log` (existing) | Work: issues, agents, costs, approvals |
| Government / platform audit | `audit_log` (new) | Tenancy, RBAC, entitlements, enrollment, platform settings |

`activity_log` stays the operator-facing work timeline (`GET /api/activity`, live event `activity.logged`). It is **not** sufficient for tenancy/RBAC because `company_id` is required and tenant mutations have no company.

### 5.10.2 `activity_log` columns to add

`packages/db/src/schema/activity_log.ts`:

| Column | Type | Notes |
|---|---|---|
| `government_id` | uuid not null FK `governments.id` | Backfill from `companies.government_id` |
| `actor_role` | text null | Snapshot of platform/government role at write time |
| `request_id` | text null | Correlate with structured logs (`doc/SPEC-implementation.md` §15.3) |
| `ip` | text null | For membership/invite/portal submits; redacted in UI for non-auditors |

`company_id` remains not null for this table (work is always institution-scoped). Index `(government_id, created_at)`.

`LogActivityInput` in `server/src/services/activity-log.ts` requires `governmentId`. Call sites that only have `companyId` load it from the institution row.

### 5.10.3 `audit_log` (new)

| Column | Type |
|---|---|
| `id` | uuid pk |
| `government_id` | uuid null | Null = platform-global (settings, adapter install, platform role change) |
| `actor_type` | text not null | `user \| agent \| plugin \| system` |
| `actor_id` | text not null |
| `actor_role` | text null |
| `action` | text not null |
| `entity_type` | text not null |
| `entity_id` | text not null |
| `details` | jsonb | Redacted via existing `sanitizeRecord` / `redactCurrentUserValue` |
| `request_id` | text null |
| `ip` | text null |
| `created_at` | timestamptz not null default now() |

Indexes: `(government_id, created_at)`, `(action, created_at)`, `(entity_type, entity_id)`.

Retention: `audit.retention_days` per government; platform-global rows retain 730 days.

Reads:

- `GET /api/governments/:governmentId/audit` — `government:audit.read` or `platform:audit.read`
- `GET /api/platform/audit` — `platform:audit.read` only

Writes are append-only. No PATCH/DELETE API.

### 5.10.4 Required actions

#### Enrollment / tenancy (`audit_log`)

| Action | When |
|---|---|
| `government.claim_started` | POST places / POST governments draft |
| `government.submitted` | submit |
| `government.rejected` | platform reject |
| `government.provision_queued` | initial_provision job |
| `government.provision_succeeded` / `government.provision_failed` | job terminal |
| `government.bootstrap_ready` | bootstrap_status ready |
| `government.activated` | first owner accept |
| `government.paused` / `government.resumed` | pause/resume |
| `government.suspended` / `government.unsuspended` | |
| `government.archived` | |
| `government.routing_updated` | path/subdomain/custom_domain/hostname |
| `government.custom_domain_verified` | |
| `institution.created` / `institution.archived` | child institutions |
| `entitlement.replaced` | PUT entitlements (details: previous vs next keys, not secrets) |

#### RBAC (`audit_log`)

| Action | When |
|---|---|
| `platform_role.granted` / `platform_role.revoked` | replaces unimplemented `instance_admin.promoted/demoted` from `doc/plans/2026-02-21-humans-and-permissions-implementation.md` |
| `government_member.invited` | |
| `government_member.activated` | |
| `government_member.role_changed` | |
| `government_member.suspended` | |
| `membership.activated` | institution (also keep `activity_log` if desired) |
| `permission.granted` / `permission.revoked` | grant replace; details `permissionKey` list |
| `invite.created` / `invite.revoked` | already on activity for company invites; **also** audit_log for government invites |
| `join.requested` / `join.approved` / `join.rejected` | keep activity; copy to audit when request_type=human |
| `agent_api_key.claimed` / `agent_api_key.revoked` | |
| `board_api_key.revoked` | already `board_api_key.revoked` in access.ts activity |

Today `promoteInstanceAdmin` / `demoteInstanceAdmin` (`server/src/routes/access.ts` L4307–4385) do **not** log. That is a defect; the new endpoints must write `audit_log`.

Today tenant create/pause/archive (`server/src/routes/instance-settings.ts`) do **not** log. They must write `audit_log`.

#### Work mutations (`activity_log`) — keep existing actions

Including but not limited to (already in server): `company.created|updated|archived|imported`, `issue.created|updated|comment_added`, `project.*`, `goal.*`, `approval.*`, `secret.*`, `environment.*`, `budget.*`, `invite.revoked`, `join.approved|rejected`, `company_member.permissions_updated`, `instance.settings.*`.

New work actions:

| Action | When |
|---|---|
| `portal.public_enabled` | institution flag flip |
| `portal.request_published` | public request create (in addition to `issue.created`) |
| `data.publication_created` | open data |
| `plugin.enabled` / `plugin.disabled` | institution settings |
| `adapter.type_denied` | entitlement reject (optional debug; if logged, no payload secrets) |

### 5.10.5 Attribution rules

- Every mutation listed in §5.10.4 writes **before** commit completes (same transaction as the mutation).
- `actor_id` never `"board"` except `local_implicit` which uses `userId: "local-board"` and `actor_role: "platform_owner"`.
- Plugin-attributed work uses `actor_type: "plugin"`.
- Public anonymous submit uses `actor_type: "system"`, `actor_id: "public-portal"`, details `{ submissionMode }` (already partially in `public-portal.ts`).
- Secret values, API keys, Cloudflare tokens, invite raw tokens never appear in `details` (existing redaction in `activity-log.ts`).
- Auditors (`government:audit.read` / `platform:audit.read`) see `ip` and `request_id`. Viewers using `activity:read` do not see `ip`.

### 5.10.6 Integrity

- Application INSERT only; DB role used by the API cannot UPDATE/DELETE `audit_log` (Postgres GRANT). Soft-fail if the GRANT is not applied in `local_trusted`.
- Platform audit export: `GET /api/platform/audit?from&to&governmentId` CSV/JSON for `platform_auditor`+.

---

## 6. Domain objects and physical table map

### 6.1 Vocabulary

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

### 6.2 Tenancy stack (TO-BE)

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

### 6.3 Physical tables — AS-IS columns (Postgres `packages/db`)

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

**TO-BE:** extend `BUDGET_SCOPE_TYPES` in `packages/shared/src/constants.ts` with `government`. For `scope_type=government`, `scope_id` = `governments.id` and `company_id` is the **primary institution of the acting board** or a dedicated platform-policy sentinel institution — see §7.3. Prefer a dedicated `government_id` column on the policy row so government quotas do not overload `company_id`. Add `government_id uuid` (nullable for legacy institution/agent/project policies; required for `scope_type=government`). Extend `BUDGET_METRICS` with `token_count` and `run_count` in addition to `billed_cents`.

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

### 6.4 New table: `governments`

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

### 6.5 New table: `usage_daily`

Materialized nightly (and on-demand rebuild) from `cost_events` + `finance_events`. Warehouse-safe. Same schema on Postgres and D1.

See §7.5 for columns, uniqueness, and the export allowlist.

### 6.6 Dual-schema gap (must not stay silent)

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

## 6.7 Invariants and current code gaps

Required behavior is the V1 contract in `doc/SPEC-implementation.md`. Gaps are measured against **current code**, not against docs.

### 6.7.1 Single assignee

**Required:** one `assignee_agent_id` per request. No multi-assignee.

**AS-IS:** schema is a single UUID column (`packages/db/src/schema/requests.ts`). Org tree is `agents.reports_to` (strict tree).

**Gap:** checkout can overwrite `assignee_agent_id` without a conflict predicate (see §6.7.2). Single-column schema is not enough if the write is unconditional.

### 6.7.2 Atomic checkout — REQUIRED, currently broken on both runtimes

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

### 6.7.3 Approvals

**Required:** hire, CEO strategy, budget override, board-requested approval. Board approve/reject. Activity on decision.

**AS-IS:** tables and routes exist on Express (`server/src/routes` approval module) and Workers (`workers/api/src/routes/approvals.ts`: list/create, approve/reject/request-revision/resubmit, comments). Inbox surfaces pending approvals (`apps/landing/src/admin/pages/Inbox.tsx`). Dedicated pages `/approvals/pending|all/:id` exist in `App.tsx` but are **not** in `Sidebar.tsx`.

**Gap:** none that voids the invariant. Keep Inbox as the compact surface; keep deep links.

### 6.7.4 Heartbeat

**Required:** invoke / status / cancel; skip when agent or institution is paused or budget-blocked; persist `heartbeat_runs`.

**AS-IS Express:** `server/src/services/heartbeat.ts` is a **9720-line** module (file ends at the service object close ~line 9720). Routes: `POST /api/agents/:id/heartbeat/invoke`, `POST /api/agents/:id/wakeup`, `GET /api/companies/:companyId/heartbeat-runs`, `GET /api/heartbeat-runs/:runId`, `POST /api/heartbeat-runs/:runId/cancel`, events/log/workspace-operations, watchdog-decisions. Consults `budgets.getInvocationBlock` in multiple invoke paths.

**AS-IS Workers:** `workers/api/src/lib/hosted-heartbeats.ts` (~800 lines) runs Workers AI via `@ciutatis/adapter-cloudflare-workers-ai`. Routes in `workers/api/src/routes/agents.ts`: invoke, list runs, get, cancel, events, log. No process/CLI adapters.

**Lock:** do **not** port the 9720-line module to Workers. Extract a small shared contract (checkout, budget block, wakeup queue, run status machine) into a package both runtimes call. Process adapters stay Express/self-host only (`selfhost-only`). Hosted uses queue + Workers AI (`hosted-only` adapter type `cloudflare_workers_ai`).

### 6.7.5 Budget hard-stop

**Required** (`SPEC-implementation.md` §13.2): 80% soft warn; at 100% pause the scope, block new checkout/invocation, emit high-priority activity (`budget.hard_threshold_crossed`). Board may raise budget or resume.

**AS-IS Express:** `server/src/services/budgets.ts` implements `hardStopEnabled`, `pauseAndCancelScopeForBudget`, `getInvocationBlock`. Cost ingest in `server/src/services/costs.ts` calls `budgets.evaluateCostEvent(event)` after insert. Heartbeat consults `getInvocationBlock`.

**AS-IS Workers:** `GET /api/companies/:companyId/budgets/overview` returns `policies: []`, `activeIncidents: []` (`workers/api/src/routes/costs.ts` ~431–456). `GET …/costs/quota-windows` returns `[]`. There is **no** `POST …/budgets/policies`. Cost ingest (`POST …/cost-events`) inserts the row, logs `cost.reported`, and **does not** evaluate policies or pause anyone.

**Gap:** hosted civic SaaS currently has **no hard-stop**. That is a silent subset of the REQUIRED invariant. Phase 0 must implement evaluate-on-ingest on Workers or fail closed (reject cost ingest / block invoke when policies cannot be evaluated). Empty `policies: []` is forbidden once a government has a budget.

### 6.7.6 Activity log

**Required:** every mutation writes `activity_log` (`SPEC-implementation.md` §15.3).

**Gaps:**

- Express checkout: no log.
- Workers finance-events POST (`workers/api/src/routes/costs.ts` ~97–115): insert only, no `logActivity`.
- Express cost-events and most board mutations do log.

### 6.7.7 Company / institution boundary

**Required:** every entity scoped; `assertCompanyAccess`; agent keys cannot cross company (`server/src/routes/authz.ts`).

**Gap:** Express checkout skips the check. Instance admins and `local_implicit` board bypass company allowlists by design — acceptable only when `local_trusted` is loopback (see Chapter 10).

### 6.7.8 Key hashing

**Required:** store only hashed agent API keys (`SPEC-implementation.md` §16).

**AS-IS:** SHA-256 hex. Express `server/src/middleware/auth.ts` `hashToken`. Workers `workers/api/src/lib/crypto.ts` WebCrypto SHA-256. Acceptable for high-entropy bearer tokens. Do not switch to bcrypt/argon2 for these tokens. Never warehouse-export `key_hash`.

### 6.7.9 Silent subset inventory (contract violations)

| # | Symptom | Express | Workers | Required close |
|---|---|---|---|---|
| 1 | Atomic checkout | Unconditional UPDATE; no company access | JS check then unconditional UPDATE | Both: SQL predicate + 409 |
| 2 | Objectives API | `server/src/routes/objectives.ts` exists, **not mounted** in `server/src/app.ts` | `objectiveRoutes` mounted | Mount Express `objectiveRoutes` |
| 3 | `/api/institutions` alias | Missing (only `/api/companies`) | Mounted | Mount alias on Express |
| 4 | `server/src/routes/requests.ts` | Stub 404 “Request system not available” | Real `requestRoutes` on `/issues` | Do not mount the stub; keep `issueRoutes` as the implementation; add `/api/requests` alias that hits the same handlers |
| 5 | Budget overview / policies / hard-stop | Real | Stub empty arrays; no policy POST; no evaluate on ingest | Implement or fail closed |
| 6 | Provider `quota-windows` | Real scrape (`server/src/services/quota-windows.ts`) | Always `[]` | Annotate `selfhost-only` **or** implement; civic quotas are `budget_policies` (§7.3), not provider scrape |
| 7 | Plugins | Real | `workers/api/src/routes/plugins.ts` stubs (`c.json([])` / “not available”) | Annotate `selfhost-only` until hosted plugins exist |
| 8 | Geo search | No `/api/public/geo/*` | `GET /api/public/geo/search`, `/geo/by-path`, `/geo/children` | Annotate `hosted-only` |
| 9 | Environments / tree holds / watchdog | Present | Tables missing | Annotate or port |
| 10 | `local_trusted` on a public Worker | Loopback + private enforced in `server/src/index.ts` | Default `DEPLOYMENT_MODE` is `local_trusted` (`workers/api/src/middleware/auth.ts`) → implicit board on whatever host | Forbid for civic SaaS |

---

## 7. Usage schema

Nothing in this section exists as `government_id` today. `CostEvent` in `packages/shared/src/types/cost.ts` has `companyId` + `agentId` only. Costs UI is agent/project spend, not government rollup.

### 7.1 `government_id` on usage rows

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

### 7.2 Civic quotas vs provider quota-windows

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

### 7.3 Invoice views (computed API, not a secrets table)

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

### 7.4 Costs UI change

`apps/landing/src/admin/pages/Costs.tsx` today: metric tiles, **By agent**, By project, provider quota cards, finance ledger.

TO-BE default for civic SaaS:

1. Government rollup tiles (net cents, tokens, run count, institution count, channel count, hard-stop incidents).
2. By institution table.
3. By channel (agent) drill-down — keep current “By agent” as this.
4. By project.
5. Finance ledger (institution-scoped still available).
6. Provider quota cards only if the runtime implements quota-windows; otherwise hide (do not show empty “0%” cards from `[]`).

Platform export lives under instance settings, not this page.

### 7.5 `usage_daily` export columns

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

### 7.6 Ingest paths (unchanged URLs, new stamp)

- `POST /api/companies/:companyId/cost-events` — board or agent (own `agentId` only). Validate `createCostEventSchema`. Stamp `government_id`. Then `evaluateCostEvent` including government policies. Activity `cost.reported`.
- `POST /api/companies/:companyId/finance-events` — board only. Stamp `government_id`. Activity `finance.recorded`.

Agent cannot POST finance events. Agent cannot set government budgets.

---

## 8. API groups

Base path `/api`. Dual-write aliases until Phase 4: `/api/companies` ≡ `/api/institutions`, `/api/issues` ≡ `/api/requests`, `/api/goals` ≡ `/api/objectives`. Civic names are canonical in this spec; old paths stay implemented.

Error semantics stay `400/401/403/404/409/422/500` (`SPEC-implementation.md` §10.9).

### 8.1 Platform (instance admin)

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

### 8.2 Government / institution (board session)

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

### 8.3 Agent (bearer `agent_api_keys.key_hash`, optional `X-Paperclip-Run-Id`)

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

## 8.4 Dual runtime

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

## 9. Board pages: stay vs platform-only vs delete

UI lives in `apps/landing/src/admin/` (not `ui/`). Router: `apps/landing/src/admin/App.tsx`. Government/institution nav: `Sidebar.tsx`. Platform nav: `InstanceSidebar.tsx`. Board routes are prefixed by `:companyPrefix` (institution issue prefix).

Compact board rule: civic labels already in the sidebar (New Request, Requests, Objectives, Institution). Do not add My Issues. Approvals stay in Inbox plus deep links.

### 9.1 Stay — government / institution board (compact)

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

### 9.2 Platform-only — `/instance/settings/*`

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

### 9.3 Public (not board)

`PublicSite`, `PublicPortalPage`, `PublicPortalRequestPage`, `GovOpsPage`, `ScrutinyPage`, `AuthPage`, `InviteLandingPage`, `CouncilClaimPage`. Citizen and marketing. No agent keys, no costs ledger, no secrets.

### 9.4 Delete from product surface

| File | Why |
|---|---|
| `apps/landing/src/admin/pages/MyIssues.tsx` | Dead. Not imported in `App.tsx`. Filters unassigned non-terminal issues, labels them “My Issues”, links to `/issues/...`. Civic board already has Requests + Inbox. **Delete the file.** |
| `apps/landing/src/admin/pages/IssueDetail.tsx` | Orphan. Routes use `RequestDetail`. `IssueDetail.test.tsx` still tests the orphan. **Delete the page.** Move still-valid tests onto `RequestDetail` or delete them. Keep `apps/landing/src/admin/lib/issueDetailBreadcrumb.ts` (used by `RequestDetail`, `Requests`, `Inbox`). |
| `apps/landing/src/admin/pages/RunTranscriptUxLab.tsx` | Routed at `tests/ux/runs` (board + unprefixed redirect). Not a civic or platform operator page. **Unroute and delete** from product; keep fixtures only if unit tests need them. |
| `apps/landing/src/admin/pages/IssueChatLongThreadPerf.tsx` | Unrouted. **Delete.** |
| `apps/landing/src/admin/pages/SystemNoticeUxLab.tsx` | Unrouted. **Delete.** |

Do not ship a “My Issues” nav item. Operator work is Requests + Inbox.

---

## 10. Security

### 10.1 Checkout hole (P0)

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

### 10.2 Key hashing

- Create: generate high-entropy token, return plaintext once (`AgentKeyCreated.token`), store SHA-256 hex in `agent_api_keys.key_hash`.
- Auth: hash presented bearer, lookup `key_hash` where `revoked_at IS NULL`.
- List keys: never return `keyHash` (Workers already strips).
- Warehouse: denylist `key_hash`.
- Do not log the bearer. Redact `Authorization` headers (`SPEC-implementation.md` §16).

### 10.3 `local_trusted` never public

Canonical model: `doc/DEPLOYMENT-MODES.md`. Constants: `DEPLOYMENT_MODES` / `DEPLOYMENT_EXPOSURES` in `packages/shared/src/constants.ts`. Config: `packages/shared/src/config-schema.ts` superRefine — `local_trusted` ⇒ `exposure=private`.

Express boot (`server/src/index.ts` ~417–425): throws if `local_trusted` and host is not loopback, or exposure is not `private`.

Workers (`workers/api/src/middleware/auth.ts`): `DEPLOYMENT_MODE` default **`local_trusted`**, which sets `actor = { type: "board", userId: "local-board", isInstanceAdmin: true, source: "local_implicit" }` for every request without a bearer. On a public Worker this is implicit superuser.

**Lock:** civic SaaS production is `authenticated` + `public` with explicit `auth.publicBaseUrl`. `local_trusted` is forbidden on `workers/api` production and on any non-loopback host. Health/doctor must fail the deploy if `DEPLOYMENT_MODE=local_trusted` and the Worker is internet-reachable.

### 10.4 Secrets and export

- Secrets at rest: `company_secrets` / `company_secret_versions.material`.
- Redact `adapter_config`, env, auth headers in logs.
- Institution portability already strips secrets (`SPEC-implementation.md` §21).
- Warehouse feed: §7.5 denylist.
- CSRF on board session mutations; rate-limit key mint and auth (`SPEC-implementation.md` §16).

### 10.5 Agent JWT

Workers `verifyLocalAgentJwt` is a second agent auth path (`ActorSource` includes `agent_jwt`). Company id in claims must match `agents.company_id`. Same checkout and cost-report rules as hashed keys. JWT material never exported.

---

## 11. Migration phases

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

1. Publish the path list from Chapter 8 in `packages/shared` (constants + `RUNTIME_AVAILABILITY`).
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


## 12. Open implementation backlog

Ordered and testable. Engineering sequence, not a calendar.

### 12.1 Implementation order (tenancy / RBAC)

1. Schema: `government_id` on `companies`, `government_memberships`, `government_entitlements`, `audit_log`, `activity_log.government_id`; expand `INSTANCE_USER_ROLES`; backfill.
2. `grantsForHumanRole` + `humanJoinGrantsFromDefaults` + stop `canUser` admin bypass for institution keys.
3. New actor union + government resolver middleware.
4. Move `assertCompanyPermission` to `authz.ts`; migrate route files in §5.9.2.
5. `/api/governments` and enrollment state machine; alias old tenant paths.
6. Entitlement checks on agents, portal, plugins, budgets, institutions.max_count, routing.
7. `audit_log` writers for tenancy/RBAC; fix missing logs on instance-admin and tenant pause.
8. Workers parity.
9. Next.js nav + government-prefixed board routes; retire issue-prefix-only URLs via redirect.



### 12.2 From domain / usage (phases)

See Chapter 11. Phase 0 (checkout, Express objectives mount, Workers budget hard-stop) is a **launch blocker** for any government enrollment work being called “done.”

### 12.3 Acceptance (must all be true)

**Tenancy / RBAC**

#### Tenancy / RBAC acceptance

1. No `companies` row exists without `government_id`.
2. No route that mutates institution data succeeds on `assertCompanyAccess` alone; it calls `assertCompanyPermission` with a key from §5.2 (or platform enrollment helpers).
3. `grantsForHumanRole("viewer")` is non-empty and does not include mutation keys; a viewer session receives 403 on `POST /api/companies/:id/agents`.
4. `grantsForHumanRole("auditor")` includes `government:audit.read` and `activity:read` and no mutation keys.
5. Platform `platform_support` can GET another government’s costs and cannot PATCH members or PUT entitlements.
6. `PUT /api/governments/:id/entitlements` by a government owner returns 403.
7. Agent create fails with 402 when `agents.max_count` is reached even for government owner.
8. `POST /api/public/requests` returns 403 `entitlement_denied` when `portal.public_enabled` is false.
9. Tenant pause/archive writes `audit_log` (today it does not).
10. `workers/api` authz matches Express helper semantics on the mapped routes.
11. One Next.js app serves public path-tenant pages and `/admin` operator UI; no second SPA package is introduced.
12. `pnpm -r typecheck`, `pnpm test:run`, and `pnpm build` pass after implementation, including tests that `grantsForHumanRole` is non-empty and `assertCompanyAccess` does not allow a viewer to mutate.

---



**Domain / usage**

#### Domain / usage acceptance

These chapters are the build contract for GovOps domain + usage when:

1. Invariants in §6.7 are implemented (Phase 0), not merely documented.
2. `government_id` is on cost/finance rows and `usage_daily` matches §7.5.
3. Board vs platform vs deleted pages match Chapter 9.
4. Both runtimes honor Chapter 8 paths or annotated 501s — no silent subset.
5. `local_trusted` cannot run on public Workers; checkout cannot skip company access.
6. Warehouse export contains only the CSV allowlist.



### 12.4 File index (citations)

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



---

## Appendix A — UI host (identical in both product specs)

The only human product UI is Next.js `apps/landing` (`@ciutatis/landing`).

### A.1 Keep

| Surface | Path | Notes |
|---|---|---|
| Public civic site | `apps/landing/lib/routes.ts`, `app/PublicApp.tsx` | `/`, `/govops`, `/scrutiny`, `/explore`, `/portal`, `/collaborate`, `/ar`, locales |
| Government board | `/admin/:issuePrefix/...` via `src/admin/App.tsx` `councilRoutes()` | Compacted per GovOps chapter 9 |
| Platform admin | `/admin/instance/settings/*` | Tenants, Cloudflare, experimental, plugins |
| Data studio (civic data platform) | `/data/*` and `/admin/:prefix/data/*` | Specified in civic-data-platform.md |

### A.2 Delete as separate sites (target state, not this docs PR)

| Remove | Path | Fold into |
|---|---|---|
| Superparser portal | `apps/superparser-portal/` | `/data/new` |
| Status Worker HTML | `workers/status/src/index.ts` UI | `/status` in Next; cron/JSON may remain API-only |
| Dispatcher tenant HTML | `workers/dispatcher` Tandil/`__tenant` HTML | Dispatcher becomes proxy only |
| Tenant-runtime placeholder HTML | `workers/tenant-runtime` | Delete UI; keep health if still a dispatch template |
| Express static UI | `SERVE_UI`, `server/ui-dist` | Self-host operators use landing or API-only |
| SPA public clones | `src/admin/pages/PublicSite.tsx`, `GovOpsPage.tsx`, `ScrutinyPage.tsx`, `PublicPortalPage.tsx`, `PublicPortalRequestPage.tsx` and their `/admin` routes in `App.tsx` | Next `PublicApp` is canonical |

Mintlify `docs/` stays **developer documentation**, not a product site.

Keep as infrastructure (not sites): `workers/api`, dispatcher-as-proxy, `apps/superparser-service` (ingest worker).

### A.3 Dual public implementations

Next `PublicApp` is the only public renderer. Routes under `BrowserRouter` basename `/admin` must not re-serve marketing/portal/govops/scrutiny. `admin.ciutatis.com` continues to rewrite into `/admin` (`apps/landing/next.config.ts`).

### A.4 Status

Add public route `/status` (and `/es/estado`) in `lib/routes.ts`, fed by existing health JSON (`GET /api/health` and the status worker’s snapshot if retained as API). Retire `status.ciutatis.com` as a separate HTML Worker.

### A.5 Keyboard, empty, error (board)

Keep: Cmd/Ctrl+K, `C` new request, `[` / `]` sidebar/panel (`src/admin/hooks/useKeyboardShortcuts.ts`). Empty states use `EmptyState`; lists use `PageSkeleton`; mutations toast `ApiError`. Civic copy: Institution / Request / Objective / Channel. HTTP clients stay on Paperclip paths (`issuesApi`, `companiesApi`).
## Appendix B — Deferred

Labeled deferred items. Everything else in chapters 4–10 is in scope for the GovOps control plane.

### Deferred.1 Cross-government users without explicit context

SSO users in many governments already must send host/path/header. A government picker UI is in the UI spec; automatic “union queries across governments” for a single inbox is deferred.

### Deferred.2 `platform:impersonate`

No impersonation of government users. Platform staff take an audited membership instead.

### Deferred.3 Fine-grained field-level RBAC

No per-field ACLs (hide budget numbers from operators, etc.). Viewer vs auditor is the granularity.

### Deferred.4 Agent principals on `government_memberships`

Agents stay institution-scoped. A “government-wide agent” is deferred.

### Deferred.5 Separate physical DB per government on Postgres

Cloudflare already provisions per-tenant D1/KV/R2. Postgres remains shared-schema with `government_id` filters. Row-level security policies in Postgres are deferred (app-level filters are mandatory now).

### Deferred.6 Billing / invoicing of entitlements

Entitlements are enforced caps. Charging, invoices, and self-serve plan changes are deferred. `402` is used as the cap error shape so billing can attach later.

### Deferred.7 Renaming physical tables `companies` → `institutions`

Aliases already exist (`packages/db/src/schema/index.ts`). Destructive table rename is deferred. API alias `/api/institutions` is in scope; SQL rename is not.

### Deferred.8 Removing Express `server/` in favor of Workers-only

Both stacks must implement this spec. Deleting Express is deferred.

### Deferred.9 ABAC / policy-as-code (OPA, Cedar)

Role bundles + entitlements + optional grant scope JSON are the model. External policy engines are deferred.

### Deferred.10 Citizen identity as a principal inside the control plane

Public portal submitters may have `owner_user_id` on `public_requests`. They are not government members and get no board UI. A citizen RBAC plane is deferred.

### Deferred.11 Multi-region tenant placement

`doc/CLOUDFLARE-ROUTING-ARCHITECTURE.md` multi-region dispatch is deferred. Single dispatch namespace `ciutatis-tenants` (`cloudflareProvisioningSettingsSchema`) stays.

---

