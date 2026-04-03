# Cloudflare Routing Decision Checklist for Ciudatis

## Quick Reference: MVP vs Production

### ✅ Choose **PATH-BASED** (`/ar/tandil-abc`) if:
- [ ] Ship within 1 week
- [ ] <50 tenants in first release
- [ ] Keep it simple and lean
- [ ] Minimize DNS changes
- [ ] Auth logic is already in server/middleware

**Migration path**: Easy → refactor to dispatch in weeks 3-4

### ✅ Choose **SUBDOMAIN-BASED** (`tandil-abc.ciudatis.com`) if:
- [ ] Need to support 100+ tenants now
- [ ] Want Cloudflare-level isolation (not code-level)
- [ ] Planning multi-region (separate dispatch per region)
- [ ] Want clean separation: landing/admin/tenants
- [ ] Can spend 3-4 days on setup

**Upside**: No future refactoring needed

---

## Implementation Roadmap

### Phase 1: Path-Based MVP (Weeks 1-2)
**Scope**: Quick launch, single Worker

```
1. Create `server/router.ts` with URL-based dispatch
   ├─ GET / → landing page
   ├─ /admin/* → admin panel
   └─ /ar/{tenantId}/* → tenant instance

2. Update `server/index.ts` to use router

3. Deploy single Worker: `ciudatis.com/*`

4. Test:
   - Landing: curl http://localhost:3100/
   - Admin: curl http://localhost:3100/admin
   - Tenant: curl http://localhost:3100/ar/tandil-abc
```

**Timeline**: 1-2 days

---

### Phase 2: Subdomain Dispatch (Weeks 3-4)
**Scope**: Production-ready, clean separation

```
1. DNS Setup (Cloudflare dashboard)
   ├─ Add wildcard DNS: *.ciudatis.com A → Cloudflare
   └─ Verify propagation (5 mins)

2. Create dispatcher Worker
   ├─ New package: server/dispatcher/wrangler.toml
   ├─ dispatch_namespaces binding to "production" namespace
   └─ Route logic: extract subdomain → tenant lookup

3. Extract landing/admin to separate Workers
   ├─ Landing: server/landing/wrangler.toml
   │  pattern: ciudatis.com (custom_domain)
   └─ Admin: server/admin/wrangler.toml
      pattern: admin.ciudatis.com (custom_domain)

4. Move tenant logic to separate deployable Workers
   ├─ Create tenant-worker template
   ├─ Deploy to dispatch namespace on tenant creation
   └─ DNS: *.ciudatis.com auto-routes to dispatcher

5. Test:
   - Landing: curl https://ciudatis.com/
   - Admin: curl https://admin.ciudatis.com/
   - Tenant: curl https://tandil-abc.ciudatis.com/api/health
```

**Timeline**: 3-4 days

---

### Phase 3: Custom Domains (Post-MVP)
**Scope**: Premium feature for enterprise tenants

```
1. Allow tenant to add custom domain (admin UI)

2. In dispatcher, add KV lookup
   ├─ Key: custom-domain (e.g., "tandil.their-domain.com")
   └─ Value: tenant-id (e.g., "tandil-abc")

3. Dispatcher handles both:
   ├─ Subdomain: tandil-abc.ciudatis.com → dispatcher → tandil-abc Worker
   └─ Custom: tandil.their-domain.com (CNAME to dispatcher) → dispatcher → tandil-abc Worker

4. No code changes to tenant Worker
```

**Timeline**: 1 day (after dispatch is live)

---

## Decision Tree: Which Path Do You Actually Need?

```
START
  │
  ├─ Need to launch in <7 days?
  │  ├─ YES → PATH-BASED MVP (Section: Phase 1)
  │  │         (Refactor later)
  │  │
  │  └─ NO → Continue...
  │
  ├─ Will you have >20 tenants in v1.0?
  │  ├─ YES → SUBDOMAIN-BASED (Section: Phase 2)
  │  │         (Clean ops from day 1)
  │  │
  │  └─ NO → Either works, choose based on team preference
  │
  ├─ Do you need tenant custom domains (tandil.co)?
  │  ├─ YES → MUST use SUBDOMAIN-BASED
  │  │         (Path-based makes this very hard)
  │  │
  │  └─ NO → Either works
  │
  └─ Do you have multi-region plans?
     ├─ YES → SUBDOMAIN-BASED
     │         (Easily replicate dispatcher per region)
     │
     └─ NO → Either works

END
```

---

## Configuration Templates

### Path-Based Minimal Setup

```toml
# wrangler.toml
name = "ciudatis-core"
main = "src/index.ts"

[[routes]]
pattern = "ciudatis.com/*"
zone_name = "ciudatis.com"
```

```typescript
// src/index.ts - Minimal router
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/') return handleLanding();
    if (path.startsWith('/admin')) return handleAdmin(request);
    if (path.startsWith('/ar/')) {
      const match = path.match(/^\/ar\/([^/]+)(.*)/);
      if (match) {
        const tenantId = match[1];
        const tenantPath = match[2] || '/';
        return handleTenant(tenantId, { ...request, path: tenantPath });
      }
    }
    return new Response('Not found', { status: 404 });
  }
};
```

---

### Subdomain-Based Full Setup

```toml
# dispatcher/wrangler.toml
name = "ciudatis-dispatcher"
main = "src/dispatcher.ts"

[[dispatch_namespaces]]
binding = "DISPATCHER"
namespace = "production"

[[routes]]
pattern = "ciudatis.com"
custom_domain = true

[[routes]]
pattern = "admin.ciudatis.com"
custom_domain = true

[[routes]]
pattern = "*.ciudatis.com"
custom_domain = true
```

```typescript
// dispatcher/src/dispatcher.ts
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Route apex and admin
    if (hostname === 'ciudatis.com') {
      // Delegate to landing worker (via custom domain fetch)
      return fetch('https://ciudatis.com' + url.pathname + url.search);
    }
    if (hostname === 'admin.ciudatis.com') {
      // Delegate to admin worker (via custom domain fetch)
      return fetch('https://admin.ciudatis.com' + url.pathname + url.search);
    }

    // Route wildcard subdomains to tenant workers
    const subdomain = hostname.split('.')[0];

    try {
      const tenantWorker = env.DISPATCHER.get(subdomain);
      return await tenantWorker.fetch(request);
    } catch (e) {
      if (e.message.includes('Worker not found')) {
        return new Response('Tenant not found', { status: 404 });
      }
      return new Response(e.message, { status: 500 });
    }
  }
};
```

---

## Known Issues & Solutions

| Issue | Path-Based | Subdomain-Based |
|-------|-----------|-----------------|
| **Tenant isolation weak** | Fix in code ✅ | Cloudflare enforces ✅ |
| **Hard to add custom domains** | ❌ Difficult | ✅ Easy (CNAME) |
| **DNS complexity** | ✅ Simple | Wildcard needed |
| **Refactor to production** | ❌ Needed | ✅ None |
| **Multi-region split** | ❌ Hard | ✅ Easy |
| **Tenant metrics/limits** | Manual 🔨 | KV + dispatcher 🎯 |

---

## Testing Checklist

### Path-Based
- [ ] Landing page loads at `/`
- [ ] Admin accessible at `/admin/login`
- [ ] Tenant accessible at `/ar/{tenantId}/`
- [ ] Tenant auth uses `x-tenant-id` header
- [ ] Cross-tenant auth fails (401)
- [ ] 404 for unknown tenant

### Subdomain-Based
- [ ] Landing at `ciudatis.com`
- [ ] Admin at `admin.ciudatis.com`
- [ ] Tenant at `{tenantId}.ciudatis.com`
- [ ] Wildcard DNS resolves
- [ ] Custom domains via CNAME work
- [ ] Tenant Workers isolated (no shared cache)
- [ ] Dispatcher error handling (Worker not found → 404)

---

## Deployment Sequence

### Path-Based
```bash
# Week 1
npm run build
pnpm deploy  # Pushes to ciudatis.com/*

# Manual testing in staging
# Go live
```

### Subdomain-Based
```bash
# Week 1-2: Add wildcard DNS
# In Cloudflare dashboard: *.ciudatis.com A → Cloudflare

# Week 3
pnpm deploy:dispatcher    # Deploy dispatcher Worker
pnpm deploy:landing       # Deploy landing Worker
pnpm deploy:admin         # Deploy admin Worker

# Week 4: First tenant
pnpm deploy:tenant --name tandil-abc --namespace production
# Auto-routes to tandil-abc.ciudatis.com
```

---

## Rollback Plan

### Path-Based Refactor Fail
```bash
# Revert to previous commit
git revert <commit>
pnpm deploy
# All routing still works at ciudatis.com/*
```

### Subdomain Dispatch Issues
```bash
# Keep both running during cutover
# Dispatcher handles *.ciudatis.com
# Old path-based handles ciudatis.com/*
# Users can switch gradually

# Once stable, retire path-based
wrangler delete ciudatis-core
```

---

## When to Switch: Trigger Points

Move from **Phase 1 → Phase 2** when ANY are true:

- [ ] >20 tenants deployed
- [ ] First customer asks for custom domain
- [ ] Team complains about auth complexity
- [ ] You've shipped v1.0 and want ops clarity
- [ ] Incident happens due to tenant isolation bug

---

## Team Communication

### For Stakeholders
```
MVP Path (1 week): Simple, single route, all logic in one Worker.
              Pro: Ships fast. Con: Refactor needed later.

Production Path (3-4 weeks): Clean separation, Cloudflare-managed isolation.
                        Pro: Scales, modern SaaS ops. Con: Slightly more setup.

Recommendation: Start MVP, switch to Production after v1.0 or at 20 tenants.
```

---

**Last updated**: April 3, 2026  
**Review schedule**: After shipping v1.0 or when tenant count >20
