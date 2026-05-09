// Stub - tenant-instances not in Ciutatis V1 scope
// This file exists only to satisfy upstream imports

import type { Db } from "@paperclipai/db";

export interface TenantInstanceService {
  createTenant(): Promise<unknown>;
  getTenant(): Promise<unknown>;
  listTenants(): Promise<unknown[]>;
}

export function tenantInstanceService(_db: Db): TenantInstanceService {
  return {
    async createTenant() {
      return null;
    },
    async getTenant() {
      return null;
    },
    async listTenants() {
      return [];
    },
  };
}
