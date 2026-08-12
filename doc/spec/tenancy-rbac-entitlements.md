# GovOps Control Plane Spec — Tenancy, RBAC, and Entitlements

Status: Draft (locked product decisions; implementation contract)
Date: 2026-08-12
Audience: Product, engineering, and agent-integration authors
Spec family: Full GovOps Control Plane (Ciutatis / Paperclip civic fork)
Companion chapters: `doc/spec/ui.md`, `doc/spec/agents-runtime.md`, `doc/spec/agent-runs.md`
V1 contrast: `doc/SPEC-implementation.md` (single board, RBAC out of scope) does **not** control this document

These chapters replace the V1 tenancy and permission model for the GovOps control plane. They are the build contract for multi-government operation on one Next.js UI (`apps/landing`).

---

## 0. Locked product decisions

1. **The enrolled government is the tenant.** A tenant is not a Cloudflare worker row and not a `companies` row. A tenant is `tenant_instances` + one or more institutions + RBAC + usage + entitlements, addressed by `government_id`.
2. **RBAC is real and enforced.** Role names on memberships are not decorative. `grantsForHumanRole()` must return the role’s permission set, and every mutating route must call a permission helper.
3. **Entitlements are what a government may operate**, independent of who is logged in: agents, adapters, public portal, data publish, budgets, plugins, child institutions, routing modes, storage.
4. **Two human planes exist:** platform operators (Ciutatis staff) and government humans (`owner | admin | operator | viewer | auditor`). They never share a role enum.
5. **One Next.js UI.** Public site, claim/enrollment, government board, and platform admin are one app (`apps/landing`), with host/path routing. The Express `server/` API remains the contract; `workers/api` must implement the same helpers.

---

## 1. As-is (repo snapshot)

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

Both must change. The Express routes listed in Chapter 9 are the contract; Workers must not remain coarser.

---

## 2. Target vocabulary

| Term | Meaning | Physical identity |
|---|---|---|
| **Platform** | Ciutatis operator plane. Not a government. | Deployment + `instance_settings` singleton |
| **Government** | Enrolled public-sector tenant. The tenancy root. | `tenant_instances.id` exposed as `government_id` |
| **Institution** | Operating unit inside a government (municipality, ministry, department, agency). Today’s `companies` row. | `companies.id` (`institutions` alias) |
| **Department** | Child institution. Same table, `parent_institution_id` set. | `companies.id` |
| **Principal** | User, agent, plugin, or system acting on data. | `(principal_type, principal_id)` |
| **Role** | Named bundle of permissions. Stored on membership. | See Chapter 4 |
| **Grant** | Concrete `permission_key` (+ optional scope) on a principal. | `principal_permission_grants` |
| **Entitlement** | What the **government** is allowed to operate, regardless of who is logged in. | `government_entitlements` |
| **Usage** | Metered consumption counted against entitlements. | `government_usage_windows` + existing `cost_events` |

API and TypeScript use `governmentId`. SQL keeps table name `tenant_instances` (avoid a destructive rename). Column `tenant_instances.id` **is** `government_id`.

Backward-compat aliases (`companies`, `company_memberships`, `issues`, `goals`) remain exported from `packages/db/src/schema/index.ts`. New code uses `institutions`, `institution_memberships`, `requests`, `objectives` at the civic layer, but permission keys keep the existing `agents:` / `tasks:` / `users:` prefixes so current grant rows stay valid.

---

## 4. Actors and principals

### 4.1 Request actor (to-be)

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

### 4.2 Mapping from today’s actor types

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

### 4.3 Role enums (locked)

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

### 4.4 Principals that are not humans

