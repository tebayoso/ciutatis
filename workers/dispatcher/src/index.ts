import { parseTenantRoutePathname } from "@paperclipai/shared";

interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  domain?: string | null;
  pathPrefix: string;
  settings?: string;
}

interface Env {
  LANDING_ORIGIN: string;
  ROUTING_CACHE: KVNamespace;
  DB: D1Database;
  TENANT_CACHE: KVNamespace;
  ASSETS: R2Bucket;
}

function proxyRequest(targetOrigin: string, request: Request, pathname: string) {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(pathname + incomingUrl.search, targetOrigin);
  return new Request(upstreamUrl.toString(), request);
}

async function lookupTenant(db: D1Database, pathPrefix: string): Promise<TenantRecord | null> {
  const result = await db
    .prepare("SELECT * FROM tenants WHERE path_prefix = ? AND deleted_at IS NULL LIMIT 1")
    .bind(pathPrefix)
    .first<TenantRecord>();
  
  return result || null;
}

async function handleTenantRequest(
  request: Request,
  env: Env,
  tenant: TenantRecord,
  remainderPath: string
): Promise<Response> {
  if (remainderPath === "/__tenant/health") {
    return Response.json({
      ok: true,
      tenantId: tenant.id,
      tenantName: tenant.name,
      pathPrefix: tenant.pathPrefix,
      hasD1: Boolean(env.DB),
      hasKv: Boolean(env.TENANT_CACHE),
      hasR2: Boolean(env.ASSETS),
    });
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(tenant.name)} - Ciutatis</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, sans-serif;
        background: linear-gradient(135deg, #f5f0e6 0%, #e6efe9 100%);
        color: #14211a;
      }
      main {
        width: min(760px, calc(100vw - 32px));
        border: 1px solid rgba(20, 33, 26, 0.12);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.9);
        padding: 32px;
        box-shadow: 0 32px 90px rgba(20, 33, 26, 0.08);
      }
      code {
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(20, 33, 26, 0.08);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(tenant.name)}</h1>
      <p>Tenant ID: <code>${tenant.id}</code></p>
      <p>Path Prefix: <code>${tenant.pathPrefix}</code></p>
      <p>Health: <code>/__tenant/health</code></p>
    </main>
  </body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__dispatcher/health") {
      return Response.json({ ok: true, mode: "basic-plan-compat" });
    }

    const tenantRoute = parseTenantRoutePathname(url.pathname);
    if (!tenantRoute) {
      return fetch(proxyRequest(env.LANDING_ORIGIN, request, url.pathname));
    }

    const cached = await env.ROUTING_CACHE.get(tenantRoute.pathPrefix, "json") as { tenantId: string } | null;
    
    let tenant: TenantRecord | null = null;
    
    if (cached?.tenantId) {
      tenant = await env.DB
        .prepare("SELECT * FROM tenants WHERE id = ? AND deleted_at IS NULL LIMIT 1")
        .bind(cached.tenantId)
        .first<TenantRecord>();
    }
    
    if (!tenant) {
      tenant = await lookupTenant(env.DB, tenantRoute.pathPrefix);
      
      if (tenant) {
        await env.ROUTING_CACHE.put(
          tenantRoute.pathPrefix,
          JSON.stringify({ tenantId: tenant.id, pathPrefix: tenant.pathPrefix }),
          { expirationTtl: 300 }
        );
      }
    }
    
    if (!tenant) {
      return new Response("Tenant not found", { status: 404 });
    }

    return handleTenantRequest(request, env, tenant, tenantRoute.remainderPath);
  },
};
