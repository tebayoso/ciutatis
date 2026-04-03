import type {
  CreateTenantInstance,
  PatchTenantProvisioningSettings,
  TenantInstance,
  TenantProvisioningSettings,
  UpdateTenantInstance,
} from "@ciutatis/shared";
import { api } from "./client";

export const tenantInstancesApi = {
  list: () => api.get<TenantInstance[]>("/instance/settings/tenants"),
  create: (data: CreateTenantInstance) => api.post<TenantInstance>("/instance/settings/tenants", data),
  update: (tenantId: string, data: UpdateTenantInstance) =>
    api.patch<TenantInstance>(`/instance/settings/tenants/${tenantId}`, data),
  getProvisioning: () => api.get<TenantProvisioningSettings>("/instance/settings/tenant-provisioning"),
  updateProvisioning: (patch: PatchTenantProvisioningSettings) =>
    api.patch<TenantProvisioningSettings>("/instance/settings/tenant-provisioning", patch),
};
