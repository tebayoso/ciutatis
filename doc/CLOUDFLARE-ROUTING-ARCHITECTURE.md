# Cloudflare Multi-App Routing Architecture Research

**Date**: April 3, 2026  
**Scope**: Path-based vs subdomain-based routing for Ciudatis (public landing, admin, tenant instances)  
**Status**: Implementation-ready guidance

---

## EXECUTIVE SUMMARY

For Ciudatis's three-tier app architecture (public landing + admin + per-tenant instances), **subdomain-based routing via Workers for Platforms with dynamic dispatch is the recommended architecture**. Path-based routing is simpler for MVP but lacks operational scale.

### Quick Decision Matrix

| Factor | Path-Based | Subdomain-Based |
|--------|-----------|-----------------|
| **URL Scheme** | `ciudatis.com/ar/tandil-abc` | `tandil-abc.ciudatis.com` |
| **Setup Complexity** | Low (single route) | Medium (DNS/wildcard) |
| **Scale (tenants)** | ~100s | Unlimited |
| **Tenant Isolation** | Logical (code-based) | Complete (Cloudflare-level) |
| **Multi-region Expansion** | Hard | Easy (subdomain portable) |
| **DNS Management** | Simpler | Requires wildcard DNS |
| **Cost** | Free tier friendly | Same free tier limits |

---

## SECTION 1: ROUTING FUNDAMENTALS

### A. How Cloudflare Routes Work

**Routes** = Patterns that invoke a Worker on specific URL paths.  
**Custom Domains** = Direct DNS assignment to a Worker (simpler, no manual DNS records).  
**Dynamic Dispatch** = Programmatic routing to Workers in a namespace (key for multi-tenant).

From official docs:
- Route patterns: `subdomain.example.com/*` or `example.com/path*`
- Wildcard `*` matches zero or more characters
- More specific patterns win: `api.example.com/auth/*` beats `*.example.com/*`
- **Case-sensitive paths, case-insensitive hostnames** (as of Oct 2023)

### B. Three Routing Models for Your Use Case

#### Model 1: Single Worker + Path-Based Routing (Simplest)
```
ciudatis.com/* → Router Worker
  ├─ /api/* → backend logic
  ├─ /ar/tandil-abc/* → tenant instance A
  ├─ /ar/cordoba-xyz/* → tenant instance B
  └─ /admin/* → admin panel
```

**Pros:**
- Single Cloudflare Worker deployment
- Single wrangler.toml route: `ciudatis.com/*`
- Trivial to set up
- Works on free tier

**Cons:**
- Tenant isolation is code-level only (auth checks in Worker)
- URL structure includes `/ar/` prefix (location code)
- Harder to give tenants custom domains later
- Scaling to 1000s of tenants = more code complexity

#### Model 2: Subdomain Routing (Recommended)
```
ciudatis.com       → Landing Worker (Custom Domain)
admin.ciudatis.com → Admin Worker (Custom Domain)
tandil-abc.ciudatis.com → Tenant A instance (dynamic dispatch)
cordoba-xyz.ciudatis.com → Tenant B instance (dynamic dispatch)
```

**Pros:**
- Clean separation: landing/admin as Custom Domains, tenants via dispatch
- Cloudflare-level isolation (untrusted mode)
- Scales to unlimited tenants without code changes
- Each tenant can later use their own domain (CNAME to dispatch)
- Standard SaaS pattern

**Cons:**
- Requires wildcard DNS record `*.ciudatis.com`
- More moving parts (Custom Domains + dispatch namespace)
- Slightly higher operational complexity

#### Model 3: Mixed Path + Subdomain (Hybrid)
```
ciudatis.com    → Landing Worker
admin.ciudatis.com → Admin Worker
*.ciudatis.com/* → Dynamic dispatcher
  ├─ /api → tenant API
  ├─ /board → tenant board UI
  └─ /* → tenant static assets
```

---

