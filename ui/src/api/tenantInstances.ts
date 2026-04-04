import type {
  CloudflareProvisioningSettings,
  CloudflareProvisioningValidationResult,
  CreateTenantInstance,
  InstanceAdminOverview,
  PatchCloudflareProvisioningSettings,
  PatchTenantProvisioningSettings,
  TenantInstance,
  TenantProvisioningJob,
  TenantProvisioningSettings,
  UpdateTenantInstance,
} from "@ciutatis/shared";
import { api } from "./client";

export const tenantInstancesApi = {
  getOverview: () => api.get<InstanceAdminOverview>("/instance/settings/admin-overview"),
  list: () => api.get<TenantInstance[]>("/instance/settings/tenants"),
  create: (data: CreateTenantInstance) => api.post<TenantInstance>("/instance/settings/tenants", data),
  update: (tenantId: string, data: UpdateTenantInstance) =>
    api.patch<TenantInstance>(`/instance/settings/tenants/${tenantId}`, data),
  getJobs: (tenantId: string) =>
    api.get<TenantProvisioningJob[]>(`/instance/settings/tenants/${tenantId}/jobs`),
  redeploy: (tenantId: string) =>
    api.post<TenantInstance>(`/instance/settings/tenants/${tenantId}/redeploy`, {}),
  pause: (tenantId: string) =>
    api.post<TenantInstance>(`/instance/settings/tenants/${tenantId}/pause`, {}),
  archive: (tenantId: string) =>
    api.post<TenantInstance>(`/instance/settings/tenants/${tenantId}/archive`, {}),
  getProvisioning: () => api.get<TenantProvisioningSettings>("/instance/settings/tenant-provisioning"),
  updateProvisioning: (patch: PatchTenantProvisioningSettings) =>
    api.patch<TenantProvisioningSettings>("/instance/settings/tenant-provisioning", patch),
  getCloudflare: () => api.get<CloudflareProvisioningSettings>("/instance/settings/cloudflare"),
  updateCloudflare: (patch: PatchCloudflareProvisioningSettings) =>
    api.patch<CloudflareProvisioningSettings>("/instance/settings/cloudflare", patch),
  validateCloudflare: () =>
    api.post<CloudflareProvisioningValidationResult>("/instance/settings/cloudflare/validate", {}),
};
