// Stub - board-auth feature intentionally removed from Ciutatis
// This file exists only to satisfy upstream imports

import type { Db } from "@paperclipai/db";

export interface BoardAuthService {
  authenticate(): Promise<unknown>;
  verifyToken(): Promise<unknown>;
  createCliAuthChallenge(_body: unknown): Promise<{
    challenge: { id: string; expiresAt: Date; requestedCompanyId?: string; boardApiKeyId?: string };
    challengeSecret: string;
    pendingBoardToken: string;
  }>;
  describeCliAuthChallenge(_id: string, _token: string): Promise<{
    id: string;
    expiresAt: Date;
    requestedAccess: string;
    requestedCompanyId?: string;
    boardApiKeyId?: string;
  } | null>;
  approveCliAuthChallenge(_id: string, _token: string, _userId: string): Promise<{
    status: string;
    challenge: { id: string; expiresAt: Date; requestedAccess: string; requestedCompanyId?: string; boardApiKeyId?: string };
  }>;
  cancelCliAuthChallenge(_id: string, _token: string): Promise<{ status: string }>;
  resolveBoardActivityCompanyIds(_params: {
    userId: string;
    requestedCompanyId?: string;
    boardApiKeyId?: string;
  }): Promise<string[]>;
  resolveBoardAccess(_userId: string): Promise<{
    user: unknown;
    isInstanceAdmin: boolean;
    companyIds: string[];
    memberships: unknown[];
  }>;
  assertCurrentBoardKey(_keyId: string, _userId?: string): Promise<{ id: string; userId: string }>;
  revokeBoardApiKey(_keyId: string): Promise<void>;
}

export function boardAuthService(_db: Db): BoardAuthService {
  return {
    async authenticate() {
      throw new Error("Board auth not available in Ciutatis V1");
    },
    async verifyToken() {
      throw new Error("Board auth not available in Ciutatis V1");
    },
    async createCliAuthChallenge() {
      throw new Error("CLI auth challenges not available in Ciutatis V1");
    },
    async describeCliAuthChallenge() {
      throw new Error("CLI auth challenges not available in Ciutatis V1");
    },
    async approveCliAuthChallenge() {
      throw new Error("CLI auth challenges not available in Ciutatis V1");
    },
    async cancelCliAuthChallenge() {
      throw new Error("CLI auth challenges not available in Ciutatis V1");
    },
    async resolveBoardActivityCompanyIds() {
      return [];
    },
    async resolveBoardAccess() {
      throw new Error("Board auth not available in Ciutatis V1");
    },
    async assertCurrentBoardKey() {
      throw new Error("Board auth not available in Ciutatis V1");
    },
    async revokeBoardApiKey() {
      throw new Error("Board auth not available in Ciutatis V1");
    },
  };
}