| Principal | `principal_type` | Membership | Grants |
|---|---|---|---|
| Human user | `user` | `government_memberships` and/or `institution_memberships` | Role bundle + optional extra grants |
| Agent | `agent` | `institution_memberships` (`principal_type='agent'`) already written on join approve (`server/src/routes/access.ts`) | Explicit grants only. Agents never inherit human role bundles. CEO default grants are listed in §7.6. |
| Plugin | `plugin` | none (capability manifest) | `PLUGIN_CAPABILITIES` in `packages/shared/src/constants.ts`, intersected with government entitlement `plugins.allowed_keys` and per-institution `plugin_company_settings.enabled` |
| System | `system` | none | Implicit, code-gated. Cannot be granted via API. |
| Public | n/a | none | Entitlement-gated public portal only |

Agents keep `agents.permissions` JSON (`packages/db/src/schema/agents.ts`) as a **deprecated** cache. Authorization source of truth is `principal_permission_grants`. `PATCH /api/agents/:id/permissions` must write grants, not only the JSON blob.

---

## 5. Tenancy model

### 5.1 Isolation rule

Every domain row belongs to exactly one government, either directly (`government_id`) or through `companies.government_id`.

Cross-government reads return 404, not 403, to avoid leaking existence. Cross-government writes return 404. Platform actors may list across governments only on platform routes (`/api/platform/*` and `/api/governments` index).

Agent API keys cannot leave their institution (`assertCompanyAccess` agent branch stays). They also cannot act if `tenant_instances.status` is not `active` (paused/archived/error/suspended → 403 `government_not_active`).

Object storage keys already require a company prefix (`doc/plans/2026-02-20-storage-system-implementation.md`). To-be keys are `{government_id}/{institution_id}/...`.

Cloudflare isolation already provisioned per tenant (`tenant_d1_database_id`, `tenant_kv_namespace_id`, `tenant_r2_bucket_name` on `tenant_instances`) remains. Logical Postgres/D1 rows still carry `government_id` so a mis-routed worker cannot read another government’s institutions even if bindings were wrong — the query filter is mandatory.

### 5.2 Identity: `government_id`

`government_id` = `tenant_instances.id` (uuid).

API path parameter `:governmentId`. Header `X-Ciutatis-Government-Id` is accepted on the admin host when the path is not government-prefixed. The resolver prefers: (1) hostname match, (2) path prefix match, (3) header, (4) session’s sole government membership. Ambiguity → 400 `government_context_required`.

### 5.3 Schema changes (additive)

#### 5.3.1 `tenant_instances` (keep name; this **is** the government)

Existing columns stay (`packages/db/src/schema/tenant_instances.ts`). Add:

| Column | Type | Notes |
|---|---|---|
| `legal_name` | text null | Official name; `name` remains display name |
| `enrollment_status` | text not null default `'draft'` | See Chapter 6. Distinct from operational `status` |
| `primary_institution_id` | uuid null FK `companies.id` | Set when the first institution is created |
| `geo_id` | text null | Already on D1 schema (`packages/db-cloudflare/src/schema/tenant_instances.ts`); add to Postgres |
| `latitude` / `longitude` / `osm_type` / `osm_id` | as D1 | Add to Postgres so both stacks match |
| `claimed_by_user_id` | text null | First claimant |
| `enrolled_at` | timestamptz null | When `enrollment_status` became `active` |
| `suspended_at` / `suspension_reason` | timestamptz / text | Entitlement or policy suspension |
| `custom_domain_status` | text null | `pending_dns \| active \| failed` |

Keep operational `status`: `draft | provisioning | active | paused | error | archived` (`TENANT_INSTANCE_STATUSES`).

Keep `bootstrap_status`: `pending | ready | unknown`.

Indexes: existing unique `path_prefix`, `dispatcher_key`, `hostname`, `worker_name`. Add `enrollment_status` index. Add unique `(country_code, jurisdiction_type, postal_code, city_slug)` where enrollment is not `archived`.

#### 5.3.2 `companies` / `institutions`

Add to `packages/db/src/schema/institutions.ts`:

| Column | Type | Notes |
|---|---|---|
| `government_id` | uuid not null FK `tenant_instances.id` | **Required** after backfill |
| `parent_institution_id` | uuid null FK `companies.id` | Department/child. Same government required |
| `kind` | text not null default `'institution'` | `institution \| department \| agency \| ministry` |
| `slug` | text not null | Portal slug; today derived at read time via `buildInstitutionPortalSlug` in `server/src/services/public-portal.ts`. Persist it. Unique per government |
| `public_portal_enabled` | boolean not null default false | AND with entitlement `portal.public_enabled` |

