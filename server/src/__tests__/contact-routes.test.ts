import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { contactRoutes } from "../routes/contact.js";

const mockInstitutionService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockRequestService = vi.hoisted(() => ({
  create: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  institutionService: () => mockInstitutionService,
  agentService: () => mockAgentService,
  requestService: () => mockRequestService,
  heartbeatService: () => mockHeartbeatService,
  logActivity: mockLogActivity,
}));

const validPayload = {
  name: "Jane Doe",
  email: "jane@example.com",
  message: "Need help connecting a support workflow.",
  locale: "en",
  sourcePath: "/en/platform",
} as const;

function createApp(opts?: {
  publicContactCompanyId?: string;
  publicContactAssigneeAgentId?: string;
}) {
  const app = express();
  app.use(express.json());
  app.use("/api", contactRoutes({} as any, opts ?? {}));
  app.use(errorHandler);
  return app;
}

describe("contact routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInstitutionService.getById.mockResolvedValue({
      id: "company-1",
      name: "Company One",
    });
    mockAgentService.getById.mockResolvedValue({
      id: "agent-1",
      companyId: "company-1",
      status: "active",
    });
    mockRequestService.create.mockResolvedValue({
      id: "issue-1",
      identifier: "PAP-101",
      title: "Website contact from Jane Doe",
    });
    mockHeartbeatService.wakeup.mockResolvedValue(undefined);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("creates a todo request, logs system activity, and wakes the support agent", async () => {
    const res = await request(
      createApp({
        publicContactCompanyId: "company-1",
        publicContactAssigneeAgentId: "agent-1",
      }),
    )
      .post("/api/contact")
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: "issue-1",
      identifier: "PAP-101",
    });
    expect(mockRequestService.create).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        title: "Website contact from Jane Doe",
        assigneeAgentId: "agent-1",
        status: "todo",
        priority: "medium",
        createdByAgentId: null,
        createdByUserId: null,
      }),
    );
    expect(mockRequestService.create.mock.calls[0]?.[1]?.description).toContain("- Locale: en");
    expect(mockRequestService.create.mock.calls[0]?.[1]?.description).toContain("- Source path: /en/platform");
    expect(mockRequestService.create.mock.calls[0]?.[1]?.description).toContain("## Message");
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        companyId: "company-1",
        actorType: "system",
        actorId: "public-contact-form",
        action: "issue.created",
        entityType: "issue",
        entityId: "issue-1",
        details: expect.objectContaining({
          identifier: "PAP-101",
          source: "public_contact_form",
          locale: "en",
          sourcePath: "/en/platform",
        }),
      }),
    );
    expect(mockHeartbeatService.wakeup).toHaveBeenCalledWith(
      "agent-1",
      expect.objectContaining({
        source: "assignment",
        reason: "public_contact_form",
        requestedByActorType: "system",
        requestedByActorId: "public-contact-form",
        payload: expect.objectContaining({
          issueId: "issue-1",
          source: "public_contact_form",
        }),
      }),
    );
  });

  it("returns 400 for invalid public contact payloads", async () => {
    const res = await request(
      createApp({
        publicContactCompanyId: "company-1",
        publicContactAssigneeAgentId: "agent-1",
      }),
    )
      .post("/api/contact")
      .send({
        ...validPayload,
        email: "not-an-email",
        message: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
    expect(mockRequestService.create).not.toHaveBeenCalled();
  });

  it("returns 503 when public contact target configuration is missing", async () => {
    const res = await request(createApp())
      .post("/api/contact")
      .send(validPayload);

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: "Public contact intake is not configured",
    });
    expect(mockInstitutionService.getById).not.toHaveBeenCalled();
    expect(mockRequestService.create).not.toHaveBeenCalled();
  });

  it("returns 503 when the configured company and assignee do not resolve to a valid pair", async () => {
    mockAgentService.getById.mockResolvedValue({
      id: "agent-1",
      companyId: "company-2",
      status: "active",
    });

    const res = await request(
      createApp({
        publicContactCompanyId: "company-1",
        publicContactAssigneeAgentId: "agent-1",
      }),
    )
      .post("/api/contact")
      .send(validPayload);

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: "Public contact intake target is invalid",
    });
    expect(mockRequestService.create).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
    expect(mockHeartbeatService.wakeup).not.toHaveBeenCalled();
  });
});