## SECTION 2: CLOUDFLARE WORKERS FOR PLATFORMS (Deep Dive)

If you pick **subdomain-based routing**, you must understand Workers for Platforms. This is NOT about untrusted customer code—it's a modern routing pattern.

### Architecture Components

```
┌─────────────────────────────────────────────────────┐
│         Dynamic Dispatch Worker (Entry Point)       │
│  - Routes requests based on hostname/path           │
│  - Enforces authentication, rate limiting           │
│  - Sets per-tenant limits (CPU, subrequests)        │
└────┬──────────────────────────────────────────────┬─┘
     │                                              │
  Custom Domains:                      Dispatch Namespace:
  ├─ ciudatis.com                     ├─ tandil-abc
  │  (Landing)                        ├─ cordoba-xyz
  └─ admin.ciudatis.com               ├─ la-plata-def
     (Admin)                          └─ [tenant instances]
```

### Key Concepts

1. **Dispatch Namespace** = Container for all tenant Workers
   - Single namespace per environment (production, staging)
   - NOT a namespace per customer
   - Holds unlimited Workers

2. **Dynamic Dispatch Worker** = Intelligent router
   - Entry point for all requests
   - Extracts tenant identifier from hostname: `tandil-abc.ciudatis.com` → `tandil-abc`
   - Looks up and invokes the matching tenant Worker
   - Runs platform logic (auth, logging, limits)

3. **User Workers** = Tenant instances
   - One Worker per tenant
   - Deployed via API (not via Wrangler)
   - Runs in "untrusted mode" by default (strong isolation)

4. **Outbound Worker** (optional)
   - Intercepts `fetch()` calls from tenant code
   - Controls egress, logs external calls
   - Not needed for MVP

### Implementation Example: Path-Extraction Dispatcher

From official Cloudflare docs:

```javascript
// wrangler.jsonc
{
  "name": "dispatcher",
  "dispatch_namespaces": [
    {
      "binding": "DISPATCHER",
      "namespace": "production"
    }
  ],
  "routes": [
    {
      "pattern": "ciudatis.com",
      "custom_domain": true
    },
    {
      "pattern": "admin.ciudatis.com",
      "custom_domain": true
    },
    {
      "pattern": "*.ciudatis.com",
      "custom_domain": true  // This needs a wildcard DNS record
    }
  ]
}

// src/dispatcher.ts
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Extract tenant from subdomain
    // tandil-abc.ciudatis.com -> tandil-abc
    const parts = hostname.split('.');
    if (parts.length < 2 || hostname === 'ciudatis.com' || hostname === 'admin.ciudatis.com') {
      // Special-cased routes (landing, admin)
      return new Response('Land here', { status: 404 });
    }

    const tenantId = parts[0];

    try {
      // Get tenant Worker from dispatch namespace
      const tenantWorker = env.DISPATCHER.get(tenantId);
      return await tenantWorker.fetch(request);
    } catch (e) {
      if (e.message.includes('Worker not found')) {
        return new Response('Tenant not found', { status: 404 });
      }
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  }
};
```

### Worker Isolation in Untrusted Mode (Default)

When tenant Workers run in untrusted mode:
- ✅ **Isolated cache**: Each tenant has separate cache, no cross-tenant data leak
- ✅ **No `request.cf` object**: Can't access Cloudflare metadata (intentional)
- ✅ **No shared storage**: KV/D1 bindings are tenant-specific
- ✅ **Memory isolated**: No shared memory across tenant Workers

This is **stronger isolation than code-level checks**.

---

## SECTION 3: PRACTICAL IMPLEMENTATION PATHS

### Path A: MVP (Path-Based, Single Worker)

**For**: Quick launch, <100 tenants, simple admin