Drop uniqueness of `issue_prefix` **globally** (`companies_issue_prefix_idx`). Replace with unique `(government_id, issue_prefix)`.

Backfill: for each existing `companies` row with no tenant, create a `tenant_instances` row (`enrollment_status='active'`, `status='active'`, `routing_mode='path'`, synthetic `path_prefix='/local/{issue_prefix}'` in `local_trusted`; in cloud, leave `draft` and flag for operator linking). Set `companies.government_id`. Set `primary_institution_id` to that company.

Existing `tenant_instances` with no company: create a primary institution named `municipality_name`, `kind='institution'`, owner membership for `claimed_by_user_id` if present.

#### 5.3.3 `government_memberships` (new)

Government-plane membership. Distinct from `company_memberships`.

| Column | Type |
|---|---|
| `id` | uuid pk |
| `government_id` | uuid not null FK `tenant_instances.id` |
| `principal_type` | text not null (`user` only for V1 of this spec; agents are institution-scoped) |
| `principal_id` | text not null |
| `status` | `pending \| active \| suspended` |
| `membership_role` | text not null (`GOVERNMENT_ROLES`) |
| `created_at` / `updated_at` | timestamptz |

Unique `(government_id, principal_type, principal_id)`.

Invariant: at least one active `owner` per non-archived government.

#### 5.3.4 `institution_memberships` (`company_memberships`)

Keep table. Constrain `membership_role` to `GOVERNMENT_ROLES`. Add:

| Column | Type | Notes |
|---|---|---|
| `government_id` | uuid not null | Denormalized from parent institution; filter/index |

A user may be government `owner` and not appear on every child institution; government `owner`/`admin` still pass institution access via role inheritance (Chapter 7). Operators/viewers/auditors must have an institution membership (or a government role that inherits).

#### 5.3.5 `principal_permission_grants`

Add `government_id uuid not null`. Unique key becomes `(government_id, company_id, principal_type, principal_id, permission_key)` with `company_id` nullable for government-scoped grants (`company_id IS NULL` means government-wide).

#### 5.3.6 `instance_user_roles`

`role` uses `PLATFORM_ROLES`. Unique `(user_id)` — one platform role per user. A platform user may additionally hold government memberships.

#### 5.3.7 Child institutions / departments

Tree rules:

- `parent_institution_id` must be in the same `government_id`.
- Depth max 3 (government primary → institution → department). Deeper → 422.
- Cycles forbidden.
- Deleting/archiving a parent archives children.
- Entitlement `institutions.max_count` counts all non-archived rows for that `government_id`.
- Primary institution (`tenant_instances.primary_institution_id`) cannot be a child.

Org chart of **agents** (`agents.reports_to`) stays inside one institution. It is not the department tree.

### 5.4 Routing

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

### 5.5 What is in the tenant boundary

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

### 5.6 API paths for governments

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

## 6. Enrollment lifecycle

### 6.1 States

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

### 6.2 Who does what

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

### 6.3 First institution

On owner-invite accept:

1. Insert `companies` with `government_id`, `name = tenant_instances.municipality_name`, `kind='institution'`, `slug` from name+prefix, `public_portal_enabled=false`.
2. Set `tenant_instances.primary_institution_id`.
3. Insert `government_memberships` owner for the user.
4. Insert `institution_memberships` owner for the same user on the primary institution.
5. Call `grantsForHumanRole("owner")` and write `principal_permission_grants`.
6. `logActivity` with `company_id` = primary institution **and** a platform audit row (Chapter 10).

`POST /api/companies` today requires instance admin (`server/src/routes/institutions.ts` L122–124). To-be: creating the *first* institution is part of bootstrap (system). Creating *additional* institutions requires `government:institutions.create` and entitlement headroom.

