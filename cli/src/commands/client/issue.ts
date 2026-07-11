import { Command } from "commander";
import { readFile, writeFile } from "node:fs/promises";
import {
  addIssueCommentSchema,
  acceptIssueThreadInteractionSchema,
  cancelIssueThreadInteractionSchema,
  checkoutIssueSchema,
  createChildIssueSchema,
  createIssueLabelSchema,
  createIssueSchema,
  createIssueThreadInteractionSchema,
  createIssueTreeHoldSchema,
  createIssueWorkProductSchema,
  type FeedbackTrace,
  type HeartbeatRun,
  linkIssueApprovalSchema,
  previewIssueTreeControlSchema,
  rejectIssueThreadInteractionSchema,
  releaseIssueTreeHoldSchema,
  respondIssueThreadInteractionSchema,
  resolveIssueRecoveryActionSchema,
  restoreIssueDocumentRevisionSchema,
  updateIssueSchema,
  updateIssueWorkProductSchema,
  type Issue,
  type IssueComment,
  upsertIssueDocumentSchema,
  upsertIssueFeedbackVoteSchema,
} from "@paperclipai/shared";
import {
  addCommonClientOptions,
  apiPath,
  formatInlineRecord,
  handleCommandError,
  inferContentTypeFromPath,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface IssueBaseOptions extends BaseClientOptions {
  status?: string;
  assigneeAgentId?: string;
  projectId?: string;
  match?: string;
}

interface IssueCreateOptions extends BaseClientOptions {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
}

interface IssueUpdateOptions extends BaseClientOptions {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
  comment?: string;
  hiddenAt?: string;
}

interface IssueCommentOptions extends BaseClientOptions {
  body: string;
  reopen?: boolean;
  resume?: boolean;
}

interface IssueCommentListOptions extends BaseClientOptions {
  afterCommentId?: string;
  order?: string;
  limit?: string;
}

interface IssueCheckoutOptions extends BaseClientOptions {
  agentId: string;
  expectedStatuses?: string;
}

interface IssueFeedbackOptions extends BaseClientOptions {
  targetType?: string;
  vote?: string;
  status?: string;
  from?: string;
  to?: string;
  sharedOnly?: boolean;
  includePayload?: boolean;
  out?: string;
  format?: string;
}

interface IssueDeleteOptions extends BaseClientOptions {
  yes?: boolean;
}

interface JsonPayloadOptions extends BaseClientOptions {
  payloadJson: string;
}

interface IssueDocumentPutOptions extends BaseClientOptions {
  title?: string;
  format?: string;
  body?: string;
  bodyFile?: string;
  changeSummary?: string;
  baseRevisionId?: string;
}

interface IssueAttachmentUploadOptions extends BaseClientOptions {
  companyId?: string;
  file: string;
  commentId?: string;
}

interface IssueAttachmentDownloadOptions extends BaseClientOptions {
  out?: string;
}

interface IssueLabelCreateOptions extends BaseClientOptions {
  companyId?: string;
  name: string;
  color: string;
}

interface IssueRecoveryResolveOptions extends BaseClientOptions {
  actionId?: string;
  outcome: string;
  sourceIssueStatus: string;
  resolutionNote?: string;
}

interface InteractionAcceptOptions extends BaseClientOptions {
  selectedClientKeys?: string;
  selectedOptionIds?: string;
}

interface InteractionReasonOptions extends BaseClientOptions {
  reason?: string;
}

interface InteractionRespondOptions extends BaseClientOptions {
  answersJson: string;
  summaryMarkdown?: string;
}

interface TreeHoldListOptions extends BaseClientOptions {
  status?: string;
  mode?: string;
  includeMembers?: boolean;
}

export function registerIssueCommands(program: Command): void {
  const issue = program.command("issue").description("Issue operations");

  addCommonClientOptions(
    issue
      .command("list")
      .description("List issues for a company")
      .option("-C, --company-id <id>", "Company ID")
      .option("--status <csv>", "Comma-separated statuses")
      .option("--assignee-agent-id <id>", "Filter by assignee agent ID")
      .option("--project-id <id>", "Filter by project ID")
      .option("--match <text>", "Local text match on identifier/title/description")
      .action(async (opts: IssueBaseOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const params = new URLSearchParams();
          if (opts.status) params.set("status", opts.status);
          if (opts.assigneeAgentId) params.set("assigneeAgentId", opts.assigneeAgentId);
          if (opts.projectId) params.set("projectId", opts.projectId);

          const query = params.toString();
          const path = `${apiPath`/api/companies/${ctx.companyId}/issues`}${query ? `?${query}` : ""}`;
          const rows = (await ctx.api.get<Issue[]>(path)) ?? [];

          const filtered = filterIssueRows(rows, opts.match);
          if (ctx.json) {
            printOutput(filtered, { json: true });
            return;
          }

          if (filtered.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const item of filtered) {
            console.log(
              formatInlineRecord({
                identifier: item.identifier,
                id: item.id,
                status: item.status,
                priority: item.priority,
                assigneeAgentId: item.assigneeAgentId,
                title: item.title,
                projectId: item.projectId,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    issue
      .command("get")
      .description("Get an issue by UUID or identifier (e.g. PC-12)")
      .argument("<idOrIdentifier>", "Issue ID or identifier")
      .action(async (idOrIdentifier: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Issue>(apiPath`/api/issues/${idOrIdentifier}`);
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("delete")
      .description("Delete an issue")
      .argument("<issueId>", "Issue ID")
      .option("--yes", "Confirm deletion")
      .action(async (issueId: string, opts: IssueDeleteOptions) => {
        try {
          if (!opts.yes) throw new Error("Refusing to delete without --yes");
          const ctx = resolveCommandContext(opts);
          const deleted = await ctx.api.delete<Issue>(apiPath`/api/issues/${issueId}`);
          printOutput(deleted, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("heartbeat-context")
      .description("Get heartbeat context for an issue")
      .argument("<issueId>", "Issue ID")
      .action(async (issueId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const context = await ctx.api.get(apiPath`/api/issues/${issueId}/heartbeat-context`);
          printOutput(context, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("create")
      .description("Create an issue")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--title <title>", "Issue title")
      .option("--description <text>", "Issue description")
      .option("--status <status>", "Issue status")
      .option("--priority <priority>", "Issue priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .action(async (opts: IssueCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const payload = createIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
          });

          const created = await ctx.api.post<Issue>(apiPath`/api/companies/${ctx.companyId}/issues`, payload);
          printOutput(created, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    issue
      .command("update")
      .description("Update an issue")
      .argument("<issueId>", "Issue ID")
      .option("--title <title>", "Issue title")
      .option("--description <text>", "Issue description")
      .option("--status <status>", "Issue status")
      .option("--priority <priority>", "Issue priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .option("--comment <text>", "Optional comment to add with update")
      .option("--hidden-at <iso8601|null>", "Set hiddenAt timestamp or literal 'null'")
      .action(async (issueId: string, opts: IssueUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
            comment: opts.comment,
            hiddenAt: parseHiddenAt(opts.hiddenAt),
          });

          const updated = await ctx.api.patch<Issue & { comment?: IssueComment | null }>(apiPath`/api/issues/${issueId}`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("comment")
      .description("Add comment to issue")
      .argument("<issueId>", "Issue ID")
      .requiredOption("--body <text>", "Comment body")
      .option("--reopen", "Reopen if issue is done/cancelled")
      .option("--resume", "Request explicit follow-up and wake the assignee when resumable")
      .action(async (issueId: string, opts: IssueCommentOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = addIssueCommentSchema.parse({
            body: opts.body,
            reopen: opts.reopen,
            resume: opts.resume,
          });
          const comment = await ctx.api.post<IssueComment>(apiPath`/api/issues/${issueId}/comments`, payload);
          printOutput(comment, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("checkout")
      .description("Checkout issue for an agent")
      .argument("<issueId>", "Issue ID")
      .requiredOption("--agent-id <id>", "Agent ID")
      .option(
        "--expected-statuses <csv>",
        "Expected current statuses",
        "todo,backlog,blocked",
      )
      .action(async (issueId: string, opts: IssueCheckoutOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = checkoutIssueSchema.parse({
            agentId: opts.agentId,
            expectedStatuses: parseCsv(opts.expectedStatuses),
          });
          const updated = await ctx.api.post<Issue>(apiPath`/api/issues/${issueId}/checkout`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("release")
      .description("Release issue back to todo and clear assignee")
      .argument("<issueId>", "Issue ID")
      .action(async (issueId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const updated = await ctx.api.post<Issue>(apiPath`/api/issues/${issueId}/release`, {});
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function addIssuePostDeleteMarkerCommand(
  issue: Command,
  name: string,
  description: string,
  method: "post" | "delete",
  pathSuffix: string,
): void {
  addCommonClientOptions(
    issue
      .command(name)
      .description(description)
      .argument("<issueId>", "Issue ID")
      .action(async (issueId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const result = method === "post"
            ? await ctx.api.post(`${apiPath`/api/issues/${issueId}`}${pathSuffix}`, {})
            : await ctx.api.delete(`${apiPath`/api/issues/${issueId}`}${pathSuffix}`);
          printOutput(result, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }
  return parsed;
}

function parseHiddenAt(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim().toLowerCase() === "null") return null;
  return value;
}

function filterIssueRows(rows: Issue[], match: string | undefined): Issue[] {
  if (!match?.trim()) return rows;
  const needle = match.trim().toLowerCase();
  return rows.filter((row) => {
    const text = [row.identifier, row.title, row.description]
      .filter((part): part is string => Boolean(part))
      .join("\n")
      .toLowerCase();
    return text.includes(needle);
  });
}

function buildApiUrl(apiBase: string, path: string): string {
  const url = new URL(apiBase);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  return url.toString();
}

async function uploadAttachment(
  apiBase: string,
  apiKey: string | undefined,
  input: { companyId: string; issueId: string; filePath: string; commentId?: string; runId?: string },
): Promise<unknown> {
  const bytes = await readFile(input.filePath);
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: inferContentTypeFromPath(input.filePath) }), input.filePath.split(/[\\/]/).pop() ?? "attachment");
  if (input.commentId) form.set("issueCommentId", input.commentId);
  // This multipart upload uses a hand-rolled fetch rather than PaperclipApiClient,
  // so it must forward the agent run-id header itself — otherwise an
  // agent-authenticated upload is rejected with "401 Agent run id required"
  // (the client injects x-paperclip-run-id automatically for JSON requests).
  const headers: Record<string, string> = {};
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  if (input.runId) headers["x-paperclip-run-id"] = input.runId;
  const response = await fetch(buildApiUrl(apiBase, apiPath`/api/companies/${input.companyId}/issues/${input.issueId}/attachments`), {
    method: "POST",
    headers,
    body: form,
  });
  return parseFetchResponse(response);
}

async function downloadAttachment(
  apiBase: string,
  apiKey: string | undefined,
  attachmentId: string,
): Promise<Buffer> {
  const response = await fetch(buildApiUrl(apiBase, apiPath`/api/attachments/${attachmentId}/content`), {
    headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
  });
  if (!response.ok) {
    await parseFetchResponse(response);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function parseFetchResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  const parsed = text.trim() ? safeJson(text) : null;
  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed !== null && "error" in parsed && typeof parsed.error === "string"
        ? parsed.error
        : `Request failed with status ${response.status}`;
    throw new Error(`API error ${response.status}: ${message}`);
  }
  return parsed;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
