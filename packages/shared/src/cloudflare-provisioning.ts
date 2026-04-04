import type {
  CloudflareProvisioningSettings,
  CloudflareProvisioningValidationResult,
  TenantInstance,
} from "./types/index.js";

const DEFAULT_API_BASE = "https://api.cloudflare.com/client/v4";
const DEFAULT_COMPATIBILITY_DATE = "2025-01-01";

function ensureSuccess<T>(payload: CloudflareApiEnvelope<T>, fallbackMessage: string) {
  if (payload.success) return payload.result;
  const message = payload.errors?.map((error) => error.message).filter(Boolean).join("; ") || fallbackMessage;
  throw new Error(message);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function buildTenantRuntimeScript(args: {
  tenantId: string;
  tenantName: string;
  pathPrefix: string;
  adminHostname: string;
}) {
  const title = escapeHtml(args.tenantName);
  const prefix = escapeHtml(args.pathPrefix);
  const adminUrl = `https://${args.adminHostname}`;
  return `
const placeholderHtml = ${JSON.stringify(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #f5f0e6 0%, #e6efe9 100%); color: #16211b; }
      main { width: min(720px, calc(100vw - 32px)); border: 1px solid rgba(22,33,27,0.12); border-radius: 24px; padding: 32px; background: rgba(255,255,255,0.88); box-shadow: 0 24px 80px rgba(22,33,27,0.08); }
      h1 { margin: 0 0 12px; font-size: clamp(2rem, 5vw, 3rem); line-height: 1; }
      p { margin: 0 0 12px; line-height: 1.6; }
      code { padding: 2px 6px; border-radius: 999px; background: rgba(22,33,27,0.08); }
      a { color: #0c6b58; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>This tenant runtime is provisioned and reachable.</p>
      <p>Base path: <code>${prefix}</code></p>
      <p>The administrator control panel lives at <a href="${adminUrl}">${adminUrl}</a>.</p>
      <p>Health check: <code>${prefix}/__tenant/health</code></p>
    </main>
  </body>
</html>`)};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/__tenant/health") {
      return Response.json({
        ok: true,
        tenantId: env.TENANT_ID,
        tenantName: env.TENANT_NAME,
        pathPrefix: env.TENANT_PATH_PREFIX,
        hasD1: Boolean(env.DB),
        hasKv: Boolean(env.TENANT_CACHE),
        hasR2: Boolean(env.ASSETS),
      });
    }

    return new Response(placeholderHtml, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  },
};
`.trim();
}

async function parseCloudflareResponse<T>(response: Response, fallbackMessage: string) {
  const payload = await response.json() as CloudflareApiEnvelope<T>;
  if (!response.ok) {
    throw new Error(
      payload.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
        `${fallbackMessage} (${response.status})`,
    );
  }
  return ensureSuccess(payload, fallbackMessage);
}

export interface CloudflareApiError {
  code?: number;
  message?: string;
}

export interface CloudflareApiEnvelope<T> {
  success: boolean;
  errors?: CloudflareApiError[];
  result: T;
}

export interface TenantProvisioningResources {
  dispatchScriptName: string;
  tenantD1DatabaseId: string | null;
  tenantD1DatabaseName: string | null;
  tenantKvNamespaceId: string | null;
  tenantKvNamespaceTitle: string | null;
  tenantR2BucketName: string | null;
}

export interface TenantProvisioner {
  validate(settings: CloudflareProvisioningSettings): Promise<CloudflareProvisioningValidationResult>;
  provisionTenant(
    settings: CloudflareProvisioningSettings,
    tenant: Pick<TenantInstance, "id" | "name" | "workerName" | "dispatchScriptName" | "pathPrefix" | "dispatcherKey">,
  ): Promise<TenantProvisioningResources>;
  redeployTenant(
    settings: CloudflareProvisioningSettings,
    tenant: Pick<
      TenantInstance,
      | "id"
      | "name"
      | "workerName"
      | "dispatchScriptName"
      | "pathPrefix"
      | "dispatcherKey"
      | "tenantD1DatabaseId"
      | "tenantD1DatabaseName"
      | "tenantKvNamespaceId"
      | "tenantKvNamespaceTitle"
      | "tenantR2BucketName"
    >,
  ): Promise<TenantProvisioningResources>;
  archiveTenant(
    settings: CloudflareProvisioningSettings,
    tenant: Pick<TenantInstance, "id" | "dispatchScriptName" | "pathPrefix" | "dispatcherKey">,
  ): Promise<void>;
  refreshRoutingCache(
    settings: CloudflareProvisioningSettings,
    input: Pick<TenantInstance, "id" | "pathPrefix" | "dispatcherKey" | "dispatchScriptName" | "workerName">,
  ): Promise<void>;
}

export class MockTenantProvisioner implements TenantProvisioner {
  async validate(settings: CloudflareProvisioningSettings): Promise<CloudflareProvisioningValidationResult> {
    return {
      ok: true,
      checkedAt: new Date(),
      accountReachable: settings.enabled,
      zoneReachable: settings.enabled,
      dispatchNamespaceReachable: settings.enabled,
      routingKvReachable: settings.enabled,
      message: settings.enabled ? "Mock Cloudflare provisioner ready" : "Cloudflare provisioning disabled",
    };
  }

  async provisionTenant(
    settings: CloudflareProvisioningSettings,
    tenant: Pick<TenantInstance, "id" | "workerName" | "dispatchScriptName">,
  ): Promise<TenantProvisioningResources> {
    const resourceSlug = slugify(tenant.workerName || tenant.id);
    return {
      dispatchScriptName: tenant.dispatchScriptName ?? `${settings.tenantWorkerScriptPrefix}-${resourceSlug}`,
      tenantD1DatabaseId: `mock-d1-${resourceSlug}`,
      tenantD1DatabaseName: `${settings.tenantDatabasePrefix}-${resourceSlug}`,
      tenantKvNamespaceId: `mock-kv-${resourceSlug}`,
      tenantKvNamespaceTitle: `${settings.tenantKvPrefix}-${resourceSlug}`,
      tenantR2BucketName: `${settings.tenantBucketPrefix}-${resourceSlug}`,
    };
  }

  redeployTenant(
    settings: CloudflareProvisioningSettings,
    tenant: Pick<
      TenantInstance,
      | "id"
      | "workerName"
      | "dispatchScriptName"
      | "tenantD1DatabaseId"
      | "tenantD1DatabaseName"
      | "tenantKvNamespaceId"
      | "tenantKvNamespaceTitle"
      | "tenantR2BucketName"
    >,
  ) {
    return this.provisionTenant(settings, tenant);
  }

  async archiveTenant() {
    return;
  }

  async refreshRoutingCache() {
    return;
  }
}

export interface CloudflareTenantProvisionerOptions {
  apiToken: string;
  apiBaseUrl?: string;
  compatibilityDate?: string;
}

export class CloudflareTenantProvisioner implements TenantProvisioner {
  private readonly apiToken: string;
  private readonly apiBaseUrl: string;
  private readonly compatibilityDate: string;

  constructor(options: CloudflareTenantProvisionerOptions) {
    this.apiToken = options.apiToken;
    this.apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE;
    this.compatibilityDate = options.compatibilityDate ?? DEFAULT_COMPATIBILITY_DATE;
  }

  private async request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        ...(init?.headers ?? {}),
      },
    });
    return parseCloudflareResponse<T>(response, `Cloudflare API request failed for ${path}`);
  }

  private async ensureD1Database(settings: CloudflareProvisioningSettings, desiredName: string, existingId?: string | null) {
    if (existingId) {
      return {
        id: existingId,
        name: desiredName,
      };
    }
    const result = await this.request<{ uuid: string; name: string }>(
      `/accounts/${settings.accountId}/d1/database`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: desiredName }),
      },
    );
    return {
      id: result.uuid,
      name: result.name ?? desiredName,
    };
  }

  private async ensureKvNamespace(
    settings: CloudflareProvisioningSettings,
    desiredTitle: string,
    existingId?: string | null,
    existingTitle?: string | null,
  ) {
    if (existingId) {
      return {
        id: existingId,
        title: existingTitle ?? desiredTitle,
      };
    }
    const result = await this.request<{ id: string; title: string }>(
      `/accounts/${settings.accountId}/storage/kv/namespaces`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ title: desiredTitle }),
      },
    );
    return {
      id: result.id,
      title: result.title ?? desiredTitle,
    };
  }

  private async ensureR2Bucket(settings: CloudflareProvisioningSettings, desiredName: string, existingName?: string | null) {
    const bucketName = existingName ?? desiredName;
    if (!existingName) {
      await this.request(
        `/accounts/${settings.accountId}/r2/buckets`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ name: bucketName }),
        },
      );
    }
    return {
      name: bucketName,
    };
  }

  private async uploadDispatchScript(args: {
    settings: CloudflareProvisioningSettings;
    tenant: Pick<TenantInstance, "id" | "name" | "pathPrefix">;
    scriptName: string;
    tenantD1DatabaseId: string | null;
    tenantKvNamespaceId: string | null;
    tenantR2BucketName: string | null;
  }) {
    const form = new FormData();
    form.set(
      "metadata",
      JSON.stringify({
        main_module: "index.mjs",
        compatibility_date: this.compatibilityDate,
        bindings: [
          ...(args.tenantD1DatabaseId
            ? [{ type: "d1", name: "DB", id: args.tenantD1DatabaseId }]
            : []),
          ...(args.tenantKvNamespaceId
            ? [{ type: "kv_namespace", name: "TENANT_CACHE", namespace_id: args.tenantKvNamespaceId }]
            : []),
          ...(args.tenantR2BucketName
            ? [{ type: "r2_bucket", name: "ASSETS", bucket_name: args.tenantR2BucketName }]
            : []),
          { type: "plain_text", name: "TENANT_ID", text: args.tenant.id },
          { type: "plain_text", name: "TENANT_NAME", text: args.tenant.name },
          { type: "plain_text", name: "TENANT_PATH_PREFIX", text: args.tenant.pathPrefix },
        ],
      }),
    );
    form.set(
      "index.mjs",
      new Blob(
        [
          buildTenantRuntimeScript({
            tenantId: args.tenant.id,
            tenantName: args.tenant.name,
            pathPrefix: args.tenant.pathPrefix,
            adminHostname: args.settings.adminHostname,
          }),
        ],
        { type: "application/javascript+module" },
      ),
      "index.mjs",
    );

    await this.request(
      `/accounts/${args.settings.accountId}/workers/dispatch/namespaces/${args.settings.dispatchNamespace}/scripts/${args.scriptName}`,
      {
        method: "PUT",
        body: form,
      },
    );
  }

  async validate(settings: CloudflareProvisioningSettings): Promise<CloudflareProvisioningValidationResult> {
    const checkedAt = new Date();
    let accountReachable = false;
    let zoneReachable = false;
    let dispatchNamespaceReachable = false;
    let routingKvReachable = false;
    let message: string | null = null;

    try {
      await this.request(`/accounts/${settings.accountId}`);
      accountReachable = true;

      await this.request(`/zones/${settings.zoneId}`);
      zoneReachable = true;

      await this.request(`/accounts/${settings.accountId}/workers/dispatch/namespaces/${settings.dispatchNamespace}`);
      dispatchNamespaceReachable = true;

      if (settings.routingKvNamespaceId) {
        await this.request(`/accounts/${settings.accountId}/storage/kv/namespaces/${settings.routingKvNamespaceId}`);
        routingKvReachable = true;
      } else {
        message = "Routing KV namespace is not configured";
      }
    } catch (error) {
      message = error instanceof Error ? error.message : "Cloudflare validation failed";
    }

    return {
      ok: accountReachable && zoneReachable && dispatchNamespaceReachable && routingKvReachable,
      checkedAt,
      accountReachable,
      zoneReachable,
      dispatchNamespaceReachable,
      routingKvReachable,
      message,
    };
  }

  async provisionTenant(
    settings: CloudflareProvisioningSettings,
    tenant: Pick<TenantInstance, "id" | "name" | "workerName" | "dispatchScriptName" | "pathPrefix">,
  ): Promise<TenantProvisioningResources> {
    const resourceSlug = slugify(tenant.workerName || tenant.id);
    const dispatchScriptName = tenant.dispatchScriptName ?? `${settings.tenantWorkerScriptPrefix}-${resourceSlug}`;
    const desiredDatabaseName = `${settings.tenantDatabasePrefix}-${resourceSlug}`;
    const desiredKvTitle = `${settings.tenantKvPrefix}-${resourceSlug}`;
    const desiredBucketName = `${settings.tenantBucketPrefix}-${resourceSlug}`;

    const d1 = await this.ensureD1Database(settings, desiredDatabaseName);
    const kv = await this.ensureKvNamespace(settings, desiredKvTitle);
    const r2 = await this.ensureR2Bucket(settings, desiredBucketName);

    await this.uploadDispatchScript({
      settings,
      tenant,
      scriptName: dispatchScriptName,
      tenantD1DatabaseId: d1.id,
      tenantKvNamespaceId: kv.id,
      tenantR2BucketName: r2.name,
    });

    return {
      dispatchScriptName,
      tenantD1DatabaseId: d1.id,
      tenantD1DatabaseName: d1.name,
      tenantKvNamespaceId: kv.id,
      tenantKvNamespaceTitle: kv.title,
      tenantR2BucketName: r2.name,
    };
  }

  async redeployTenant(
    settings: CloudflareProvisioningSettings,
    tenant: Pick<
      TenantInstance,
      | "id"
      | "name"
      | "workerName"
      | "dispatchScriptName"
      | "pathPrefix"
      | "tenantD1DatabaseId"
      | "tenantD1DatabaseName"
      | "tenantKvNamespaceId"
      | "tenantKvNamespaceTitle"
      | "tenantR2BucketName"
    >,
  ): Promise<TenantProvisioningResources> {
    const resourceSlug = slugify(tenant.workerName || tenant.id);
    const dispatchScriptName = tenant.dispatchScriptName ?? `${settings.tenantWorkerScriptPrefix}-${resourceSlug}`;
    const d1 = await this.ensureD1Database(
      settings,
      tenant.tenantD1DatabaseName ?? `${settings.tenantDatabasePrefix}-${resourceSlug}`,
      tenant.tenantD1DatabaseId,
    );
    const kv = await this.ensureKvNamespace(
      settings,
      tenant.tenantKvNamespaceTitle ?? `${settings.tenantKvPrefix}-${resourceSlug}`,
      tenant.tenantKvNamespaceId,
      tenant.tenantKvNamespaceTitle,
    );
    const r2 = await this.ensureR2Bucket(
      settings,
      tenant.tenantR2BucketName ?? `${settings.tenantBucketPrefix}-${resourceSlug}`,
      tenant.tenantR2BucketName,
    );

    await this.uploadDispatchScript({
      settings,
      tenant,
      scriptName: dispatchScriptName,
      tenantD1DatabaseId: d1.id,
      tenantKvNamespaceId: kv.id,
      tenantR2BucketName: r2.name,
    });

    return {
      dispatchScriptName,
      tenantD1DatabaseId: d1.id,
      tenantD1DatabaseName: d1.name,
      tenantKvNamespaceId: kv.id,
      tenantKvNamespaceTitle: kv.title,
      tenantR2BucketName: r2.name,
    };
  }

  async archiveTenant(
    settings: CloudflareProvisioningSettings,
    tenant: Pick<TenantInstance, "dispatchScriptName">,
  ) {
    if (!tenant.dispatchScriptName) return;
    try {
      await this.request(
        `/accounts/${settings.accountId}/workers/dispatch/namespaces/${settings.dispatchNamespace}/scripts/${tenant.dispatchScriptName}`,
        {
          method: "DELETE",
        },
      );
    } catch {
      // Keep archive soft-delete tolerant; the control plane records the soft-archive even if teardown fails.
    }
  }

  async refreshRoutingCache(
    settings: CloudflareProvisioningSettings,
    input: Pick<TenantInstance, "id" | "pathPrefix" | "dispatcherKey" | "dispatchScriptName" | "workerName">,
  ) {
    if (!settings.routingKvNamespaceId) return;
    const scriptName = input.dispatchScriptName ?? input.workerName;
    if (!scriptName) return;

    const body = JSON.stringify({
      tenantId: input.id,
      pathPrefix: input.pathPrefix,
      dispatcherKey: input.dispatcherKey,
      workerName: scriptName,
      updatedAt: new Date().toISOString(),
    });

    await fetch(
      `${this.apiBaseUrl}/accounts/${settings.accountId}/storage/kv/namespaces/${settings.routingKvNamespaceId}/values/${encodeURIComponent(input.pathPrefix)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "content-type": "application/json",
        },
        body,
      },
    );
  }
}
