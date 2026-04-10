import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const BASE_URL = `http://127.0.0.1:${process.env.PAPERCLIP_E2E_PORT ?? 3100}`;
const ADMIN_NAME = "E2E Admin";
const ADMIN_EMAIL = `e2e-admin-${Date.now()}@paperclip.local`;
const ADMIN_PASSWORD = "paperclip-e2e-password";
const COMPANY_NAME = `Auth-E2E-${Date.now()}`;
const AGENT_NAME = "CEO";
const TASK_TITLE = "Authenticated E2E task";
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required test environment variable: ${name}`);
  }
  return value;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}

function createBootstrapInvite(): string {
  const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const output = execFileSync(
    pnpmBin,
    [
      "ciutatis",
      "auth",
      "bootstrap-ceo",
      "--data-dir",
      requireEnv("PAPERCLIP_E2E_HOME"),
      "--base-url",
      BASE_URL,
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PAPERCLIP_CONFIG: requireEnv("PAPERCLIP_E2E_CONFIG"),
        PAPERCLIP_HOME: requireEnv("PAPERCLIP_E2E_HOME"),
        PAPERCLIP_INSTANCE_ID: "e2e",
        BETTER_AUTH_SECRET: "ciutatis-e2e-secret",
      },
      encoding: "utf8",
    },
  );

  const inviteUrl = stripAnsi(output).match(
    /https?:\/\/\S+\/invite\/pcp_bootstrap_[A-Za-z0-9]+/,
  )?.[0];
  if (!inviteUrl) {
    throw new Error(`Bootstrap invite URL not found in CLI output:\n${output}`);
  }
  return inviteUrl;
}

async function completeOnboarding(page: Page) {
  const wizardHeading = page.locator("h3", { hasText: "Name your company" });
  const startButton = page.getByRole("button", { name: "Start Onboarding" });

  await Promise.race([
    wizardHeading.waitFor({ state: "visible", timeout: 20_000 }),
    startButton.waitFor({ state: "visible", timeout: 20_000 }),
  ]);
  if (!(await wizardHeading.isVisible()) && (await startButton.isVisible())) {
    await startButton.click();
  }
  await expect(wizardHeading).toBeVisible({ timeout: 20_000 });

  await page.locator('input[placeholder="Acme Corp"]').fill(COMPANY_NAME);
  await page.getByRole("button", { name: "Next" }).click();

  await expect(
    page.locator("h3", { hasText: "Create your first agent" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('input[placeholder="CEO"]')).toHaveValue(AGENT_NAME);
  await expect(page.getByText("Cloudflare Workers AI")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  await expect(
    page.locator("h3", { hasText: "Give it something to do" }),
  ).toBeVisible({ timeout: 10_000 });
  await page
    .locator('input[placeholder="e.g. Research competitor pricing"]')
    .fill(TASK_TITLE);
  await page.getByRole("button", { name: "Next" }).click();

  await expect(
    page.locator("h3", { hasText: "Ready to launch" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(COMPANY_NAME)).toBeVisible();
  await expect(page.getByText(AGENT_NAME)).toBeVisible();
  await expect(page.getByText(TASK_TITLE)).toBeVisible();

  await page.getByRole("button", { name: "Create & Open Issue" }).click();
  await expect(page).toHaveURL(/\/issues\//, { timeout: 10_000 });
}

async function signIn(page: Page) {
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Sign in" }).first().click();
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 20_000 });
}

test.describe("Authenticated bootstrap flow", () => {
  test("signs up, accepts bootstrap invite, completes onboarding, and signs in again", async ({
    page,
  }) => {
    const inviteUrl = createBootstrapInvite();

    await page.goto(inviteUrl);
    await expect(page.getByText("Sign in or create an account")).toBeVisible();
    await page.getByRole("link", { name: "Sign in / Create account" }).click();

    await expect(page.getByText("Create your Ciutatis account")).toBeVisible();
    await page.locator('input[autocomplete="name"]').fill(ADMIN_NAME);
    await page.locator('input[autocomplete="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[autocomplete="new-password"], input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator("form").getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("button", { name: "Accept bootstrap invite" })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole("button", { name: "Accept bootstrap invite" }).click();

    await expect(page.getByText("Bootstrap complete")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("link", { name: "Open board" }).click();

    await completeOnboarding(page);

    const companiesRes = await page.request.get(`${BASE_URL}/api/companies`);
    expect(companiesRes.ok()).toBe(true);
    const companies = (await companiesRes.json()) as Array<{ id: string; name: string }>;
    const company = companies.find((entry) => entry.name === COMPANY_NAME);
    expect(company).toBeTruthy();

    const agentsRes = await page.request.get(`${BASE_URL}/api/companies/${company!.id}/agents`);
    expect(agentsRes.ok()).toBe(true);
    const agents = (await agentsRes.json()) as Array<{
      id: string;
      name: string;
      role: string;
      adapterType: string;
    }>;
    const ceoAgent = agents.find((entry) => entry.name === AGENT_NAME);
    expect(ceoAgent).toBeTruthy();
    expect(ceoAgent!.role).toBe("ceo");
    expect(ceoAgent!.adapterType).toBe("cloudflare_workers_ai");

    const issuesRes = await page.request.get(`${BASE_URL}/api/companies/${company!.id}/issues`);
    expect(issuesRes.ok()).toBe(true);
    const issues = (await issuesRes.json()) as Array<{
      id: string;
      title: string;
      assigneeAgentId: string | null;
    }>;
    const issue = issues.find((entry) => entry.title === TASK_TITLE);
    expect(issue).toBeTruthy();
    expect(issue!.assigneeAgentId).toBe(ceoAgent!.id);

    await page.evaluate(async () => {
      const res = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(`Sign out failed: ${res.status}`);
      }
    });
    await page.goto("/app");
    await expect(page).toHaveURL(/\/auth/, { timeout: 20_000 });

    await signIn(page);
    await page.goto("/app");
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 20_000 });
    await expect(page.getByText(COMPANY_NAME)).toBeVisible({ timeout: 20_000 });
  });
});