### 6.4 Invariants during enrollment

- `draft` / `submitted`: no agent heartbeats, no public request intake, no plugin enablement.
- `provisioning` / `bootstrap`: platform may hit health; government UI shows setup checklist only.
- `paused` / `suspended`: `assertGovernmentActive` fails on mutations; GET allowed for roles with read.
- `archived`: all API except platform read → 404.
- `path_prefix` and `hostname` unique among non-archived rows (already unique indexes — archive must rewrite `path_prefix` to `/archived/{id}/{original}` or null hostname to free the route).

---

## 7. RBAC and permission matrix

### 7.1 Evaluation order (locked)

Implemented in `server/src/services/access.ts` (replace `canUser` / `hasPermission`) and called only via helpers in Chapter 9.

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
   5. Extra grants may add keys; they must not add keys outside the role’s **ceiling** (see §7.4). Ceiling prevents an operator from being granted `users:manage_permissions`.
10. Entitlement check: if the permission implies a feature flag/limit, enforce Chapter 8. 402 `entitlement_denied` or 403 `entitlement_limit`.

`local_implicit` platform_owner skips government membership but still has a `governmentId` context when operating a local government row.

### 7.2 Permission keys

`PERMISSION_KEYS` in `packages/shared/src/constants.ts` is replaced by the union of the tables below. Existing seven keys keep their strings.

#### 7.2.1 Platform keys

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

#### 7.2.2 Government keys

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

#### 7.2.3 Institution keys (company-scoped)

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

### 7.3 `grantsForHumanRole()` (locked implementation)

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

### 7.4 Platform role matrix

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

### 7.5 Public / anonymous matrix

| Action | `public` actor | Entitlement |
|---|---|---|
| Search places/institutions | ✓ | none (only `active` governments) |
| View public institution page | ✓ | `portal.public_enabled` |
| Submit public request | ✓ if `portal.anonymous_submit`; else signed-in `user` | `portal.public_enabled` |
| Comment on public request | same | `portal.public_enabled` |
| Create place / start claim | authenticated user only | none |
| Anything under `/api/companies`, `/api/agents`, `/api/governments` | — | — |

### 7.6 Agent default grants

On agent create / join approve (`server/src/routes/access.ts` agent branch currently writes `agentJoinGrantsFromDefaults`):

| Agent role (`agents.role`) | Default grants |
|---|---|
| `ceo` | `agents:create`, `tasks:assign`, `tasks:assign_scope` `{ subtree: self }`, `joins:approve`, `goals:manage`, `budgets:read` |
| manager roles (`cto`, `cmo`, `cfo`, `pm`) | `tasks:assign` `{ subtree: self }`, `tasks:create`, `tasks:update`, `tasks:comment`, `tasks:checkout`, `costs:write`, `budgets:read` |
| others | `tasks:create`, `tasks:update`, `tasks:comment`, `tasks:checkout`, `costs:write` |

Board/human `agents:create` remains required to hire (`server/src/routes/agents.ts`). CEO `agents:create` still subject to `requireBoardApprovalForNewAgents` on the institution (`packages/db/src/schema/institutions.ts`).

Agents never receive `users:manage_permissions`, `secrets:manage`, `budgets:manage`, `portal:publish`, `government:*`, or `platform:*`.

### 7.7 Last-owner and last-platform-owner

Already sketched in `access.ts` member patch (SELECT … `membership_role = 'owner' FOR UPDATE`). Extend:

- Cannot demote/suspend the last active government `owner`.
- Cannot demote the last `platform_owner`.
- Cannot archive the primary institution while other institutions exist.
- `PUT` grants that would strip `users:manage_permissions` from the last owner → 409.

---

## 8. Entitlement catalog

Entitlements answer “may this **government** use feature X / up to N?” They are not RBAC. A government owner with `agents:create` still fails if `agents.max_count` is reached.

### 8.1 Storage

New table `government_entitlements`:

| Column | Type |
|---|---|
| `id` | uuid pk |
| `government_id` | uuid not null FK `tenant_instances.id` |
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