```
# wrangler.toml
name = "ciudatis-core"
routes = [
  { pattern = "ciudatis.com/*", zone_name = "ciudatis.com" }
]

# src/index.ts
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/') {
      return landingPage();
    } else if (path.startsWith('/admin')) {
      return adminPanel(request);
    } else if (path.startsWith('/ar/')) {
      // Extract tenant: /ar/tandil-abc/... -> tandil-abc
      const match = path.match(/^\/ar\/([^/]+)/);
      if (match) {
        const tenantId = match[1];
        return tenantInstance(tenantId, request);
      }
    }
    return new Response('Not found', { status: 404 });
  }
};
```

**Timeline to production**: 1-2 days  
**Scaling limitation**: Refactor to dispatch at ~200 tenants

---

### Path B: Production (Subdomain-Based with Dynamic Dispatch)

**For**: Long-term, scale to 1000s+, modern ops

**Step 1: DNS Setup**

```
A/AAAA    ciudatis.com           → Cloudflare
A/AAAA    admin.ciudatis.com     → Cloudflare
A/AAAA    *.ciudatis.com         → Cloudflare (wildcard)
```

In Cloudflare DNS dashboard, add wildcard DNS record pointing to Cloudflare.

**Step 2: Deploy Dynamic Dispatch Worker**

