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

export interface InstanceSettings {
  id: string;
  experimental: InstanceExperimentalSettings;
  tenants?: TenantInstance[];
  tenantProvisioning?: TenantProvisioningSettings;
  createdAt: Date;
  updatedAt: Date;
}
