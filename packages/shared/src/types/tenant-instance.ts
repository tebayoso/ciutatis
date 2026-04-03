import type { TenantInstanceStatus, TenantRoutingMode } from "../constants.js";

export interface TenantInstance {
  id: string;
  name: string;
  municipalityName: string;
  countryCode: string;
  citySlug: string;
  shortCode: string;
  routingMode: TenantRoutingMode;
  status: TenantInstanceStatus;
  pathPrefix: string;
  hostname: string | null;
  workerName: string;
  notes: string | null;
  tenantUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