```toml
# wrangler.toml (dispatcher)
name = "ciudatis-dispatcher"

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
// src/dispatcher.ts
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;

    // Route special cases
    if (hostname === 'ciudatis.com') {
      return fetch('https://landing-worker.ciudatis.com' + url.pathname + url.search);
    }
    if (hostname === 'admin.ciudatis.com') {
      return fetch('https://admin-worker.ciudatis.com' + url.pathname + url.search);
    }

    // Extract tenant from wildcard subdomain
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

**Step 3: Deploy Landing & Admin as Custom Domains (Separate Workers)**

```toml
# wrangler.toml (landing)
name = "ciudatis-landing"
[[routes]]
pattern = "ciudatis.com"
custom_domain = true
```

```toml
# wrangler.toml (admin)
name = "ciudatis-admin"
[[routes]]
pattern = "admin.ciudatis.com"
custom_domain = true
```

**Step 4: Deploy Tenant Instances**

Tenant Workers are deployed via API or Wrangler, not manual routes:

```bash
# Deploy tenant tandil-abc to dispatch namespace
wrangler publish --name tandil-abc --dispatch-namespace production
```

After deployment, `tandil-abc.ciudatis.com` automatically routes to the tenant Worker.

**Timeline to production**: 3-4 days  
**Scaling**: Linear with tenant count (just deploy new Workers)

---

## SECTION 4: ROUTING TRADEOFFS (Detailed)

### URL Scheme Impact

| Scheme | Example | Brand Impact | Custom Domains |
|--------|---------|--------------|-----------------|
| Path-based | `ciudatis.com/ar/tandil` | Platform-centric | Hard to add later |
| Subdomain | `tandil.ciudatis.com` | Professional SaaS | Easy (CNAME) |

### DNS Complexity

**Path-based:**
- Single DNS record: `ciudatis.com A/AAAA → Cloudflare`
- No wildcard needed
- Faster to set up

**Subdomain-based:**
- Wildcard DNS: `*.ciudatis.com A/AAAA → Cloudflare`
- Cloudflare auto-creates CNAME for custom domains
- Takes ~5 mins to propagate

### Performance

**Both are identical at the Cloudflare edge:**
- Same request latency (both hit Cloudflare edge)
- Same cache behavior
- Same CPU/memory available per Worker
- Dynamic dispatch adds <1ms overhead (negligible)

### Operational Complexity

**Path-based:**
- ✅ Single codebase, single deployment
- ❌ Manual tenant provisioning in code
- ❌ Code changes to add features per tenant
- ❌ Audit trail mixed with platform code

**Subdomain-based:**
- ✅ Declarative (tenant = Worker name)
- ✅ Independent deployments per tenant
- ✅ Natural audit trail (which Worker deployed when)
- ❌ Must manage dispatch namespace API

### Isolation Guarantees

**Path-based:**
```typescript
// You must enforce isolation
async function tenantInstance(tenantId, request) {
  const auth = request.headers.get('x-tenant-id');
  if (auth !== tenantId) return new Response('Unauthorized', { status: 401 });
  // ... rest of logic
}
// BUG RISK: Forgot check → data leak
```

**Subdomain-based:**
```javascript
// Cloudflare enforces isolation
const tenantWorker = env.DISPATCHER.get(tenantId);
// tenantWorker runs in untrusted sandbox
// No cross-tenant data access possible, even with bugs
```

The subdomain approach is safer because isolation is architectural, not code-dependent.

---

## SECTION 5: DECISION MATRIX FOR CIUDATIS

### Current Constraints
- ✅ Already on Cloudflare
- ✅ Three logical apps (landing, admin, tenants)
- ✅ Per-region tenant instances
- ✅ Need scalability path

### Recommendation

**Use Path-Based for MVP (Phase 1), then migrate to Subdomain + Dispatch for v1.0 (Phase 2).**

**Phase 1: Path-Based MVP (Weeks 1-2)**
- Single Worker: `ciudatis.com/*`
- Tenant routing: `/ar/{tenantId}`
- Simple, fast to launch
- Minimal DNS changes

**Phase 2: Production (Weeks 3-4)**
- Subdomain dispatch: `*.ciudatis.com`
- Separate landing/admin
- No code changes to existing tenant logic (dispatch handles routing)
- Better isolation, cleaner operations

**Phase 3: Scale (Post-v1.0)**
- Custom domains per tenant: `tandil.their-domain.com` (CNAME to dispatch)
- Multi-region federation (separate dispatch per region)

---

## SECTION 6: WRANGLER CONFIGURATION EXAMPLES

### Config for Subdomain + Dispatch (Recommended)

```toml
# dispatcher/wrangler.toml
name = "ciudatis-dispatcher"
main = "src/dispatcher.ts"
compatibility_date = "2026-04-01"

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

[env.staging]
[[env.staging.dispatch_namespaces]]
binding = "DISPATCHER"
namespace = "staging"

[[env.staging.routes]]
pattern = "staging.ciudatis.com"
custom_domain = true

[[env.staging.routes]]
pattern = "*.staging.ciudatis.com"
custom_domain = true
```

### Config for Path-Based MVP

```toml
# core/wrangler.toml
name = "ciudatis-core"
main = "src/index.ts"
compatibility_date = "2026-04-01"

[[routes]]
pattern = "ciudatis.com/*"
zone_name = "ciudatis.com"
```

---

## SECTION 7: CUSTOM METADATA FOR ADVANCED ROUTING

If you need tenant-specific metadata (plan tier, feature flags, region), store it in KV:

```typescript
// Dispatcher with metadata lookup
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const tenantId = url.hostname.split('.')[0];

    // Lookup tenant config
    const metadata = await env.TENANT_CONFIG.get(tenantId, 'json');
    if (!metadata) {
      return new Response('Tenant not configured', { status: 404 });
    }

    // Enforce limits based on plan
    const limits = {
      cpuMs: metadata.plan === 'enterprise' ? 50 : 20,
      subRequests: metadata.plan === 'enterprise' ? 50 : 10,
    };

    const tenantWorker = env.DISPATCHER.get(tenantId, {}, { limits });
    return await tenantWorker.fetch(request);
  }
};
```

---

## SECTION 8: COST ANALYSIS

**Cloudflare Free Tier:**
- ✅ 100,000 requests/day across all Workers
- ✅ Unlimited Workers in dispatch namespace
- ✅ All routing patterns included
- ❌ No custom limits (set via paid plan)

**For Ciudatis MVP:**
- Dispatcher Worker: shared request quota
- Landing Worker: shared quota
- Admin Worker: shared quota
- 100 tenant Workers: shared quota

**Rough math:**
- 1 tenant = ~50 requests/day during dev (onboarding)
- 100 tenants = 5,000 requests/day max
- Safe under 100k free tier

**When to upgrade to Standard ($25/month):**
- >50 active tenants with real usage
- Need custom limits enforcement
- Want stability/SLA guarantees

---

## SECTION 9: KNOWN GOTCHAS & SOLUTIONS

### 1. Wildcard DNS Doesn't Work Out of the Box

**Problem**: `*.ciudatis.com` requires manual DNS record setup.

**Solution**:
```
Type: A
Name: *
Content: 104.16.132.229 (Cloudflare edge IP)
```

Then in Wrangler, `custom_domain = true` auto-manages certificates.

### 2. Route Pattern Specificity

**Problem**: If you have both `ciudatis.com/*` and `*.ciudatis.com/*`, which wins?

**Solution**: More specific pattern wins. Order in wrangler.toml doesn't matter:
- `ciudatis.com` matches only apex
- `*.ciudatis.com` matches subdomains only
- Both coexist without conflict

### 3. Custom Domain Certificates

**Problem**: Cloudflare auto-creates Advanced Certificates for custom domains. You might see billing alerts.

**Solution**: These are free with free tier and standard plans. No additional cost. Ignore warnings.

### 4. Dynamic Dispatch with Missing Worker

**Problem**: If tenant Worker doesn't exist, `env.DISPATCHER.get(name)` throws.

**Solution**: Always wrap in try/catch:
```javascript
try {
  const w = env.DISPATCHER.get(tenantId);
  return await w.fetch(request);
} catch (e) {
  if (e.message.includes('Worker not found')) {
    return new Response('Tenant not found', { status: 404 });
  }
  throw e;
}
```

### 5. Deploying Tenant Workers to Dispatch

**Problem**: Tenant Workers aren't deployed via routes—they're deployed via API.

**Solution**: Use Wrangler CLI:
```bash
wrangler publish --name tandil-abc --dispatch-namespace production
```

Or use Cloudflare API for automation.

---

## SECTION 10: REFERENCES & FURTHER READING

### Official Cloudflare Docs
1. **Routes**: https://developers.cloudflare.com/workers/configuration/routing/routes/
2. **Custom Domains**: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
3. **Workers for Platforms**: https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/
4. **Dynamic Dispatch**: https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/dynamic-dispatch/
5. **Worker Isolation**: https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/worker-isolation/

### Example Repos
- **Official Workers for Platforms Example**: https://github.com/cloudflare/workers-for-platforms-example
- **Multi-tenant SaaS on Cloudflare**: https://github.com/florianheysen/platforms-cf-worker

### Articles (2026)
- How to Build a Multi-Tenant SaaS on Cloudflare Workers for $0/Month (2026) - Docat, Medium
- Multi-Tenant Vanity URLs with Cloudflare for SaaS - jonathansblog

---

## FINAL RECOMMENDATIONS

### For Ciudatis Implementation:

1. **Start with Path-Based** (`/ar/tandil-abc`) if you need to ship within 1 week
   - Use single Worker with URL parsing
   - Set up tenant auth in code
   - DNS: No changes, route to existing ciudatis.com

2. **Move to Subdomain Dispatch** as soon as you have 20+ tenants or after v1.0 MVP
   - Cleaner URLs, better isolation
   - Dispatcher Worker handles routing
   - Independent tenant deployments
   - Timeline: 2-3 days refactor

3. **Reserve Custom Domain Capability** for future tenant upgrades
   - CNAME their domain to dispatch
   - No code changes needed
   - Post-MVP feature

4. **Invest in Ops Automation**
   - Tenant provisioning script (deploy Worker to dispatch namespace)
   - Config lookup in KV (plan tier, features, limits)
   - Monitoring dashboard (dispatch Worker metrics)

---

**Research completed**: April 3, 2026  
**Recommended action**: Implement Phase 1 (path-based), plan Phase 2 (dispatch) for v1.0 release cycle.
