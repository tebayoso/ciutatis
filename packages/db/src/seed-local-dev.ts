import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { createDb } from "./client.js";
import {
  agents,
  authAccounts,
  authUsers,
  companies,
  companyMemberships,
  goals,
  instanceUserRoles,
  issues,
  projects,
} from "./schema/index.js";

const ADMIN_USER_ID = "admin-local-dev";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "Password123!";
const ADMIN_NAME = "Admin";
const DEMO_COMPANY_NAME = "Ciutatis Demo Co";
const DEMO_ISSUE_PREFIX = "DEMO";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;

  const port = process.env.PAPERCLIP_EMBEDDED_POSTGRES_PORT ?? "54329";
  return `postgres://paperclip:paperclip@127.0.0.1:${port}/paperclip`;
}

async function ensureAdminUser(db: ReturnType<typeof createDb>) {
  const now = new Date();
  const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();

  const existingUser = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, normalizedEmail))
    .then((rows) => rows[0] ?? null);

  const userId = existingUser?.id ?? ADMIN_USER_ID;
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  if (!existingUser) {
    await db.insert(authUsers).values({
      id: userId,
      name: ADMIN_NAME,
      email: normalizedEmail,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(authUsers)
      .set({
        name: ADMIN_NAME,
        emailVerified: true,
        updatedAt: now,
      })
      .where(eq(authUsers.id, userId));
  }

  const existingAccount = await db
    .select({ id: authAccounts.id })
    .from(authAccounts)
    .where(and(eq(authAccounts.userId, userId), eq(authAccounts.providerId, "credential")))
    .then((rows) => rows[0] ?? null);

  if (!existingAccount) {
    await db.insert(authAccounts).values({
      id: randomUUID(),
      accountId: normalizedEmail,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(authAccounts)
      .set({
        password: passwordHash,
        updatedAt: now,
      })
      .where(eq(authAccounts.id, existingAccount.id));
  }

  const existingRole = await db
    .select({ id: instanceUserRoles.id })
    .from(instanceUserRoles)
    .where(and(eq(instanceUserRoles.userId, userId), eq(instanceUserRoles.role, "instance_admin")))
    .then((rows) => rows[0] ?? null);

  if (!existingRole) {
    await db.insert(instanceUserRoles).values({
      userId,
      role: "instance_admin",
    });
  }

  return userId;
}

async function ensureDemoCompany(db: ReturnType<typeof createDb>, adminUserId: string) {
  const existingCompany = await db
    .select()
    .from(companies)
    .where(eq(companies.name, DEMO_COMPANY_NAME))
    .then((rows) => rows[0] ?? null);

  const company =
    existingCompany ??
    (
      await db
        .insert(companies)
        .values({
          name: DEMO_COMPANY_NAME,
          description: "Sample institution for local development",
          status: "active",
          issuePrefix: DEMO_ISSUE_PREFIX,
          issueCounter: 4,
          budgetMonthlyCents: 500_00,
        })
        .returning()
    )[0]!;

  const membership = await db
    .select({ id: companyMemberships.id })
    .from(companyMemberships)
    .where(
      and(
        eq(companyMemberships.companyId, company.id),
        eq(companyMemberships.principalType, "user"),
        eq(companyMemberships.principalId, adminUserId),
      ),
    )
    .then((rows) => rows[0] ?? null);

  if (!membership) {
    await db.insert(companyMemberships).values({
      companyId: company.id,
      principalType: "user",
      principalId: adminUserId,
      status: "active",
      membershipRole: "owner",
    });
  }

  return company;
}

async function ensureDemoWorkspace(db: ReturnType<typeof createDb>, companyId: string) {
  const existingCeo = await db
    .select()
    .from(agents)
    .where(and(eq(agents.companyId, companyId), eq(agents.name, "CEO Agent")))
    .then((rows) => rows[0] ?? null);

  const ceo =
    existingCeo ??
    (
      await db
        .insert(agents)
        .values({
          companyId,
          name: "CEO Agent",
          role: "ceo",
          title: "Chief Executive Officer",
          status: "idle",
          adapterType: "process",
          adapterConfig: { command: "echo", args: ["hello from ceo"] },
          budgetMonthlyCents: 150_00,
        })
        .returning()
    )[0]!;

  const existingEngineer = await db
    .select()
    .from(agents)
    .where(and(eq(agents.companyId, companyId), eq(agents.name, "Engineer Agent")))
    .then((rows) => rows[0] ?? null);

  const engineer =
    existingEngineer ??
    (
      await db
        .insert(agents)
        .values({
          companyId,
          name: "Engineer Agent",
          role: "engineer",
          title: "Software Engineer",
          status: "idle",
          reportsTo: ceo.id,
          adapterType: "process",
          adapterConfig: { command: "echo", args: ["hello from engineer"] },
          budgetMonthlyCents: 100_00,
        })
        .returning()
    )[0]!;

  const existingGoal = await db
    .select()
    .from(goals)
    .where(and(eq(goals.companyId, companyId), eq(goals.title, "Ship V1")))
    .then((rows) => rows[0] ?? null);

  const goal =
    existingGoal ??
    (
      await db
        .insert(goals)
        .values({
          companyId,
          title: "Ship V1",
          description: "Deliver first control plane release",
          level: "company",
          status: "active",
          ownerAgentId: ceo.id,
        })
        .returning()
    )[0]!;

  const existingProject = await db
    .select()
    .from(projects)
    .where(and(eq(projects.companyId, companyId), eq(projects.name, "Control Plane MVP")))
    .then((rows) => rows[0] ?? null);

  const project =
    existingProject ??
    (
      await db
        .insert(projects)
        .values({
          companyId,
          goalId: goal.id,
          name: "Control Plane MVP",
          description: "Implement core board + agent loop",
          status: "in_progress",
          leadAgentId: ceo.id,
        })
        .returning()
    )[0]!;

  const existingIssueCount = await db
    .select({ id: issues.id })
    .from(issues)
    .where(eq(issues.companyId, companyId))
    .then((rows) => rows.length);

  if (existingIssueCount === 0) {
    await db.insert(issues).values([
      {
        companyId,
        projectId: project.id,
        goalId: goal.id,
        title: "Implement atomic task checkout",
        description: "Ensure in_progress claiming is conflict-safe",
        status: "in_progress",
        priority: "high",
        issueNumber: 1,
        identifier: `${DEMO_ISSUE_PREFIX}-1`,
        assigneeAgentId: engineer.id,
        createdByAgentId: ceo.id,
      },
      {
        companyId,
        projectId: project.id,
        goalId: goal.id,
        title: "Add budget auto-pause",
        description: "Pause agent at hard budget ceiling",
        status: "todo",
        priority: "medium",
        issueNumber: 2,
        identifier: `${DEMO_ISSUE_PREFIX}-2`,
        createdByAgentId: ceo.id,
      },
      {
        companyId,
        projectId: project.id,
        goalId: goal.id,
        title: "Review onboarding flow copy",
        description: "Polish first-run institution setup messaging",
        status: "backlog",
        priority: "low",
        issueNumber: 3,
        identifier: `${DEMO_ISSUE_PREFIX}-3`,
        createdByAgentId: ceo.id,
      },
      {
        companyId,
        projectId: project.id,
        goalId: goal.id,
        title: "Publish release notes draft",
        description: "Summarize shipped control-plane changes for operators",
        status: "done",
        priority: "medium",
        issueNumber: 4,
        identifier: `${DEMO_ISSUE_PREFIX}-4`,
        assigneeAgentId: engineer.id,
        createdByAgentId: ceo.id,
      },
    ]);
  }

  return { ceo, engineer, goal, project };
}

async function main() {
  const db = createDb(resolveDatabaseUrl());

  console.log("Seeding local development data...");
  const adminUserId = await ensureAdminUser(db);
  const company = await ensureDemoCompany(db, adminUserId);
  await ensureDemoWorkspace(db, company.id);

  console.log("Local development seed complete.");
  console.log(`Admin email: ${ADMIN_EMAIL}`);
  console.log(`Admin password: ${ADMIN_PASSWORD}`);
  console.log(`Demo institution: ${DEMO_COMPANY_NAME} (${DEMO_ISSUE_PREFIX})`);
  console.log(`Board URL: http://127.0.0.1:3100/${DEMO_ISSUE_PREFIX}/requests`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
