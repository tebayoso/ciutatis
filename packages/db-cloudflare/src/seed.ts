import { createDb, type Db } from "./client.js";
import {
  institutions,
  instanceSettings,
  agents,
  agentApiKeys,
  objectives,
  projects,
  projectObjectives,
} from "./schema/index.js";

// ── Helpers ──────────────────────────────────────────────────────────

/** SHA-256 hex hash using the Web Crypto API (available in Workers & D1). */
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function makeSeedApiKey(slug: string): string {
  return `ciu_seed_${slug}_${crypto.randomUUID().slice(0, 12)}`;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Seed the Ciutatis institution and mark it as instance admin.
 * Agents, goals, and projects are seeded by separate tasks.
 */
export async function seedCiutatisCompany(d1: D1Database) {
  const db = createDb(d1);
  return seedWithDb(db);
}

export async function seedWithDb(db: Db) {
  const now = new Date().toISOString();
  const companyId = crypto.randomUUID();

  const [company] = await db
    .insert(institutions)
    .values({
      id: companyId,
      name: "Ciutatis",
      description:
        "Civic operations platform — the institution that builds itself. " +
        "Ciutatis dogfoods its own control plane to coordinate development, " +
        "track objectives, and govern agent work.",
      status: "active",
      issuePrefix: "CIU",
      issueCounter: 0,
      budgetMonthlyCents: 100_000,
      spentMonthlyCents: 0,
      requireBoardApprovalForNewAgents: true,
      brandColor: "#2563eb",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db.insert(instanceSettings).values({
    id: crypto.randomUUID(),
    singletonKey: "default",
    experimental: { adminCompanyId: companyId },
    createdAt: now,
    updatedAt: now,
  });

  const agentResult = await seedAgents(db, companyId);
  const objectiveResult = await seedGoalsAndProjects(db, companyId, agentResult.ceo.id);

  return { company: company!, ...agentResult, ...objectiveResult };
}

// ── Agent Seeding ────────────────────────────────────────────────────

interface SeedAgentsResult {
  ceo: typeof agents.$inferSelect;
  engineeringLead: typeof agents.$inferSelect;
  qa: typeof agents.$inferSelect;
  supportAgent: typeof agents.$inferSelect;
  /** Plain-text API keys — only available at seed time. */
  apiKeys: { ceo: string; engineeringLead: string; qa: string; supportAgent: string };
}

async function seedAgents(db: Db, companyId: string): Promise<SeedAgentsResult> {
  const now = new Date().toISOString();

  const [ceo] = await db
    .insert(agents)
    .values({
      companyId,
      name: "CEO Agent",
      role: "ceo",
      title: "Chief Executive Officer",
      icon: "👔",
      status: "idle",
      adapterType: "process",
      adapterConfig: { command: "echo", args: ["hello from ceo"] },
      runtimeConfig: {},
      budgetMonthlyCents: 50_000,
      spentMonthlyCents: 0,
      permissions: {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [engLead] = await db
    .insert(agents)
    .values({
      companyId,
      name: "Engineering Lead Agent",
      role: "lead",
      title: "Engineering Lead",
      icon: "🛠️",
      status: "idle",
      reportsTo: ceo!.id,
      adapterType: "process",
      adapterConfig: { command: "echo", args: ["hello from engineering-lead"] },
      runtimeConfig: {},
      budgetMonthlyCents: 50_000,
      spentMonthlyCents: 0,
      permissions: {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [qa] = await db
    .insert(agents)
    .values({
      companyId,
      name: "QA Agent",
      role: "qa",
      title: "Quality Assurance Lead",
      icon: "🔍",
      status: "idle",
      reportsTo: ceo!.id,
      adapterType: "process",
      adapterConfig: { command: "echo", args: ["hello from qa"] },
      runtimeConfig: {},
      budgetMonthlyCents: 50_000,
      spentMonthlyCents: 0,
      permissions: {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [supportAgent] = await db
    .insert(agents)
    .values({
      companyId,
      name: "Customer Support",
      role: "support",
      title: "Customer Support Agent",
      icon: "💬",
      status: "idle",
      reportsTo: ceo!.id,
      adapterType: "process",
      adapterConfig: { command: "echo", args: ["hello from support"] },
      runtimeConfig: {},
      budgetMonthlyCents: 50_000,
      spentMonthlyCents: 0,
      permissions: {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const ceoKey = makeSeedApiKey("ceo");
  const engKey = makeSeedApiKey("eng");
  const qaKey = makeSeedApiKey("qa");
  const supportKey = makeSeedApiKey("support");

   const [ceoHash, engHash, qaHash, supportHash] = await Promise.all([
    hashToken(ceoKey),
    hashToken(engKey),
    hashToken(qaKey),
    hashToken(supportKey),
  ]);

  await db.insert(agentApiKeys).values([
    {
      agentId: ceo!.id,
      companyId,
      name: "CEO seed key",
      keyHash: ceoHash,
      createdAt: now,
    },
    {
      agentId: engLead!.id,
      companyId,
      name: "Engineering Lead seed key",
      keyHash: engHash,
      createdAt: now,
    },
    {
      agentId: qa!.id,
      companyId,
      name: "QA seed key",
      keyHash: qaHash,
      createdAt: now,
    },
    {
      agentId: supportAgent!.id,
      companyId,
      name: "Customer Support seed key",
      keyHash: supportHash,
      createdAt: now,
    },
  ]);

  return {
    ceo: ceo!,
    engineeringLead: engLead!,
    qa: qa!,
    supportAgent: supportAgent!,
    apiKeys: { ceo: ceoKey, engineeringLead: engKey, qa: qaKey, supportAgent: supportKey },
  };
}

// ── Goals & Projects Seeding ────────────────────────────────────────

interface SeedGoalsAndProjectsResult {
  goals: {
    shipV1: typeof objectives.$inferSelect;
    civicTemplates: typeof objectives.$inferSelect;
  };
  projects: {
    platformCore: typeof projects.$inferSelect;
    landingPage: typeof projects.$inferSelect;
  };
}

/**
 * Seed company-level goals and projects for the Ciutatis institution.
 *
 * @param db        – Drizzle database instance
 * @param companyId – ID of the Ciutatis institution
 * @param ceoId     – ID of the CEO agent who owns goals and leads projects
 */
export async function seedGoalsAndProjects(
  db: Db,
  companyId: string,
  ceoId: string,
): Promise<SeedGoalsAndProjectsResult> {
  const now = new Date().toISOString();

  // ── Goals ────────────────────────────────────────────────────────────

  const [goalShipV1] = await db
    .insert(objectives)
    .values({
      companyId,
      title: "Ship V1",
      description:
        "Deliver the first production-ready release of the Ciutatis platform " +
        "with full institution management, agent orchestration, objective tracking, " +
        "and governance capabilities.",
      level: "company",
      status: "active",
      ownerAgentId: ceoId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [goalCivicTemplates] = await db
    .insert(objectives)
    .values({
      companyId,
      title: "Build civic templates",
      description:
        "Create a library of reusable civic department templates — pre-configured " +
        "org structures, agent roles, and skill sets — that municipalities can " +
        "import to bootstrap their Ciutatis instance in minutes.",
      level: "company",
      status: "planned",
      ownerAgentId: ceoId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // ── Projects ─────────────────────────────────────────────────────────

  const [projectCore] = await db
    .insert(projects)
    .values({
      companyId,
      goalId: goalShipV1!.id,
      name: "Platform Core",
      description:
        "Core platform infrastructure: API server, database layer, agent runtime, " +
        "heartbeat scheduler, budget enforcement, and governance engine.",
      status: "in_progress",
      leadAgentId: ceoId,
      color: "#2563eb",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [projectLanding] = await db
    .insert(projects)
    .values({
      companyId,
      goalId: goalShipV1!.id,
      name: "Landing Page",
      description:
        "Public-facing website and documentation site for Ciutatis — " +
        "marketing copy, onboarding guides, and civic template showcase.",
      status: "backlog",
      leadAgentId: ceoId,
      color: "#10b981",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // ── Project ↔ Goal join records ──────────────────────────────────────

  await db.insert(projectObjectives).values([
    {
      projectId: projectCore!.id,
      goalId: goalShipV1!.id,
      companyId,
      createdAt: now,
      updatedAt: now,
    },
    {
      projectId: projectLanding!.id,
      goalId: goalShipV1!.id,
      companyId,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  return {
    goals: {
      shipV1: goalShipV1!,
      civicTemplates: goalCivicTemplates!,
    },
    projects: {
      platformCore: projectCore!,
      landingPage: projectLanding!,
    },
  };
}

// ── Combined orchestrator ───────────────────────────────────────────

/**
 * Run every seeder in dependency order.
 * Called by the Cloudflare Worker or wrangler seed script.
 */
export async function seedAll(d1: D1Database) {
  const db = createDb(d1);
  return seedWithDb(db);
}
