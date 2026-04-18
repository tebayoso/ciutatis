import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, like, or } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  agents,
  companies,
  companyLogos,
  issueComments,
  issues,
  publicRequestUpdates,
  publicRequests,
} from "@paperclipai/db";
import type {
  PublicInstitutionSummary,
  PublicRequestCategory,
  PublicRequestCommentInput,
  PublicRequestCreateInput,
  PublicRequestCreateResult,
  PublicRequestDetail,
  PublicRequestStatus,
  PublicRequestSummary,
  PublicSubmissionMode,
} from "@paperclipai/shared";
import {
  buildInstitutionPortalSlug,
  buildPublicSummary,
  createPublicRequestId,
  derivePublicRequestStatus,
  redactPublicText,
} from "@paperclipai/shared";
import { conflict, forbidden, notFound, unprocessable } from "../errors.js";
import { requestService } from "./requestService.js";

function hashRecoveryToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createRecoveryToken() {
  return randomBytes(18).toString("base64url");
}

function buildPortalIssueDescription(input: PublicRequestCreateInput) {
  const lines = [
    "Public civic portal submission",
    "",
    `- Submission mode: ${input.submissionMode}`,
    `- Locale: ${input.locale}`,
    `- Category: ${input.category}`,
    `- Source path: ${input.sourcePath}`,
  ];

  if (input.locationLabel?.trim()) {
    lines.push(`- Location label: ${input.locationLabel.trim()}`);
  }

  if (input.contactName?.trim()) {
    lines.push(`- Contact name: ${input.contactName.trim()}`);
  }

  if (input.contactEmail?.trim()) {
    lines.push(`- Contact email: ${input.contactEmail.trim()}`);
  }

  lines.push("", "## Citizen report", "", input.description.trim());
  return lines.join("\n");
}

function toInstitutionSummary(row: {
  id: string;
  name: string;
  description: string | null;
  brandColor: string | null;
  logoAssetId: string | null;
  issuePrefix: string;
}): PublicInstitutionSummary {
  return {
    id: row.id,
    name: row.name,
    slug: buildInstitutionPortalSlug(row.name, row.issuePrefix),
    description: row.description,
    brandColor: row.brandColor,
    logoUrl: row.logoAssetId ? `/api/assets/${row.logoAssetId}/content` : null,
    issuePrefix: row.issuePrefix,
  };
}

function toReplyMode(submissionMode: string): PublicRequestDetail["replyMode"] {
  if (submissionMode === "account") return "account";
  if (submissionMode === "guest") return "guest";
  return "none";
}