### 8.2 Catalog

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

### 8.3 Feature mapping (what a government may operate)

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

### 8.4 HTTP errors for entitlements

| Code | When |
|---|---|
| `402` | Metered cap exceeded (`agents.max_count`, `storage.r2_gb_cap`, `budgets.monthly_cents_cap`) — payment/plan shaped |
| `403` `entitlement_denied` | Boolean entitlement false (`portal.public_enabled`, `plugins.enabled`) |
| `422` | Adapter type / plugin key / publish category not in allowlist |

Do not use 404 for entitlement failures (that is tenancy isolation).

---

## 9. Enforcement points

### 9.1 Helpers to add (single module)

File: `server/src/routes/authz.ts` (and `workers/api/src/lib/authz.ts` with identical signatures).

| Helper | Replaces | Behavior |
|---|---|---|
| `assertAuthenticated(req)` | existing | 401 if `none` |
| `assertPlatformRole(req, minRole \| permissionKey)` | `assertInstanceAdmin` | Platform plane. `assertInstanceAdmin` becomes a deprecated wrapper for `platform:tenants.read` **not** full admin — call sites must switch to a permission key |
| `assertGovernmentAccess(req, governmentId)` | new | Membership or platform read |
| `assertGovernmentPermission(req, governmentId, key)` | new | Government keys |
| `assertCompanyAccess(req, companyId)` | existing, **tighten** | Resolve institution → `government_id`; require government context match; then membership/inheritance; **no** “any board session with companyIds” without role; **no** local_implicit skip unless platform_owner in local_trusted |
| `assertCompanyPermission(req, companyId, key, scope?)` | move out of `access.ts` | After access, evaluate §7.1 |
| `assertGovernmentActive(req, governmentId)` | new | Mutations require `enrollment_status=active` (or platform pause/resume routes) |
| `assertEntitlement(req, governmentId, key, opts?)` | new | Chapter 8 |
| `assertBoard(req)` | existing | **Deprecated.** Rewrite to `assertAuthenticated` + human actor (`platform` or `user`). Must not mean “full control” |
| `assertBoardOrgAccess(req, orgId)` | existing | If `orgId==="instance"` → `assertPlatformRole(req, "platform:tenants.read")`; else treat `orgId` as `governmentId` or institution id explicitly (`kind` query) |

`server/src/routes/instance-settings.ts` `assertCanManageInstanceSettings` (board + instance admin) → `assertPlatformRole(req, "platform:settings.manage")`.

`access.canUser` must **stop** short-circuiting all keys for instance admins. Platform short-circuit applies only to `platform:*` keys. Government data uses platform read rules in §7.4.

`grantsForHumanRole` and `humanJoinGrantsFromDefaults` must return the matrices in §7.3.

### 9.2 Route files that must change

Every file below currently calls `assertCompanyAccess` and/or `assertBoard` and/or `assertInstanceAdmin` without a permission key (except `access.ts` and parts of `agents.ts` / `environments.ts`).

| File | Today | To-be helper(s) |
|---|---|---|
| `server/src/routes/authz.ts` | coarse access | implement §9.1 |
| `server/src/middleware/auth.ts` | board/agent/none; cloud_tenant elevates admin | new actor union; resolve `governmentId` |
| `server/src/middleware/board-mutation-guard.ts` | CSRF for `type==="board"` | apply to `user` and `platform` |
| `server/src/services/access.ts` | `canUser` admin bypass; no government | evaluation order §7.1 |
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

### 9.3 Middleware resolve order

`actorMiddleware` then `resolveGovernmentMiddleware`:

1. Parse host / path prefix / header (`packages/shared/src/tenant-routing.ts`).
2. Load `tenant_instances`.
3. Set `req.government`.
4. If actor is `user` and memberships exist in a different government only → 403.

Platform routes under `/api/instance/*`, `/api/platform/*`, `/api/admin/*`, `/api/adapters`, `/api/plugins` (install) skip government resolution.

### 9.4 UI enforcement

