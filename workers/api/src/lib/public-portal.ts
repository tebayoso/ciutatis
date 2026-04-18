import { and, desc, eq, like, or, sql } from "drizzle-orm";
import {
  agents,
  companies,
  companyLogos,
  issueComments,
  issues,
  publicRequestUpdates,
  publicRequests,
} from "@ciutatis/db-cloudflare";
import type {
  PublicRequestCommentInput,
  PublicRequestCreateInput,
} from "@paperclipai/shared";
import {
  buildInstitutionPortalSlug,
  buildPublicSummary,
  createPublicRequestId,
  derivePublicRequestStatus,
  redactPublicText,
} from "@paperclipai/shared";
import { conflict, forbidden, notFound } from "./errors.js";
import { hashToken } from "./crypto.js";

function createRecoveryToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
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
}) {
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

function toReplyMode(submissionMode: string) {
  if (submissionMode === "account") return "account";
  if (submissionMode === "guest") return "guest";
  return "none";
}

export function publicPortalService(db: any) {
  async function listInstitutions() {
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

    return rows.map(toInstitutionSummary).sort((left: any, right: any) => left.name.localeCompare(right.name));
  }

  async function getInstitutionBySlug(slug: string) {
    const institutions = await listInstitutions();
    return institutions.find((institution: any) => institution.slug === slug) ?? null;
  }

  async function pickAssigneeAgent(companyId: string) {
    const rows = await db.select().from(agents).where(eq(agents.companyId, companyId));
    const eligible = rows.filter((agent: any) => agent.status !== "terminated" && agent.status !== "pending_approval");
    const roleRank = new Map([
      ["general", 0],
      ["pm", 1],
      ["cto", 2],
      ["ceo", 3],
      ["researcher", 4],
    ]);
    eligible.sort((left: any, right: any) => {
      const leftRank = roleRank.get(left.role) ?? 10;
      const rightRank = roleRank.get(right.role) ?? 10;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return String(left.name ?? "").localeCompare(String(right.name ?? ""));
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
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await db.insert(publicRequestUpdates).values({
      id,
      publicRequestId: input.publicRequestId,
      issueId: input.issueId,
      companyId: input.companyId,
      kind: input.kind,
      actorLabel: input.actorLabel,
      body: input.body,
      createdAt: now,
      updatedAt: now,
    });
    await db
      .update(publicRequests)
      .set({ updatedAt: now } as any)
      .where(eq(publicRequests.id, input.publicRequestId));

    return { id, createdAt: now };
  }

  async function createPublicRequest(input: PublicRequestCreateInput & { ownerUserId?: string | null }) {
    if (input.submissionMode === "account" && !input.ownerUserId) {
      throw forbidden("Signed-in account required for account-mode submissions");
    }

    const institution =
      input.institutionId
        ? (await listInstitutions()).find((entry: any) => entry.id === input.institutionId) ?? null
        : input.institutionSlug
          ? await getInstitutionBySlug(input.institutionSlug)
          : null;

    if (!institution) throw notFound("Institution not found");

    const assignee = await pickAssigneeAgent(institution.id);
    if (!assignee) throw conflict("No active agents are available for this institution");

    const sanitizedTitle = redactPublicText(input.title.trim());
    const sanitizedDescription = redactPublicText(input.description.trim());
    const publicTitle = sanitizedTitle.text || "Citizen request";
    const publicDescription = sanitizedDescription.text || "No public description available.";
    const piiDetected = sanitizedTitle.piiDetected || sanitizedDescription.piiDetected;
    const recoveryToken = input.submissionMode === "guest" ? createRecoveryToken() : null;

    const issueCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.companyId, institution.id))
      .then((rows: any[]) => rows[0]?.count ?? 0);

    const issueNumber = Number(issueCount) + 1;
    const identifier = `${institution.issuePrefix}-${issueNumber}`;
    const issueId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(issues).values({
      id: issueId,
      companyId: institution.id,
      title: input.title.trim(),
      description: buildPortalIssueDescription(input),
      status: "todo",
      priority: input.category === "corruption" ? "high" : "medium",
      assigneeAgentId: assignee.id,
      assigneeUserId: null,
      createdByAgentId: null,
      createdByUserId: input.ownerUserId ?? null,
      issueNumber,
      identifier,
      requestDepth: 0,
      createdAt: now,
      updatedAt: now,
    });

    const publicId = createPublicRequestId(identifier, issueId);
    const publicRequestId = crypto.randomUUID();

    await db.insert(publicRequests).values({
      id: publicRequestId,
      issueId,
      companyId: institution.id,
      publicId,
      institutionSlug: institution.slug,
      submissionMode: input.submissionMode,
      ownerUserId: input.ownerUserId ?? null,
      contactName: input.contactName?.trim() || null,
      contactEmail: input.contactEmail?.trim().toLowerCase() || null,
      recoveryTokenHash: recoveryToken ? await hashToken(recoveryToken) : null,
      category: input.category,
      locationLabel: input.locationLabel?.trim() || null,
      publicTitle,
      publicSummary: buildPublicSummary(publicDescription),
      publicDescription,
      publicStatus: derivePublicRequestStatus("todo"),
      piiDetected,
      createdAt: now,
      updatedAt: now,
    });

    await appendUpdate({
      publicRequestId,
      issueId,
      companyId: institution.id,
      kind: "system",
      actorLabel: "Ciutatis Portal",
      body: "Request received and published after privacy protection.",
    });
    await appendUpdate({
      publicRequestId,
      issueId,
      companyId: institution.id,
      kind: "system",
      actorLabel: "Routing Agent",
      body: "Agent triage started and routing is being prepared.",
    });

    return {
      result: {
        publicId,
        identifier,
        recoveryToken,
      },
      issueId,
      companyId: institution.id,
      assigneeAgentId: assignee.id,
    };
  }

  async function listPublicRequests(filters?: {
    institutionSlug?: string;
    publicStatus?: string;
    category?: string;
    q?: string;
  }) {
    const conditions = [];
    if (filters?.institutionSlug) conditions.push(eq(publicRequests.institutionSlug, filters.institutionSlug));
    if (filters?.publicStatus) conditions.push(eq(publicRequests.publicStatus, filters.publicStatus));
    if (filters?.category) conditions.push(eq(publicRequests.category, filters.category));
    if (filters?.q?.trim()) {
      conditions.push(
        or(
          like(publicRequests.publicTitle, `%${filters.q.trim()}%`),
          like(publicRequests.publicSummary, `%${filters.q.trim()}%`),
        ),
      );
    }

    return db
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
  }

  async function getPublicRequest(publicId: string, viewer?: { userId?: string | null }) {
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
      .then((rows: any[]) => rows[0] ?? null);

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
      publicStatus: row.publicStatus,
      category: row.category,
      locationLabel: row.locationLabel,
      submissionMode: row.submissionMode,
      piiDetected: Boolean(row.piiDetected),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      updates: updates.map((update: any) => ({
        id: update.id,
        kind: update.kind,
        actorLabel: update.actorLabel,
        body: update.body,
        createdAt: update.createdAt,
      })),
      replyMode: toReplyMode(row.submissionMode),
      viewerCanReply: row.submissionMode === "account" && Boolean(viewer?.userId) && viewer?.userId === row.ownerUserId,
    };
  }

  async function addPublicComment(publicId: string, input: PublicRequestCommentInput, viewer?: { userId?: string | null }) {
    const record = await db
      .select({
        id: publicRequests.id,
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
      .then((rows: any[]) => rows[0] ?? null);

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
      (await hashToken(presentedRecovery)) === record.recoveryTokenHash;

    if (!isOwner && !hasRecoveryMatch) {
      throw forbidden("You are not allowed to add a follow-up to this public request");
    }

    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(issueComments).values({
      id: commentId,
      companyId: record.companyId,
      issueId: record.issueId,
      authorAgentId: null,
      authorUserId: isOwner ? viewer?.userId ?? null : null,
      body: input.body.trim(),
      createdAt: now,
      updatedAt: now,
    });

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
      comment: { id: commentId },
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
      .then((rows: any[]) => rows[0] ?? null);
    if (!record) return null;

    const nextStatus = derivePublicRequestStatus(issueStatus);
    if (nextStatus === record.publicStatus) return record;

    const now = new Date().toISOString();
    await db
      .update(publicRequests)
      .set({ publicStatus: nextStatus, updatedAt: now } as any)
      .where(eq(publicRequests.id, record.id));

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

    return record;
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
