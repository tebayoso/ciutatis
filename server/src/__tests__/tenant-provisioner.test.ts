import { describe, expect, it } from "vitest";
import { MockTenantProvisioner } from "@paperclipai/shared";

describe("MockTenantProvisioner", () => {
  it("returns stable mock resources for a tenant deployment", async () => {
    const provisioner = new MockTenantProvisioner();
    const settings = {
      enabled: false,
      accountId: "",
      zoneId: "",
      zoneName: "ciutatis.com",
      publicHostname: "ciutatis.com",
      adminHostname: "admin.ciutatis.com",
      landingHostname: "ciutatis.com",
      dispatchNamespace: "ciutatis-tenants",
      routingKvNamespaceId: "",
      routingKvNamespaceTitle: null,
      tenantWorkerScriptPrefix: "ciutatis-tenant",
      tenantDatabasePrefix: "ciutatis-tenant-db",
      tenantBucketPrefix: "ciutatis-tenant-r2",
      tenantKvPrefix: "ciutatis-tenant-kv",
      apiTokenConfigured: false,
      lastValidatedAt: null,
      lastValidationError: null,
    } as const;

    const validation = await provisioner.validate(settings);
    const resources = await provisioner.provisionTenant(settings, {
      id: "tenant-1",
      name: "Tandil",
      workerName: "ciutatis-ar-tandil-abc",
      dispatchScriptName: null,
      pathPrefix: "/ar/tandil-abc",
      dispatcherKey: "ar/tandil-abc",
    });

    expect(validation.ok).toBe(true);
    expect(resources.dispatchScriptName).toContain("ciutatis-tenant");
    expect(resources.tenantD1DatabaseName).toContain("ciutatis-tenant-db");
    expect(resources.tenantKvNamespaceTitle).toContain("ciutatis-tenant-kv");
    expect(resources.tenantR2BucketName).toContain("ciutatis-tenant-r2");
  });
});
