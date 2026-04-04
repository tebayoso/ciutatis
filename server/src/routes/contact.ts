import { Router } from "express";
import type { Db } from "@ciutatis/db";
import {
  publicContactSubmissionSchema,
  type PublicContactSubmissionInput,
} from "@ciutatis/shared";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../errors.js";
import {
  agentService,
  heartbeatService,
  institutionService,
  logActivity,
  requestService,
} from "../services/index.js";
import { logger } from "../middleware/logger.js";

interface ContactRoutesOptions {
  publicContactCompanyId?: string;
  publicContactAssigneeAgentId?: string;
}

function buildContactDescription(payload: PublicContactSubmissionInput) {
  return [
    "Website contact submission",
    "",
    `- Name: ${payload.name}`,
    `- Email: ${payload.email}`,
    `- Locale: ${payload.locale}`,
    `- Source path: ${payload.sourcePath}`,
    "",
    "## Message",
    "",
    payload.message,
  ].join("\n");
}

export function contactRoutes(db: Db, opts: ContactRoutesOptions) {
  const router = Router();
  const institutions = institutionService(db);
  const agents = agentService(db);
  const requests = requestService(db);
  const heartbeat = heartbeatService(db);

  async function resolveTarget() {
    const companyId = opts.publicContactCompanyId?.trim();
    const assigneeAgentId = opts.publicContactAssigneeAgentId?.trim();

    if (!companyId || !assigneeAgentId) {
      throw new HttpError(503, "Public contact intake is not configured");
    }

    const [company, assigneeAgent] = await Promise.all([
      institutions.getById(companyId),
      agents.getById(assigneeAgentId),
    ]);

    if (!company || !assigneeAgent || assigneeAgent.companyId !== company.id) {
      throw new HttpError(503, "Public contact intake target is invalid");
    }

    if (assigneeAgent.status === "terminated" || assigneeAgent.status === "pending_approval") {
      throw new HttpError(503, "Public contact intake target is invalid");
    }

    return { company, assigneeAgent };
  }

  router.post("/contact", validate(publicContactSubmissionSchema), async (req, res) => {
    const payload = req.body as PublicContactSubmissionInput;
    const { company, assigneeAgent } = await resolveTarget();

    const created = await requests.create(company.id, {
      title: `Website contact from ${payload.name}`,
      description: buildContactDescription(payload),
      assigneeAgentId: assigneeAgent.id,
      status: "todo",
      priority: "medium",
      createdByAgentId: null,
      createdByUserId: null,
    });

    await logActivity(db, {
      companyId: company.id,
      actorType: "system",
      actorId: "public-contact-form",
      action: "issue.created",
      entityType: "issue",
      entityId: created.id,
      details: {
        title: created.title,
        identifier: created.identifier,
        source: "public_contact_form",
        locale: payload.locale,
        sourcePath: payload.sourcePath,
      },
    });

    void heartbeat
      .wakeup(assigneeAgent.id, {
        source: "assignment",
        triggerDetail: "system",
        reason: "public_contact_form",
        payload: {
          issueId: created.id,
          mutation: "create",
          source: "public_contact_form",
        },
        requestedByActorType: "system",
        requestedByActorId: "public-contact-form",
        contextSnapshot: {
          issueId: created.id,
          source: "public_contact_form",
        },
      })
      .catch((err) => {
        logger.warn({ err, issueId: created.id }, "failed to wake support agent for public contact request");
      });

    res.status(201).json({
      id: created.id,
      identifier: created.identifier,
    });
  });

  return router;
}
