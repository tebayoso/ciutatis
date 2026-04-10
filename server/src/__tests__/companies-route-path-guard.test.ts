import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { institutionRoutes } from "../routes/institutions.js";

vi.mock("../services/index.js", () => ({
  institutionService: () => ({
    list: vi.fn(),
    stats: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    remove: vi.fn(),
  }),
  companyPortabilityService: () => ({
    exportBundle: vi.fn(),
    previewImport: vi.fn(),
    importBundle: vi.fn(),
  }),
  accessService: () => ({
    canUser: vi.fn(),
    ensureMembership: vi.fn(),
  }),
  budgetService: () => ({
    upsertPolicy: vi.fn(),
  }),
  logActivity: vi.fn(),
}));

describe("institution routes malformed request path guard", () => {
  it("returns a clear error when companyId is missing for issues list path", async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as any).actor = {
        type: "agent",
        agentId: "agent-1",
        companyId: "company-1",
        source: "agent_key",
      };
      next();
    });
    app.use("/api/companies", institutionRoutes({} as any));
    app.use("/api/institutions", institutionRoutes({} as any));

    const companiesRes = await request(app).get("/api/companies/issues");
    const institutionsRes = await request(app).get("/api/institutions/issues");

    expect(companiesRes.status).toBe(400);
    expect(companiesRes.body).toEqual({
      error: "Missing companyId in path. Use /api/companies/{companyId}/issues.",
    });
    expect(institutionsRes.status).toBe(400);
    expect(institutionsRes.body).toEqual({
      error: "Missing companyId in path. Use /api/companies/{companyId}/issues.",
    });
  });
});
