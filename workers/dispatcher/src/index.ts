import { parseTenantRoutePathname } from "@paperclipai/shared";

interface RoutedTenantRecord {
  tenantId: string;
  pathPrefix: string;
  dispatcherKey: string;
  workerName: string;
  updatedAt: string;
}

interface DispatchNamespaceBinding {
  get(name: string): Fetcher;
}

interface Env {
  LANDING_ORIGIN: string;
  ROUTING_CACHE: KVNamespace;
  TENANT_RUNTIME: DispatchNamespaceBinding;
}

function proxyRequest(targetOrigin: string, request: Request, pathname: string) {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(pathname + incomingUrl.search, targetOrigin);
  return new Request(upstreamUrl.toString(), request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__dispatcher/health") {
      return Response.json({ ok: true });
    }

    const tenantRoute = parseTenantRoutePathname(url.pathname);
    if (!tenantRoute) {
      return fetch(proxyRequest(env.LANDING_ORIGIN, request, url.pathname));
    }

    const cached = await env.ROUTING_CACHE.get(tenantRoute.pathPrefix, "json") as RoutedTenantRecord | null;
    if (!cached?.workerName) {
      return new Response("Tenant runtime not found", { status: 404 });
    }

    const tenantWorker = env.TENANT_RUNTIME.get(cached.workerName);
    const forwarded = proxyRequest(url.origin, request, tenantRoute.remainderPath);
    const headers = new Headers(forwarded.headers);
    headers.set("x-ciutatis-tenant-id", cached.tenantId);
    headers.set("x-ciutatis-tenant-prefix", tenantRoute.pathPrefix);

    return tenantWorker.fetch(new Request(forwarded, { headers }));
  },
};