One Next.js app (`apps/landing`):

- Hide nav items the session’s permission set does not include (same keys; API remains authoritative).
- Platform pages (`InstanceTenants`, `InstanceCloudflareSettings`, `InstanceAdminOverview`) require a platform actor; government users hitting `/admin/instance/*` → 404.
- Government settings show entitlements as read-only.
- Viewer/auditor: mutation buttons not rendered; API still 403 if called.

---

## 10. Audit log requirements

### 10.1 Two streams

| Stream | Table | Scope |
|---|---|---|
| Institution activity | `activity_log` (existing) | Work: issues, agents, costs, approvals |
| Government / platform audit | `audit_log` (new) | Tenancy, RBAC, entitlements, enrollment, platform settings |

`activity_log` stays the operator-facing work timeline (`GET /api/activity`, live event `activity.logged`). It is **not** sufficient for tenancy/RBAC because `company_id` is required and tenant mutations have no company.

### 10.2 `activity_log` columns to add

`packages/db/src/schema/activity_log.ts`:

| Column | Type | Notes |
|---|---|---|
| `government_id` | uuid not null FK `tenant_instances.id` | Backfill from `companies.government_id` |
| `actor_role` | text null | Snapshot of platform/government role at write time |
| `request_id` | text null | Correlate with structured logs (`doc/SPEC-implementation.md` §15.3) |
| `ip` | text null | For membership/invite/portal submits; redacted in UI for non-auditors |

`company_id` remains not null for this table (work is always institution-scoped). Index `(government_id, created_at)`.

`LogActivityInput` in `server/src/services/activity-log.ts` requires `governmentId`. Call sites that only have `companyId` load it from the institution row.

### 10.3 `audit_log` (new)

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

### 10.4 Required actions

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

### 10.5 Attribution rules

- Every mutation listed in §10.4 writes **before** commit completes (same transaction as the mutation).
- `actor_id` never `"board"` except `local_implicit` which uses `userId: "local-board"` and `actor_role: "platform_owner"`.
- Plugin-attributed work uses `actor_type: "plugin"`.
- Public anonymous submit uses `actor_type: "system"`, `actor_id: "public-portal"`, details `{ submissionMode }` (already partially in `public-portal.ts`).
- Secret values, API keys, Cloudflare tokens, invite raw tokens never appear in `details` (existing redaction in `activity-log.ts`).
- Auditors (`government:audit.read` / `platform:audit.read`) see `ip` and `request_id`. Viewers using `activity:read` do not see `ip`.

### 10.6 Integrity

- Application INSERT only; DB role used by the API cannot UPDATE/DELETE `audit_log` (Postgres GRANT). Soft-fail if the GRANT is not applied in `local_trusted`.
- Platform audit export: `GET /api/platform/audit?from&to&governmentId` CSV/JSON for `platform_auditor`+.

---

## 11. Deferred

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

## 12. Acceptance criteria

1. No `companies` row exists without `government_id`.
2. No route that mutates institution data succeeds on `assertCompanyAccess` alone; it calls `assertCompanyPermission` with a key from §7.2.3 (or platform enrollment helpers).
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

## 13. Implementation order (engineering, not calendar)

1. Schema: `government_id` on `companies`, `government_memberships`, `government_entitlements`, `audit_log`, `activity_log.government_id`; expand `INSTANCE_USER_ROLES`; backfill.
2. `grantsForHumanRole` + `humanJoinGrantsFromDefaults` + stop `canUser` admin bypass for institution keys.
3. New actor union + government resolver middleware.
4. Move `assertCompanyPermission` to `authz.ts`; migrate route files in §9.2.
5. `/api/governments` and enrollment state machine; alias old tenant paths.
6. Entitlement checks on agents, portal, plugins, budgets, institutions.max_count, routing.
7. `audit_log` writers for tenancy/RBAC; fix missing logs on instance-admin and tenant pause.
8. Workers parity.
9. Next.js nav + government-prefixed board routes; retire issue-prefix-only URLs via redirect.
