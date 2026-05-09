// Stub company-skills service - feature intentionally removed from Ciutatis
// This file exists only to satisfy upstream imports

import type { Db } from "@paperclipai/db";

export interface RuntimeSkillEntry {
  key: string;
  required: boolean;
}

export interface CompanySkillService {
  getCompanySkills(): Promise<unknown[]>;
  syncCompanySkills(): Promise<void>;
  // Upstream-only methods
  listRuntimeSkillEntries(_companyId: string, _options?: { materializeMissing?: boolean }): Promise<RuntimeSkillEntry[]>;
  resolveRequestedSkillKeys(_companyId: string, _requestedSkills: string[]): Promise<string[]>;
}

export function companySkillService(_db: Db): CompanySkillService {
  return {
    async getCompanySkills() {
      return [];
    },
    async syncCompanySkills() {
      // No-op - feature removed
    },
    async listRuntimeSkillEntries() {
      return [];
    },
    async resolveRequestedSkillKeys(_companyId: string, requestedSkills: string[]) {
      return requestedSkills;
    },
  };
}
