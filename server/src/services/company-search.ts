// Stub - company-search not in Ciutatis V1 scope
// This file exists only to satisfy upstream imports

import type { Db } from "@paperclipai/db";

export interface CompanySearchService {
  search(): Promise<unknown[]>;
  indexCompany(): Promise<void>;
}

export function companySearchService(_db: Db): CompanySearchService {
  return {
    async search() {
      return [];
    },
    async indexCompany() {
      // No-op
    },
  };
}