export function publicPortalService(db: Db) {
  const requestsSvc = requestService(db);

  async function listInstitutions(): Promise<PublicInstitutionSummary[]> {
    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        description: companies.description,
        brandColor: companies.brandColor,
        logoAssetId: companyLogos.assetId,
        issuePrefix: companies.issuePrefix,
      })
      .from(companies)
      .leftJoin(companyLogos, eq(companyLogos.companyId, companies.id))
      .where(or(eq(companies.status, "active"), eq(companies.status, "paused")));

    return rows.map(toInstitutionSummary).sort((left, right) => left.name.localeCompare(right.name));
  }

  async function getInstitutionBySlug(slug: string) {
    const institutions = await listInstitutions();
    return institutions.find((institution) => institution.slug === slug) ?? null;
  }

  async function pickAssigneeAgent(companyId: string) {
    const rows = await db
      .select({
        id: agents.id,
        name: agents.name,
        role: agents.role,
        status: agents.status,
      })
      .from(agents)
      .where(eq(agents.companyId, companyId));

    const eligible = rows.filter((agent) => agent.status !== "terminated" && agent.status !== "pending_approval");
    const roleRank = new Map([
      ["general", 0],
      ["pm", 1],
      ["cto", 2],
      ["ceo", 3],
      ["researcher", 4],
    ]);

    eligible.sort((left, right) => {
      const leftRank = roleRank.get(left.role) ?? 10;
      const rightRank = roleRank.get(right.role) ?? 10;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.name.localeCompare(right.name);
    });

    return eligible[0] ?? null;
  }

  async function appendUpdate(input: {
    publicRequestId: string;
    issueId: string;
    companyId: string;
    kind: "system" | "citizen_follow_up" | "status_change";
    actorLabel: string;
    body: string;
  }) {
    const [created] = await db
      .insert(publicRequestUpdates)
      .values({
        publicRequestId: input.publicRequestId,
        issueId: input.issueId,
        companyId: input.companyId,
        kind: input.kind,
        actorLabel: input.actorLabel,
        body: input.body,
      })
      .returning();

    await db
      .update(publicRequests)
      .set({ updatedAt: new Date() })
      .where(eq(publicRequests.id, input.publicRequestId));

    return created;
  }

  async function createPublicRequest(input: PublicRequestCreateInput & { ownerUserId?: string | null }): Promise<{
    result: PublicRequestCreateResult;
    issueId: string;
    companyId: string;
    assigneeAgentId: string | null;
  }> {
    if (input.submissionMode === "account" && !input.ownerUserId) {
      throw forbidden("Signed-in account required for account-mode submissions");
    }

    const institution =
      input.institutionId
        ? (await listInstitutions()).find((entry) => entry.id === input.institutionId) ?? null
        : input.institutionSlug
          ? await getInstitutionBySlug(input.institutionSlug)
          : null;

    if (!institution) {
      throw notFound("Institution not found");
    }

    const assignee = await pickAssigneeAgent(institution.id);
    if (!assignee) {
      throw conflict("No active agents are available for this institution");
    }

    const sanitizedTitle = redactPublicText(input.title.trim());
    const sanitizedDescription = redactPublicText(input.description.trim());
    const publicTitle = sanitizedTitle.text || "Citizen request";
    const publicDescription = sanitizedDescription.text || "No public description available.";
    const piiDetected = sanitizedTitle.piiDetected || sanitizedDescription.piiDetected;
    const recoveryToken = input.submissionMode === "guest" ? createRecoveryToken() : null;

    const createdIssue = await requestsSvc.create(institution.id, {
      title: input.title.trim(),
      description: buildPortalIssueDescription(input),
      assigneeAgentId: assignee.id,
      status: "todo",
      priority: input.category === "corruption" ? "high" : "medium",
      createdByAgentId: null,
      createdByUserId: input.ownerUserId ?? null,
    });

    const publicId = createPublicRequestId(createdIssue.identifier, createdIssue.id);

    const [record] = await db
      .insert(publicRequests)
      .values({
        issueId: createdIssue.id,
        companyId: institution.id,
        publicId,
        institutionSlug: institution.slug,
        submissionMode: input.submissionMode,
        ownerUserId: input.ownerUserId ?? null,
        contactName: input.contactName?.trim() || null,
        contactEmail: input.contactEmail?.trim().toLowerCase() || null,
        recoveryTokenHash: recoveryToken ? hashRecoveryToken(recoveryToken) : null,
        category: input.category,
        locationLabel: input.locationLabel?.trim() || null,
        publicTitle,
        publicSummary: buildPublicSummary(publicDescription),
        publicDescription,
        publicStatus: derivePublicRequestStatus(createdIssue.status),
        piiDetected,
      })
      .returning();

    await appendUpdate({
      publicRequestId: record.id,
      issueId: createdIssue.id,
      companyId: institution.id,
      kind: "system",
      actorLabel: "Ciutatis Portal",
      body: "Request received and published after privacy protection.",
    });

    await appendUpdate({
      publicRequestId: record.id,
      issueId: createdIssue.id,
      companyId: institution.id,
      kind: "system",
      actorLabel: "Routing Agent",
      body: "Agent triage started and routing is being prepared.",
    });

    return {
      result: {
        publicId,
        identifier: createdIssue.identifier ?? null,
        recoveryToken,
      },
      issueId: createdIssue.id,
      companyId: institution.id,
      assigneeAgentId: assignee.id,
    };
  }

  async function listPublicRequests(filters?: {
    institutionSlug?: string;
    publicStatus?: string;
    category?: string;
    q?: string;
  }): Promise<PublicRequestSummary[]> {
    const conditions = [];
    if (filters?.institutionSlug) {
      conditions.push(eq(publicRequests.institutionSlug, filters.institutionSlug));
    }
    if (filters?.publicStatus) {
      conditions.push(eq(publicRequests.publicStatus, filters.publicStatus));
    }
    if (filters?.category) {
      conditions.push(eq(publicRequests.category, filters.category));
    }
    if (filters?.q?.trim()) {
      conditions.push(
        or(
          like(publicRequests.publicTitle, `%${filters.q.trim()}%`),
          like(publicRequests.publicSummary, `%${filters.q.trim()}%`),
        )!,
      );
    }

    const rows = await db
      .select({
        publicId: publicRequests.publicId,
        issueId: publicRequests.issueId,
        institutionId: publicRequests.companyId,
        institutionName: companies.name,
        institutionSlug: publicRequests.institutionSlug,
        publicTitle: publicRequests.publicTitle,
        publicSummary: publicRequests.publicSummary,
        publicStatus: publicRequests.publicStatus,
        category: publicRequests.category,
        locationLabel: publicRequests.locationLabel,
        submissionMode: publicRequests.submissionMode,
        piiDetected: publicRequests.piiDetected,
        createdAt: publicRequests.createdAt,
        updatedAt: publicRequests.updatedAt,
      })
      .from(publicRequests)
      .innerJoin(companies, eq(companies.id, publicRequests.companyId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(publicRequests.updatedAt));

    return rows.map((row) => ({
      ...row,
      publicStatus: row.publicStatus as PublicRequestStatus,
      category: row.category as PublicRequestCategory,
      submissionMode: row.submissionMode as PublicSubmissionMode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async function getPublicRequest(
    publicId: string,
    viewer?: { userId?: string | null },
  ): Promise<PublicRequestDetail | null> {
    const row = await db
      .select({
        id: publicRequests.id,
        publicId: publicRequests.publicId,
        issueId: publicRequests.issueId,
        institutionId: publicRequests.companyId,
        institutionName: companies.name,
        institutionSlug: publicRequests.institutionSlug,
        publicTitle: publicRequests.publicTitle,
        publicSummary: publicRequests.publicSummary,
        publicDescription: publicRequests.publicDescription,
        publicStatus: publicRequests.publicStatus,
        category: publicRequests.category,
        locationLabel: publicRequests.locationLabel,
        submissionMode: publicRequests.submissionMode,
        ownerUserId: publicRequests.ownerUserId,
        piiDetected: publicRequests.piiDetected,
        createdAt: publicRequests.createdAt,
        updatedAt: publicRequests.updatedAt,
      })
      .from(publicRequests)
      .innerJoin(companies, eq(companies.id, publicRequests.companyId))
      .where(eq(publicRequests.publicId, publicId))
      .then((rows) => rows[0] ?? null);

    if (!row) return null;

    const updates = await db
      .select()
      .from(publicRequestUpdates)
      .where(eq(publicRequestUpdates.publicRequestId, row.id))
      .orderBy(publicRequestUpdates.createdAt);

    return {
      publicId: row.publicId,
      issueId: row.issueId,
      institutionId: row.institutionId,
      institutionName: row.institutionName,
      institutionSlug: row.institutionSlug,
      publicTitle: row.publicTitle,
      publicSummary: row.publicSummary,
      publicDescription: row.publicDescription,
      publicStatus: row.publicStatus as PublicRequestDetail["publicStatus"],
      category: row.category as PublicRequestDetail["category"],
      locationLabel: row.locationLabel,
      submissionMode: row.submissionMode as PublicRequestDetail["submissionMode"],
      piiDetected: row.piiDetected,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      updates: updates.map((update) => ({
        id: update.id,
        kind: update.kind as PublicRequestDetail["updates"][number]["kind"],
        actorLabel: update.actorLabel,
        body: update.body,
        createdAt: update.createdAt.toISOString(),
      })),
      replyMode: toReplyMode(row.submissionMode),
      viewerCanReply: row.submissionMode === "account" && Boolean(viewer?.userId) && viewer?.userId === row.ownerUserId,
    };
  }

  async function addPublicComment(
    publicId: string,
    input: PublicRequestCommentInput,
    viewer?: { userId?: string | null },
  ) {
    const record = await db
      .select({
        id: publicRequests.id,
        publicId: publicRequests.publicId,
        issueId: publicRequests.issueId,
        companyId: publicRequests.companyId,
        submissionMode: publicRequests.submissionMode,
        ownerUserId: publicRequests.ownerUserId,
        recoveryTokenHash: publicRequests.recoveryTokenHash,
        assigneeAgentId: issues.assigneeAgentId,
      })
      .from(publicRequests)
      .innerJoin(issues, eq(issues.id, publicRequests.issueId))
      .where(eq(publicRequests.publicId, publicId))
      .then((rows) => rows[0] ?? null);

    if (!record) throw notFound("Public request not found");

    if (record.submissionMode === "anonymous") {
      throw forbidden("Anonymous public requests cannot receive follow-up replies");
    }

    const isOwner = record.submissionMode === "account" && viewer?.userId && viewer.userId === record.ownerUserId;
    const presentedRecovery = input.recoveryToken?.trim();
    const hasRecoveryMatch =
      record.submissionMode === "guest" &&
      !!record.recoveryTokenHash &&
      !!presentedRecovery &&
      hashRecoveryToken(presentedRecovery) === record.recoveryTokenHash;

    if (!isOwner && !hasRecoveryMatch) {
      throw forbidden("You are not allowed to add a follow-up to this public request");
    }

    const [comment] = await db
      .insert(issueComments)
      .values({
        companyId: record.companyId,
        issueId: record.issueId,
        authorAgentId: null,
        authorUserId: isOwner ? viewer?.userId ?? null : null,
        body: input.body.trim(),
      })
      .returning();

    const sanitized = redactPublicText(input.body.trim());
    await appendUpdate({
      publicRequestId: record.id,
      issueId: record.issueId,
      companyId: record.companyId,
      kind: "citizen_follow_up",
      actorLabel: "Citizen follow-up",
      body: sanitized.text || "Citizen added more context.",
    });

    return {
      comment,
      issueId: record.issueId,
      companyId: record.companyId,
      assigneeAgentId: record.assigneeAgentId,
    };
  }

  async function syncIssueStatus(issueId: string, issueStatus: string) {
    const record = await db
      .select()
      .from(publicRequests)
      .where(eq(publicRequests.issueId, issueId))
      .then((rows) => rows[0] ?? null);

    if (!record) return null;

    const nextStatus = derivePublicRequestStatus(issueStatus);
    if (nextStatus === record.publicStatus) return record;

    const [updated] = await db
      .update(publicRequests)
      .set({
        publicStatus: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(publicRequests.id, record.id))
      .returning();

    const messageByStatus: Record<string, string> = {
      received: "The request was received.",
      triage: "Routing agents are classifying the request.",
      routed: "The request has been routed for review.",
      in_progress: "Work is actively in progress.",
      waiting_on_city: "The request is waiting on a city-side dependency.",
      resolved: "The request was marked resolved.",
      closed: "The request was closed.",
    };

    await appendUpdate({
      publicRequestId: record.id,
      issueId: record.issueId,
      companyId: record.companyId,
      kind: "status_change",
      actorLabel: "Ciutatis Workflow",
      body: messageByStatus[nextStatus] ?? "The request status changed.",
    });

    return updated;
  }

  return {
    listInstitutions,
    getInstitutionBySlug,
    createPublicRequest,
    listPublicRequests,
    getPublicRequest,
    addPublicComment,
    syncIssueStatus,
  };
}
