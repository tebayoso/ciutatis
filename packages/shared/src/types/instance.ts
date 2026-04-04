import type { TenantInstance } from "./tenant-instance.js";

export interface InstanceExperimentalSettings {
  enableIsolatedWorkspaces: boolean;
}

export interface TenantProvisioningSettings {
  baseDomain: string;
  pathTemplate: string;
  workerNameTemplate: string;
  defaultRoutingMode: "path" | "subdomain" | "custom_domain";
}

export interface CloudflareProvisioningSettings {
  enabled: boolean;
  accountId: string;
  zoneId: string;
  zoneName: string;
  publicHostname: string;
  adminHostname: string;
  landingHostname: string;
  dispatchNamespace: string;
  routingKvNamespaceId: string;
  routingKvNamespaceTitle: string | null;
  tenantWorkerScriptPrefix: string;
  tenantDatabasePrefix: string;
  tenantBucketPrefix: string;
  tenantKvPrefix: string;
  apiTokenConfigured: boolean;
  lastValidatedAt: Date | null;
  lastValidationError: string | null;
}

export interface CloudflareProvisioningValidationResult {
  ok: boolean;
  checkedAt: Date;
  accountReachable: boolean;
  zoneReachable: boolean;
  dispatchNamespaceReachable: boolean;
  routingKvReachable: boolean;
  message: string | null;
}

export interface InstanceAdminOverview {
  generatedAt: Date;
  cloudflare: Pick<
    CloudflareProvisioningSettings,
    | "enabled"
    | "accountId"
    | "zoneName"
    | "publicHostname"
    | "adminHostname"
    | "landingHostname"
    | "dispatchNamespace"
    | "apiTokenConfigured"
    | "lastValidatedAt"
    | "lastValidationError"
  >;
  tenants: {
    total: number;
    active: number;
    provisioning: number;
    error: number;
    paused: number;
    archived: number;
    bootstrapPending: number;
  };
  jobs: {
    queued: number;
    running: number;
    failed: number;
  };
  warnings: string[];
  recentJobs: Array<{
    id: string;
    tenantId: string;
    tenantName: string;
    status: string;
    step: string;
    errorMessage: string | null;
    createdAt: Date;
  }>;
}

export interface InstanceSettings {
  id: string;
  experimental: InstanceExperimentalSettings;
  tenants?: TenantInstance[];
  tenantProvisioning?: TenantProvisioningSettings;
  cloudflareProvisioning?: CloudflareProvisioningSettings;
  createdAt: Date;
  updatedAt: Date;
}
