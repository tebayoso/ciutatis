# Cloudflare Migration Plan

## Overview

This document outlines the complete migration from the current Node.js + PostgreSQL architecture to Cloudflare's serverless platform.

## Architecture Changes

### Current Stack
- **Server**: Node.js + Express.js
- **Database**: PostgreSQL (embedded or external) via `postgres-js`
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Storage**: Local disk or AWS S3
- **Auth**: Better-Auth with PostgreSQL
- **UI**: Vite + React served by Express

### Target Stack
- **API**: Cloudflare Workers with Hono framework
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Storage**: Cloudflare R2 (S3-compatible)
- **Auth**: Better-Auth with D1 adapter
- **UI**: Cloudflare Pages (static build)

## Migration Components

### 1. Database Layer (`packages/db-cloudflare/`)

**New Package**: `@ciutatis/db-cloudflare`

- Replaces PostgreSQL client with D1 client
- SQLite-compatible schema types
- Migration scripts for D1

**Schema Changes Required**:
```typescript
// PostgreSQL → SQLite (D1)
uuid → text (with validation)
timestamptz → text (ISO 8601) or integer (Unix timestamp)
jsonb → text (JSON string)
serial/identity → integer primary key autoincrement
Array types → JSON text
```

### 2. API Layer (`workers/api/`)

**Workers Project**: `ciutatis-api`

- Hono framework instead of Express
- Same route structure, different syntax
- WebSocket support via Cloudflare Durable Objects (if needed)

**Route Mapping**:
```typescript
// Express
app.get('/api/companies', handler);

// Hono
app.get('/api/companies', handler);
// Same semantics, just different framework
```

### 3. Storage Layer

**R2 Integration**:
- R2 is S3-compatible
- Minimal code changes needed
- Use `@aws-sdk/client-s3` with R2 endpoint

### 4. UI Deployment (`workers/ui/`)

**Pages Project**: `ciutatis-ui`

- Static build from existing Vite app
- API calls point to `api.ciutatis.com`
- Environment-specific configuration

## File Structure

```
ciutatis/
├── packages/
│   ├── db/                      # Existing PostgreSQL
│   ├── db-cloudflare/           # NEW: D1-compatible
│   │   ├── src/
│   │   │   ├── schema/          # SQLite-compatible schemas
│   │   │   ├── client.ts        # D1 client wrapper
│   │   │   └── migrate.ts       # D1 migration runner
│   │   └── drizzle.config.ts    # D1 dialect config
│   └── shared/                  # Existing (mostly compatible)
├── workers/
│   ├── api/                     # NEW: Workers API
│   │   ├── src/
│   │   │   ├── index.ts         # Worker entry point
│   │   │   ├── app.ts           # Hono app setup
│   │   │   ├── routes/          # Ported routes
│   │   │   ├── middleware/      # Ported middleware
│   │   │   └── services/        # Ported services
│   │   └── wrangler.toml
│   └── ui/                      # NEW: Pages deployment
│       ├── dist/                # Built UI
│       └── wrangler.toml
├── cloudflare-config/           # NEW: Shared config
│   ├── wrangler.base.toml
│   └── scripts/
└── package.json
```

## Implementation Phases

### Phase 1: Infrastructure Setup
1. Create D1 database
2. Create R2 bucket
3. Create Workers project
4. Create Pages project
5. Configure DNS records

### Phase 2: Database Migration
1. Create `@ciutatis/db-cloudflare` package
2. Port schema files to SQLite-compatible types
3. Create D1 migration runner
4. Generate D1 migrations
5. Test schema compatibility

### Phase 3: API Migration
1. Create Workers project structure
2. Port Express routes to Hono
3. Port middleware (auth, logging, etc.)
4. Port services (minimal changes needed)
5. Integrate Better-Auth with D1
6. Test API endpoints

### Phase 4: Storage Migration
1. Update storage service to use R2
2. Configure R2 bindings in wrangler.toml
3. Test file upload/download

### Phase 5: UI Migration
1. Configure UI for static build
2. Update API base URL configuration
3. Deploy to Pages
4. Test end-to-end

### Phase 6: Domain & DNS
1. Configure ciutatis.com DNS
2. Set up Workers route for API
3. Set up Pages custom domain
4. Configure R2 custom domain (optional)

## Key Technical Decisions

### 1. Dual Database Support
Keep both PostgreSQL and D1 support during transition:
- Existing package: `@ciutatis/db` (PostgreSQL)
- New package: `@ciutatis/db-cloudflare` (D1)
- Services work with either via shared interface

### 2. Minimal Code Changes
- Keep business logic identical
- Only change infrastructure adapters
- Same API contract (routes, responses)

### 3. Gradual Migration Path
- Deploy side-by-side initially
- Migrate data gradually
- Cut over DNS once verified

## Configuration

### Environment Variables

**Workers** (set via wrangler secret):
```
BETTER_AUTH_SECRET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

**wrangler.toml**:
```toml
name = "ciutatis-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "ciutatis-db"
database_id = "<d1-database-id>"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "ciutatis-assets"
```

## Testing Strategy

1. **Unit Tests**: Run existing tests against D1 schema
2. **Integration Tests**: Test API endpoints on Workers
3. **E2E Tests**: Full workflow with UI
4. **Load Tests**: Verify Workers performance

## Rollback Plan

1. DNS can be reverted quickly
2. PostgreSQL database remains intact during migration
3. Dual-write period can be implemented if needed

## Timeline Estimate

- Phase 1 (Infrastructure): 1-2 days
- Phase 2 (Database): 2-3 days
- Phase 3 (API): 3-4 days
- Phase 4 (Storage): 1 day
- Phase 5 (UI): 1-2 days
- Phase 6 (Domain): 1 day
- Testing & Verification: 2-3 days

**Total**: ~2 weeks for complete migration
