import type { Db } from "@paperclipai/db";
import { issueThreadInteractions, issues } from "@paperclipai/db";
import { and, eq } from "drizzle-orm";
import { issueService } from "./issues.js";
import { isDeepStrictEqual } from "node:util";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import {
  agents,
  documents,
  heartbeatRuns,
  issueComments,
  issueDocuments,
  issueThreadInteractions,
  issues,
} from "@paperclipai/db";
import type {
  AcceptIssueThreadInteraction,
  AskUserQuestionsAnswer,
  AskUserQuestionsInteraction,
  CancelIssueThreadInteraction,
  CreateIssueThreadInteraction,
  IssueThreadInteraction,
  RequestCheckboxConfirmationInteraction,
  RequestConfirmationInteraction,
  RequestConfirmationTarget,
  RequestItemVerdictsInteraction,
  RequestItemVerdictsResult,
  RequestItemVerdictsResultItem,
  RejectIssueThreadInteraction,
  RespondIssueThreadInteraction,
  SuggestTasksInteraction,
  SuggestTasksResultCreatedTask,
  SubmitIssueThreadInteractionVerdicts,
} from "@paperclipai/shared";
  acceptIssueThreadInteractionSchema,
  askUserQuestionsPayloadSchema,
  askUserQuestionsResultSchema,
  cancelIssueThreadInteractionSchema,
  createIssueThreadInteractionSchema,
  rejectIssueThreadInteractionSchema,
  requestCheckboxConfirmationPayloadSchema,
  requestCheckboxConfirmationResultSchema,
  requestConfirmationPayloadSchema,
  requestConfirmationResultSchema,
  requestItemVerdictsPayloadSchema,
  requestItemVerdictsResultSchema,
  suggestTasksPayloadSchema,
  suggestTasksResultSchema,
  submitIssueThreadInteractionVerdictsSchema,
import { conflict, notFound, unprocessable } from "../errors.js";
import { issueService, runWorkspaceIsFinalized } from "./issues.js";

type ThreadActor = { agentId?: string | null; userId?: string | null };
type ThreadInteraction = {
  id: string;
  companyId: string;
  issueId: string;
  kind: string;
  status: string;
  continuationPolicy: string;
  idempotencyKey: string | null;
  sourceCommentId: string | null;
  sourceRunId: string | null;
  title: string | null;
  summary: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  resolvedByAgentId: string | null;
  resolvedByUserId: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type IssueRef = { id: string; companyId: string };

export interface IssueThreadInteractionService {
  recordInteraction(): Promise<void>;
  getInteractions(): Promise<unknown[]>;
  listForIssue(_issue: IssueRef): Promise<ThreadInteraction[]>;
  create(
    _issue: IssueRef,
    _params: {
      kind: string;
      idempotencyKey?: string | null;
      sourceRunId?: string | null;
      title?: string | null;
      summary?: string | null;
      continuationPolicy?: string | null;
      payload: Record<string, unknown>;
    },
    _actor: ThreadActor
  ): Promise<ThreadInteraction>;
  acceptInteraction(
    _issue: IssueRef,
    _interactionId: string,
    _params: { selectedClientKeys?: string[] },
    _actor: ThreadActor
  ): Promise<{ interaction: ThreadInteraction; createdIssues: Array<{ id: string; assigneeAgentId?: string | null }> }>;
  rejectInteraction(
    _issue: IssueRef,
    _interactionId: string,
    _params: { reason?: string | null },
    _actor: ThreadActor
  ): Promise<ThreadInteraction>;
  answerQuestions(
    _issue: IssueRef,
    _interactionId: string,
    _answers: {
      answers: Array<{ questionId: string; optionIds: string[] }>;
      summaryMarkdown?: string | null;
    },
    _actor: ThreadActor
  ): Promise<ThreadInteraction>;
  cancelQuestions(
    _issue: IssueRef,
    _interactionId: string,
    _params: { reason?: string | null; summaryMarkdown?: string | null },
    _actor: ThreadActor
  ): Promise<ThreadInteraction>;
const REQUEST_CONFIRMATION_INTERACTION_KINDS = [
  "request_confirmation",
  "request_checkbox_confirmation",
] as const;
type RequestConfirmationLikeKind = (typeof REQUEST_CONFIRMATION_INTERACTION_KINDS)[number];
type RequestConfirmationLikeInteraction =
  | RequestConfirmationInteraction
  | RequestCheckboxConfirmationInteraction;
const TARGET_BOUND_INTERACTION_KINDS = [
  ...REQUEST_CONFIRMATION_INTERACTION_KINDS,
  "request_item_verdicts",
] as const;
type TargetBoundInteractionKind = (typeof TARGET_BOUND_INTERACTION_KINDS)[number];
type TargetBoundInteraction =
  | RequestConfirmationLikeInteraction
  | RequestItemVerdictsInteraction;
const USER_COMMENT_SUPERSEDABLE_INTERACTION_KINDS = [
  ...TARGET_BOUND_INTERACTION_KINDS,
  "ask_user_questions",
] as const;
type UserCommentSupersedableKind = (typeof USER_COMMENT_SUPERSEDABLE_INTERACTION_KINDS)[number];
type UserCommentSupersedableInteraction =
  | TargetBoundInteraction
  | AskUserQuestionsInteraction;
function isRequestConfirmationLikeKind(kind: string): kind is RequestConfirmationLikeKind {
  return (REQUEST_CONFIRMATION_INTERACTION_KINDS as readonly string[]).includes(kind);
}
function isTargetBoundInteractionKind(kind: string): kind is TargetBoundInteractionKind {
  return (TARGET_BOUND_INTERACTION_KINDS as readonly string[]).includes(kind);
}
function isUserCommentSupersedableKind(kind: string): kind is UserCommentSupersedableKind {
  return (USER_COMMENT_SUPERSEDABLE_INTERACTION_KINDS as readonly string[]).includes(kind);
}
function isIssueThreadInteractionIdempotencyConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const err = error as { code?: string; constraint?: string; constraint_name?: string };
  const constraint = err.constraint ?? err.constraint_name;
  return err.code === "23505" && constraint === ISSUE_THREAD_INTERACTION_IDEMPOTENCY_CONSTRAINT;
}

export function issueThreadInteractionService(_db: Db): IssueThreadInteractionService {
  const db = _db as Db & {
    transaction?: <T>(callback: (tx: Db) => Promise<T>) => Promise<T>;
  };

  function nullableString(value: unknown) {
    return typeof value === "string" ? value : null;
  switch (row.kind) {
    case "suggest_tasks":
      return {
        ...base,
        kind: "suggest_tasks",
        payload: suggestTasksPayloadSchema.parse(row.payload),
        result: row.result ? suggestTasksResultSchema.parse(row.result) : null,
      } satisfies SuggestTasksInteraction;
    case "ask_user_questions":
      return {
        ...base,
        kind: "ask_user_questions",
        payload: askUserQuestionsPayloadSchema.parse(row.payload),
        result: row.result ? askUserQuestionsResultSchema.parse(row.result) : null,
      } satisfies AskUserQuestionsInteraction;
    case "request_confirmation":
      return {
        ...base,
        kind: "request_confirmation",
        payload: requestConfirmationPayloadSchema.parse(row.payload),
        result: row.result ? requestConfirmationResultSchema.parse(row.result) : null,
      } satisfies RequestConfirmationInteraction;
    case "request_checkbox_confirmation":
      return {
        ...base,
        kind: "request_checkbox_confirmation",
        payload: requestCheckboxConfirmationPayloadSchema.parse(row.payload),
        result: row.result ? requestCheckboxConfirmationResultSchema.parse(row.result) : null,
      } satisfies RequestCheckboxConfirmationInteraction;
    case "request_item_verdicts":
      return {
        ...base,
        kind: "request_item_verdicts",
        payload: requestItemVerdictsPayloadSchema.parse(row.payload),
        result: row.result ? requestItemVerdictsResultSchema.parse(row.result) : null,
      } satisfies RequestItemVerdictsInteraction;
    default:
      throw unprocessable(`Unknown interaction kind: ${row.kind}`);
  }
}

async function touchIssue(db: IssueTouchDb, issueId: string) {
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId));
}

function isTerminalIssueStatus(status: string) {
  return status === "done" || status === "cancelled";
}

function shouldReturnAcceptedConfirmationToCreatorAgent(args: {
  issue: IssueResolutionContext;
  current: IssueThreadInteractionRow;
  actor: InteractionActor;
}) {
  if (!isRequestConfirmationLikeKind(args.current.kind)) return false;
  if (!args.current.createdByAgentId) return false;
  if (!args.actor.userId) return false;
  if (!args.issue.assigneeUserId) return false;
  if (args.issue.assigneeAgentId) return false;
  if (isTerminalIssueStatus(args.issue.status)) return false;
  return true;
}

function shouldSupersedeInteractionOnUserComment(interaction: UserCommentSupersedableInteraction) {
  return interaction.payload.supersedeOnUserComment === true;
}

function normalizeCreateInteractionInput(input: CreateIssueThreadInteraction): CreateIssueThreadInteraction {
  switch (input.kind) {
    case "ask_user_questions":
      return {
        ...input,
        payload: {
          ...input.payload,
          supersedeOnUserComment: input.payload.supersedeOnUserComment ?? true,
        },
      };
    case "request_confirmation":
      return {
        ...input,
        payload: {
          ...input.payload,
          supersedeOnUserComment: input.payload.supersedeOnUserComment ?? true,
        },
      };
    case "request_checkbox_confirmation":
      return {
        ...input,
        payload: {
          ...input.payload,
          supersedeOnUserComment: input.payload.supersedeOnUserComment ?? true,
        },
      };
    case "request_item_verdicts":
      return {
        ...input,
        payload: {
          ...input.payload,
          supersedeOnUserComment: input.payload.supersedeOnUserComment ?? true,
        },
      };
    default:
      return input;
  }
}

function buildSupersededByCommentResult(row: IssueThreadInteractionRow, commentId: string) {
  if (row.kind === "ask_user_questions") {
    return {
      version: 1,
      answers: [],
      expirationReason: "superseded_by_comment",
      commentId,
      summaryMarkdown: null,
    } as const;
  }

  if (row.kind === "request_item_verdicts") {
    const interaction = hydrateInteraction(row) as RequestItemVerdictsInteraction;
    return {
      version: 1,
      outcome: "superseded_by_comment",
      complete: false,
      items: interaction.result?.items ?? [],
      commentId,
    } satisfies RequestItemVerdictsResult;
  }

  return {
    version: 1,
    outcome: "superseded_by_comment",
    commentId,
  } as const;
}

function buildStaleTargetResult(
  row: IssueThreadInteractionRow,
  staleTarget: RequestConfirmationTarget | null,
) {
  if (row.kind === "request_item_verdicts") {
    const interaction = hydrateInteraction(row) as RequestItemVerdictsInteraction;
    return {
      version: 1,
      outcome: "stale_target",
      complete: false,
      items: interaction.result?.items ?? [],
      staleTarget,
    } satisfies RequestItemVerdictsResult;
  }

  return {
    version: 1,
    outcome: "stale_target",
    staleTarget,
  } as const;
}

function resolveActorKind(interaction: Pick<IssueThreadInteraction, "resolvedByAgentId" | "resolvedByUserId">) {
  if (interaction.resolvedByAgentId) return "agent";
  if (interaction.resolvedByUserId) return "user";
  return "system";
}

function resolveCreatorKind(interaction: Pick<IssueThreadInteraction, "createdByAgentId" | "createdByUserId">) {
  if (interaction.createdByAgentId) return "agent";
  if (interaction.createdByUserId) return "user";
  return undefined;
}

function deriveTargetType(interaction: IssueThreadInteraction) {
  switch (interaction.kind) {
    case "request_confirmation":
    case "request_checkbox_confirmation":
    case "request_item_verdicts":
      return interaction.payload.target?.type ?? "none";
    default:
      return "none";
  }
}

function deriveResolutionReason(interaction: IssueThreadInteraction) {
  switch (interaction.status) {
    case "accepted":
      return "accepted";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "expired": {
      if (interaction.kind === "ask_user_questions") {
        return interaction.result?.expirationReason ?? "expired";
      }
      if (interaction.kind === "request_confirmation" || interaction.kind === "request_checkbox_confirmation") {
        return interaction.result?.outcome ?? "expired";
      }
      if (interaction.kind === "request_item_verdicts") {
        return interaction.result?.outcome ?? "expired";
      }
      return "expired";
    }
    case "answered": {
      if (interaction.kind === "request_item_verdicts") {
        return interaction.result?.outcome ?? "answered";
      }
      return "answered";
    }
    default:
      return undefined;
  }
}

function nonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function buildInteractionResolvedCounts(interaction: IssueThreadInteraction, args?: {
  createdTaskCount?: number;
}) {
  switch (interaction.kind) {
    case "suggest_tasks":
      return {
        createdTaskCount: nonNegativeInteger(args?.createdTaskCount ?? 0),
        skippedTaskCount: nonNegativeInteger(interaction.result?.skippedClientKeys?.length ?? 0),
      };
    case "request_checkbox_confirmation":
      return {
        optionCount: nonNegativeInteger(interaction.payload.options.length),
        selectedOptionCount: nonNegativeInteger(interaction.result?.selectedOptionIds?.length ?? 0),
      };
    case "ask_user_questions":
      return {
        questionCount: nonNegativeInteger(interaction.payload.questions.length),
        answeredQuestionCount: nonNegativeInteger(interaction.result?.answers?.length ?? 0),
      };
    case "request_item_verdicts":
      return {
        itemCount: nonNegativeInteger(interaction.payload.items.length),
        resolvedItemCount: nonNegativeInteger(interaction.result?.items?.length ?? 0),
      };
    default:
      return {};
  }
}

async function fetchCreatorAgentRoleById(
  db: Pick<Db, "select">,
  interactions: readonly IssueThreadInteraction[],
) {
  const creatorAgentIds = [...new Set(interactions
    .map((interaction) => interaction.createdByAgentId)
    .filter((value): value is string => Boolean(value)))];
  if (creatorAgentIds.length === 0) return new Map<string, string | null>();

  const rows = await db
    .select({
      id: agents.id,
      role: agents.role,
    })
    .from(agents)
    .where(inArray(agents.id, creatorAgentIds));

  return new Map(rows.map((row) => [row.id, row.role] as const));
}

  db: Pick<Db, "select">,
  interaction: IssueThreadInteraction,
  args?: { createdTaskCount?: number; creatorRoleByAgentId?: ReadonlyMap<string, string | null> },
) {

  try {
    let roleByAgentId = args?.creatorRoleByAgentId ?? new Map<string, string | null>();
    if (!args?.creatorRoleByAgentId) {
      try {
        roleByAgentId = await fetchCreatorAgentRoleById(db, [interaction]);
      } catch (error) {
        console.error("[paperclip] Failed to load interaction.resolved creator role", error);
      }
    }
    const creatorAgentRole = interaction.createdByAgentId
      ? roleByAgentId.get(interaction.createdByAgentId) ?? undefined
      : undefined;

      interactionKind: interaction.kind,
      status: interaction.status,
      resolvedByKind: resolveActorKind(interaction),
      resolutionReason: deriveResolutionReason(interaction),
      createdByKind: resolveCreatorKind(interaction),
      creatorAgentRole,
      continuationPolicy: interaction.continuationPolicy,
      targetType: deriveTargetType(interaction),
      ...buildInteractionResolvedCounts(interaction, {
        createdTaskCount: args?.createdTaskCount,
      }),
    });
  } catch (error) {
  }
}

  db: Pick<Db, "select">,
  interactions: readonly IssueThreadInteraction[],
) {
  let roleByAgentId = new Map<string, string | null>();
  try {
    roleByAgentId = await fetchCreatorAgentRoleById(db, interactions);
  } catch (error) {
    console.error("[paperclip] Failed to load interaction.resolved creator roles", error);
  }
  await Promise.all(interactions.map((interaction) =>
  ));
}

function isCommentAtOrAfterInteraction(args: {
  commentCreatedAt: Date | string;
  interactionCreatedAt: Date | string;
}) {
  const commentCreatedAtMs = new Date(args.commentCreatedAt).getTime();
  const interactionCreatedAtMs = new Date(args.interactionCreatedAt).getTime();
  if (!Number.isFinite(commentCreatedAtMs) || !Number.isFinite(interactionCreatedAtMs)) return false;
  return commentCreatedAtMs >= interactionCreatedAtMs;
}

function buildTaskCreationOrder(tasks: ReadonlyArray<SuggestTasksInteraction["payload"]["tasks"][number]>) {
  const taskByClientKey = new Map(tasks.map((task) => [task.clientKey, task] as const));
  const ordered: Array<SuggestTasksInteraction["payload"]["tasks"][number]> = [];
  const state = new Map<string, "visiting" | "done">();

  const visit = (clientKey: string) => {
    const currentState = state.get(clientKey);
    if (currentState === "done") return;
    if (currentState === "visiting") {
      throw unprocessable("Suggested tasks contain a parentClientKey cycle");
    }

    const task = taskByClientKey.get(clientKey);
    if (!task) {
      throw unprocessable(`Unknown parentClientKey: ${clientKey}`);
    }

    state.set(clientKey, "visiting");
    if (task.parentClientKey) {
      visit(task.parentClientKey);
    }
    state.set(clientKey, "done");
    ordered.push(task);
  };

  for (const task of tasks) {
    visit(task.clientKey);
  }

  function normalizeDate(value: unknown) {
    return value instanceof Date ? value : new Date();
  }

  function normalizeRow(row: Record<string, unknown>): ThreadInteraction {
    return {
      id: String(row.id),
      companyId: String(row.companyId),
      issueId: String(row.issueId),
      kind: String(row.kind ?? "unknown"),
      status: String(row.status ?? "pending"),
      continuationPolicy: String(row.continuationPolicy ?? "wake_assignee"),
      idempotencyKey: nullableString(row.idempotencyKey),
      sourceCommentId: nullableString(row.sourceCommentId),
      sourceRunId: nullableString(row.sourceRunId),
      title: nullableString(row.title),
      summary: nullableString(row.summary),
      createdByAgentId: nullableString(row.createdByAgentId),
      createdByUserId: nullableString(row.createdByUserId),
      resolvedByAgentId: nullableString(row.resolvedByAgentId),
      resolvedByUserId: nullableString(row.resolvedByUserId),
      payload: (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>,
      result: (row.result && typeof row.result === "object" ? row.result : null) as Record<string, unknown> | null,
      resolvedAt: row.resolvedAt instanceof Date ? row.resolvedAt : null,
      createdAt: normalizeDate(row.createdAt),
      updatedAt: normalizeDate(row.updatedAt),
    };
  }

  async function updateResolved(
    issue: IssueRef,
    interactionId: string,
    values: Record<string, unknown>,
    actor: ThreadActor,
  ) {
    const now = new Date();
    const run = async (tx: Db) => {
      const updated = await tx
        .update(issueThreadInteractions)
        .set({
          ...values,
  for (const clientKey of selectedClientKeySet) {
    let parentClientKey = taskByClientKey.get(clientKey)?.parentClientKey ?? null;
    while (parentClientKey) {
      if (!selectedClientKeySet.has(parentClientKey)) {
        throw unprocessable(`Suggested task ${clientKey} requires its parent ${parentClientKey} to also be selected`);
      }
      parentClientKey = taskByClientKey.get(parentClientKey)?.parentClientKey ?? null;
    }
  }

  return {
    selectedTasks: args.interaction.payload.tasks.filter((task) => selectedClientKeySet.has(task.clientKey)),
    skippedClientKeys: args.interaction.payload.tasks
      .filter((task) => !selectedClientKeySet.has(task.clientKey))
      .map((task) => task.clientKey),
  };
}

function resolveSelectedCheckboxConfirmationOptions(args: {
  interaction: RequestCheckboxConfirmationInteraction;
  selectedOptionIds?: AcceptIssueThreadInteraction["selectedOptionIds"];
}) {
  const optionIds = new Set(args.interaction.payload.options.map((option) => option.id));
  const selectedOptionIds = args.selectedOptionIds ?? args.interaction.payload.defaultSelectedOptionIds ?? [];
  const selectedOptionIdSet = new Set<string>();

  for (const optionId of selectedOptionIds) {
    if (!optionIds.has(optionId)) {
      throw unprocessable(`Unknown checkbox confirmation optionId: ${optionId}`);
    }
    selectedOptionIdSet.add(optionId);
  }

  const selectedCount = selectedOptionIdSet.size;
  const minSelected = args.interaction.payload.minSelected ?? 0;
  const maxSelected = args.interaction.payload.maxSelected ?? null;
  if (selectedCount < minSelected) {
    throw unprocessable(`Select at least ${minSelected} checkbox confirmation option(s)`);
  }
  if (maxSelected != null && selectedCount > maxSelected) {
    throw unprocessable(`Select no more than ${maxSelected} checkbox confirmation option(s)`);
  }

  return args.interaction.payload.options
    .filter((option) => selectedOptionIdSet.has(option.id))
    .map((option) => option.id);
}

function resolveRequestItemVerdictSubmissions(args: {
  interaction: RequestItemVerdictsInteraction;
  input: SubmitIssueThreadInteractionVerdicts;
  actor: InteractionActor;
  now: Date;
}) {
  if (!args.actor.userId) {
    throw unprocessable("request_item_verdicts submissions require a user actor");
  }

  const existingItems = args.interaction.result?.items ?? [];
  const existingById = new Map(existingItems.map((item) => [item.id, item] as const));
  const payloadItemIds = new Set(args.interaction.payload.items.map((item) => item.id));
  const enabledVerdicts = new Set(args.interaction.payload.verdicts ?? ["approve", "reject"]);
  const requireReasonOn = new Set(args.interaction.payload.requireReasonOn ?? ["reject"]);
  const newlyResolvedById = new Map<string, RequestItemVerdictsResultItem>();
  const newlyResolvedItemIds: string[] = [];

  for (const submitted of args.input.verdicts) {
    if (!payloadItemIds.has(submitted.id)) {
      throw unprocessable(`Unknown item verdict id: ${submitted.id}`);
    }
    if (existingById.has(submitted.id)) {
      continue;
    }
    if (!enabledVerdicts.has(submitted.verdict)) {
      throw unprocessable(`Verdict ${submitted.verdict} is not enabled for this item verdict request`);
    }

    const reason = submitted.reason?.trim() ?? "";
    if (requireReasonOn.has(submitted.verdict) && reason.length === 0) {
      throw unprocessable(`A reason is required when verdict is ${submitted.verdict}`);
    }

    if (newlyResolvedById.has(submitted.id)) {
      continue;
    }
    newlyResolvedById.set(submitted.id, {
      id: submitted.id,
      verdict: submitted.verdict,
      ...(reason ? { reason } : {}),
      resolvedByUserId: args.actor.userId,
      resolvedAt: args.now,
    });
    newlyResolvedItemIds.push(submitted.id);
  }

  const nextById = new Map<string, RequestItemVerdictsResultItem>(existingItems.map((item) => [item.id, item]));
  for (const [id, item] of newlyResolvedById) {
    nextById.set(id, item);
  }
  const items = args.interaction.payload.items
    .map((item) => nextById.get(item.id))
    .filter((item): item is RequestItemVerdictsResultItem => Boolean(item));

  return {
    items,
    complete: items.length === args.interaction.payload.items.length,
    newlyResolvedItemIds,
  };
}

function normalizeQuestionAnswers(args: {
  questions: AskUserQuestionsInteraction["payload"]["questions"];
  answers: RespondIssueThreadInteraction["answers"];
}) {
  const questionById = new Map(args.questions.map((question) => [question.id, question] as const));
  const answerByQuestionId = new Map<string, AskUserQuestionsAnswer>();

  for (const answer of args.answers) {
    const question = questionById.get(answer.questionId);
    if (!question) {
      throw unprocessable(`Unknown questionId: ${answer.questionId}`);
    }
    if (answerByQuestionId.has(answer.questionId)) {
      throw unprocessable(`Duplicate answer for questionId: ${answer.questionId}`);
    }

    const uniqueOptionIds = [...new Set(answer.optionIds)];
    const validOptionIds = new Set(question.options.map((option) => option.id));
    for (const optionId of uniqueOptionIds) {
      if (!validOptionIds.has(optionId)) {
        throw unprocessable(`Unknown optionId for question ${answer.questionId}: ${optionId}`);
      }
    }

    if (question.selectionMode === "single" && uniqueOptionIds.length > 1) {
      throw unprocessable(`Question ${answer.questionId} only allows one answer`);
    }

    const otherText = answer.otherText?.trim() ?? "";
    answerByQuestionId.set(answer.questionId, {
      questionId: answer.questionId,
      optionIds: uniqueOptionIds,
      ...(otherText ? { otherText } : {}),
    });
  }

  for (const question of args.questions) {
    const answer = answerByQuestionId.get(question.id);
    if (
      question.required
      && (!answer || (answer.optionIds.length === 0 && !answer.otherText))
    ) {
      throw unprocessable(`Question ${question.id} requires an answer`);
    }
  }

  return args.questions
    .map((question) => answerByQuestionId.get(question.id))
    .filter((answer): answer is AskUserQuestionsAnswer => Boolean(answer));
}

async function getIssueDocumentTargetSnapshot(db: Db | any, args: {
  companyId: string;
  issueId: string;
  target: RequestConfirmationTarget;
}) {
  if (args.target.type !== "issue_document") return null;
  const targetIssueId = args.target.issueId ?? args.issueId;
  const row = await db
    .select({
      issueId: issueDocuments.issueId,
      documentId: issueDocuments.documentId,
      key: issueDocuments.key,
      latestRevisionId: documents.latestRevisionId,
      latestRevisionNumber: documents.latestRevisionNumber,
    })
    .from(issueDocuments)
    .innerJoin(documents, eq(issueDocuments.documentId, documents.id))
    .where(and(
      eq(issueDocuments.companyId, args.companyId),
      eq(issueDocuments.issueId, targetIssueId),
      eq(issueDocuments.key, args.target.key),
    ))
    .then((rows: Array<{
      issueId: string;
      documentId: string;
      key: string;
      latestRevisionId: string | null;
      latestRevisionNumber: number;
    }>) => rows[0] ?? null);

  if (!row) return null;
  if (args.target.documentId && args.target.documentId !== row.documentId) return null;
  return row;
}

function buildIssueDocumentTargetFromSnapshot(args: {
  issueId: string;
  snapshot: {
    issueId: string;
    documentId: string;
    key: string;
    latestRevisionId: string | null;
    latestRevisionNumber: number;
  } | null;
}): RequestConfirmationTarget | null {
  if (!args.snapshot?.latestRevisionId) return null;
  return {
    type: "issue_document",
    issueId: args.snapshot.issueId ?? args.issueId,
    documentId: args.snapshot.documentId,
    key: args.snapshot.key,
    revisionId: args.snapshot.latestRevisionId,
    revisionNumber: args.snapshot.latestRevisionNumber,
  };
}

function buildIssueDocumentTargetFromDocument(args: {
  issueId: string;
  document: { id: string; key: string; latestRevisionId?: string | null; latestRevisionNumber?: number | null } | null;
}): RequestConfirmationTarget | null {
  if (!args.document?.latestRevisionId) return null;
  return {
    type: "issue_document",
    issueId: args.issueId,
    documentId: args.document.id,
    key: args.document.key,
    revisionId: args.document.latestRevisionId,
    revisionNumber: args.document.latestRevisionNumber ?? null,
  };
}

async function assertRequestConfirmationTargetIsCurrent(db: Db | any, args: {
  companyId: string;
  issueId: string;
  target?: RequestConfirmationTarget | null;
}) {
  if (!args.target) return;
  if (args.target.type !== "issue_document") return;
  const snapshot = await getIssueDocumentTargetSnapshot(db, {
    companyId: args.companyId,
    issueId: args.issueId,
    target: args.target,
  });
  if (!snapshot || snapshot.latestRevisionId !== args.target.revisionId) {
    throw unprocessable("request_confirmation target must reference the current issue document revision");
  }
  if (args.target.revisionNumber && snapshot.latestRevisionNumber !== args.target.revisionNumber) {
    throw unprocessable("request_confirmation target revisionNumber must match the current issue document revision");
  }
}

async function expireStaleRequestConfirmationTarget(db: Db | any, args: {
  row: IssueThreadInteractionRow;
  actor: InteractionActor;
}): Promise<IssueThreadInteraction | null> {
  if (!isTargetBoundInteractionKind(args.row.kind) || args.row.status !== "pending") return null;
  const interaction = hydrateInteraction(args.row) as TargetBoundInteraction;
  const target = interaction.payload.target ?? null;
  if (!target) return null;
  if (target.type !== "issue_document") return null;

  const snapshot = await getIssueDocumentTargetSnapshot(db, {
    companyId: args.row.companyId,
    issueId: args.row.issueId,
    target,
  });
  const isCurrent =
    snapshot
    && snapshot.latestRevisionId === target.revisionId
    && (!target.revisionNumber || snapshot.latestRevisionNumber === target.revisionNumber);
  if (isCurrent) return null;

  const now = new Date();
  const currentTarget = buildIssueDocumentTargetFromSnapshot({
    issueId: args.row.issueId,
    snapshot,
  });
  const [updated] = await db
    .update(issueThreadInteractions)
    .set({
      status: "expired",
      payload: currentTarget
        ? {
            ...interaction.payload,
            target: currentTarget,
          }
        : interaction.payload,
      result: {
        ...buildStaleTargetResult(args.row, target),
      },
      resolvedByAgentId: args.actor.agentId ?? null,
      resolvedByUserId: args.actor.userId ?? null,
      resolvedAt: now,
      updatedAt: now,
    })
    .where(and(
      eq(issueThreadInteractions.id, args.row.id),
      eq(issueThreadInteractions.status, "pending"),
    ))
    .returning();

  if (!updated) {
    throw conflict("Interaction has already been resolved");
  }
  await touchIssue(db, args.row.issueId);
  const expired = hydrateInteraction(updated);
  return expired;
}

export function issueThreadInteractionService(db: Db) {
  async function getIdempotentInteraction(args: {
    issueId: string;
    companyId: string;
    idempotencyKey: string;
  }) {
    return db
      .select()
      .from(issueThreadInteractions)
      .where(and(
        eq(issueThreadInteractions.companyId, args.companyId),
        eq(issueThreadInteractions.issueId, args.issueId),
        eq(issueThreadInteractions.idempotencyKey, args.idempotencyKey),
      ))
      .then((rows) => rows[0] ?? null);
  }

  async function assertIssueWorkspaceFinalizedForAccept(args: {
    db: Pick<Db, "select">;
    issue: { id: string; companyId: string };
    sourceRunId: string | null;
  }) {
    if (!args.sourceRunId) return;

    const executionWorkspaceId = await args.db
      .select({ executionWorkspaceId: issues.executionWorkspaceId })
      .from(issues)
      .where(eq(issues.id, args.issue.id))
      .then((rows: Array<{ executionWorkspaceId: string | null }>) => rows[0]?.executionWorkspaceId ?? null);

    if (!executionWorkspaceId) return;

    const isFinalized = await runWorkspaceIsFinalized(
      args.db,
      args.issue.companyId,
      executionWorkspaceId,
      args.sourceRunId,
    );
    if (isFinalized) return;

    throw conflict(
      "Cannot accept interaction: the run that created this interaction has not finished syncing its workspace. "
        + "Retry once the local worktree has finished syncing.",
      { executionWorkspaceId, sourceRunId: args.sourceRunId },
    );
  }

  async function getPendingInteractionForResolution(args: {
    issue: { id: string; companyId: string };
    interactionId: string;
  }) {
    const current = await db
      .select()
      .from(issueThreadInteractions)
      .where(eq(issueThreadInteractions.id, args.interactionId))
      .then((rows) => rows[0] ?? null);

    if (!current) throw notFound("Interaction not found");
    if (current.companyId !== args.issue.companyId || current.issueId !== args.issue.id) {
      throw notFound("Interaction not found");
    }
    if (current.status !== "pending") {
      throw conflict("Interaction has already been resolved");
    }
    return current;
  }

  async function acceptRequestConfirmation(args: {
    issue: { id: string; companyId: string };
    current: IssueThreadInteractionRow;
    input: AcceptIssueThreadInteraction;
    actor: InteractionActor;
  }): Promise<{
    interaction: IssueThreadInteraction;
    continuationIssue: IssueWakeTarget | null;
  }> {
    const expired = await expireStaleRequestConfirmationTarget(db, {
      row: args.current,
      actor: args.actor,
    });
    if (expired) {
      return { interaction: expired, continuationIssue: null };
    }

    const interaction = hydrateInteraction(args.current);
    const selectedOptionIds =
      interaction.kind === "request_checkbox_confirmation"
        ? resolveSelectedCheckboxConfirmationOptions({
            interaction,
            selectedOptionIds: args.input.selectedOptionIds,
          })
        : undefined;

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
          status: "accepted",
          result: {
            version: 1,
            outcome: "accepted",
            ...(selectedOptionIds ? { selectedOptionIds } : {}),
          },
          resolvedByAgentId: args.actor.agentId ?? null,
          resolvedByUserId: args.actor.userId ?? null,
          resolvedAt: now,
          resolvedByAgentId: actor.agentId ?? null,
          resolvedByUserId: actor.userId ?? null,
          updatedAt: now,
        })
        .where(and(
          eq(issueThreadInteractions.companyId, issue.companyId),
          eq(issueThreadInteractions.issueId, issue.id),
          eq(issueThreadInteractions.id, interactionId),
        ))
        .returning();
      await tx
        .update(issues)
        .set({ updatedAt: now })
        .where(eq(issues.id, issue.id));
      return updated[0] as Record<string, unknown> | undefined;
    };
    const row = db.transaction ? await db.transaction(run) : await run(db);
    return row ? normalizeRow(row) : null;

      if (!updated) {
        throw conflict("Interaction has already been resolved");
      }

      const issueContext = await tx
        .select({
          id: issues.id,
          companyId: issues.companyId,
          status: issues.status,
          assigneeAgentId: issues.assigneeAgentId,
          assigneeUserId: issues.assigneeUserId,
        })
        .from(issues)
        .where(eq(issues.id, args.issue.id))
        .then((rows: IssueResolutionContext[]) => rows[0] ?? null);

      if (!issueContext || issueContext.companyId !== args.issue.companyId) {
        throw notFound("Issue not found");
      }

      let continuationIssue: IssueWakeTarget | null = null;
      if (shouldReturnAcceptedConfirmationToCreatorAgent({
        issue: issueContext,
        current: args.current,
        actor: args.actor,
      })) {
        const returnStatus = issueContext.status === "blocked" ? "blocked" : "todo";
        const returnedIssue = await issueService(db).update(args.issue.id, {
          status: returnStatus,
          assigneeAgentId: args.current.createdByAgentId,
          assigneeUserId: null,
          actorAgentId: args.actor.agentId ?? null,
          actorUserId: args.actor.userId ?? null,
        }, tx);

        if (returnedIssue) {
          continuationIssue = {
            id: returnedIssue.id,
            assigneeAgentId: returnedIssue.assigneeAgentId ?? null,
            assigneeUserId: returnedIssue.assigneeUserId ?? null,
            status: returnedIssue.status,
          };
        }
      } else {
        await touchIssue(tx, args.issue.id);
      }

      return {
        interaction: hydrateInteraction(updated),
        continuationIssue,
      };
    });
    return result;
  }

  async function rejectRequestConfirmation(args: {
    issue: { id: string; companyId: string };
    current: IssueThreadInteractionRow;
    input: RejectIssueThreadInteraction;
    actor: InteractionActor;
  }): Promise<IssueThreadInteraction> {
    const expired = await expireStaleRequestConfirmationTarget(db, {
      row: args.current,
      actor: args.actor,
    });
    if (expired) {
      return expired;
    }

    const interaction = hydrateInteraction(args.current) as RequestConfirmationLikeInteraction;
    const reason = args.input.reason?.trim() ?? "";
    if (interaction.payload.rejectRequiresReason === true && reason.length === 0) {
      throw unprocessable("A decline reason is required for this confirmation");
    }

    const now = new Date();
    const [updated] = await db
      .update(issueThreadInteractions)
      .set({
        status: "rejected",
        result: {
          version: 1,
          outcome: "rejected",
          reason: reason || null,
        },
        resolvedByAgentId: args.actor.agentId ?? null,
        resolvedByUserId: args.actor.userId ?? null,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(issueThreadInteractions.id, args.current.id),
        eq(issueThreadInteractions.status, "pending"),
      ))
      .returning();

    if (!updated) {
      throw conflict("Interaction has already been resolved");
    }
    await touchIssue(db, args.issue.id);
    const rejected = hydrateInteraction(updated);
    return rejected;
  }

  return {
    async recordInteraction() {
      // No-op - feature removed
    },
    async getInteractions() {
      return [];
    },
    async listForIssue(issue) {
      const rows = await db
        .select()
        .from(issueThreadInteractions)
        .where(and(
          eq(issueThreadInteractions.companyId, issue.companyId),
          eq(issueThreadInteractions.issueId, issue.id),
        ));
      return rows.map((row) => normalizeRow(row as Record<string, unknown>));
    },
    async create(issue, params, actor) {
      if (params.idempotencyKey) {
        const existing = await db
          .select()
          .from(issueThreadInteractions)

    getById: async (interactionId: string) => {
      const row = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, interactionId))
        .then((rows) => rows[0] ?? null);

      return row ? hydrateInteraction(row) : null;
    },

    create: async (
      issue: { id: string; companyId: string },
      input: CreateIssueThreadInteraction,
      actor: InteractionActor,
    ) => {
      const data = normalizeCreateInteractionInput(createIssueThreadInteractionSchema.parse(input));

      if (data.idempotencyKey) {
        const existing = await getIdempotentInteraction({
          issueId: issue.id,
          companyId: issue.companyId,
          idempotencyKey: data.idempotencyKey,
        });
        if (existing) {
          if (!isEquivalentCreateRequest(existing, data, actor)) {
            throw conflict("Interaction idempotency key already exists for a different request", {
              idempotencyKey: data.idempotencyKey,
            });
          }
          return hydrateInteraction(existing);
        }
      }

      if (data.sourceCommentId) {
        const sourceComment = await db
          .select({
            companyId: issueComments.companyId,
            issueId: issueComments.issueId,
          })
          .from(issueComments)
          .where(eq(issueComments.id, data.sourceCommentId))
          .then((rows) => rows[0] ?? null);
        if (!sourceComment || sourceComment.companyId !== issue.companyId || sourceComment.issueId !== issue.id) {
          throw unprocessable("sourceCommentId must belong to the same issue and company");
        }
      }

      if (data.sourceRunId) {
        const sourceRun = await db
          .select({
            companyId: heartbeatRuns.companyId,
          })
          .from(heartbeatRuns)
          .where(eq(heartbeatRuns.id, data.sourceRunId))
          .then((rows) => rows[0] ?? null);
        if (!sourceRun || sourceRun.companyId !== issue.companyId) {
          throw unprocessable("sourceRunId must belong to the same company");
        }
      }

      if (
        data.kind === "request_confirmation"
        || data.kind === "request_checkbox_confirmation"
        || data.kind === "request_item_verdicts"
      ) {
        await assertRequestConfirmationTargetIsCurrent(db, {
          companyId: issue.companyId,
          issueId: issue.id,
          target: data.payload.target ?? null,
        });
      }

      let created: IssueThreadInteractionRow;
      try {
        [created] = await db
          .insert(issueThreadInteractions)
          .values({
            companyId: issue.companyId,
            issueId: issue.id,
            kind: data.kind,
            status: "pending",
            continuationPolicy: data.continuationPolicy,
            idempotencyKey: data.idempotencyKey ?? null,
            sourceCommentId: data.sourceCommentId ?? null,
            sourceRunId: data.sourceRunId ?? null,
            title: data.title ?? null,
            summary: data.summary ?? null,
            createdByAgentId: actor.agentId ?? null,
            createdByUserId: actor.userId ?? null,
            payload: data.payload,
          })
          .returning();
      } catch (error) {
        if (!data.idempotencyKey || !isIssueThreadInteractionIdempotencyConflict(error)) {
          throw error;
        }
        const existing = await getIdempotentInteraction({
          issueId: issue.id,
          companyId: issue.companyId,
          idempotencyKey: data.idempotencyKey,
        });
        if (!existing) throw error;
        if (!isEquivalentCreateRequest(existing, data, actor)) {
          throw conflict("Interaction idempotency key already exists for a different request", {
            idempotencyKey: data.idempotencyKey,
          });
        }
        return hydrateInteraction(existing);
      }

      await touchIssue(db, issue.id);
      return hydrateInteraction(created);
    },

    acceptInteraction: async (
      issue: { id: string; companyId: string; projectId: string | null; goalId: string | null },
      interactionId: string,
      input: AcceptIssueThreadInteraction,
      actor: InteractionActor,
    ): Promise<ResolvedInteractionResult> => {
      const data = acceptIssueThreadInteractionSchema.parse(input);
      const current = await getPendingInteractionForResolution({ issue, interactionId });
      switch (current.kind) {
        case "suggest_tasks":
          // Accepting suggest_tasks only creates follow-up issues; it does not
          // approve code state or move the source workspace forward, so the
          // workspace_finalize gate (PAPA-440) does not apply here.
          return issueThreadInteractionService(db).acceptSuggestedTasks(issue, interactionId, data, actor);
        case "request_confirmation": {
          await assertIssueWorkspaceFinalizedForAccept({ db, issue, sourceRunId: current.sourceRunId });
          const accepted = await acceptRequestConfirmation({
            issue,
            current,
            input: data,
            actor,
          });
          return {
            interaction: accepted.interaction,
            continuationIssue: accepted.continuationIssue,
            createdIssues: [],
          };
        }
        case "request_checkbox_confirmation": {
          await assertIssueWorkspaceFinalizedForAccept({ db, issue, sourceRunId: current.sourceRunId });
          const accepted = await acceptRequestConfirmation({
            issue,
            current,
            input: data,
            actor,
          });
          return {
            interaction: accepted.interaction,
            continuationIssue: accepted.continuationIssue,
            createdIssues: [],
          };
        }
        default:
          throw unprocessable(`Interactions of kind ${current.kind} cannot be accepted`);
      }
    },

    acceptSuggestedTasks: async (
      issue: { id: string; companyId: string; projectId: string | null; goalId: string | null },
      interactionId: string,
      input: AcceptIssueThreadInteraction,
      actor: InteractionActor,
    ) => {
      const current = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, interactionId))
        .then((rows) => rows[0] ?? null);

      if (!current) throw notFound("Interaction not found");
      if (current.companyId !== issue.companyId || current.issueId !== issue.id) {
        throw notFound("Interaction not found");
      }
      if (current.kind !== "suggest_tasks") {
        throw unprocessable("Only suggest_tasks interactions can be accepted");
      }
      if (current.status !== "pending") {
        throw conflict("Interaction has already been resolved");
      }

      const interaction = hydrateInteraction(current) as SuggestTasksInteraction;
      const { selectedTasks, skippedClientKeys } = resolveSelectedSuggestedTasks({
        interaction,
        selectedClientKeys: input.selectedClientKeys,
      });
      const orderedTasks = buildTaskCreationOrder(selectedTasks);
      const explicitParentIds = [...new Set([
        issue.id,
        ...(interaction.payload.defaultParentId ? [interaction.payload.defaultParentId] : []),
        ...selectedTasks
          .map((task) => task.parentId ?? null)
          .filter((value): value is string => Boolean(value)),
      ])];

      const parentRows = explicitParentIds.length === 0
        ? []
        : await db
          .select({
            id: issues.id,
            identifier: issues.identifier,
            companyId: issues.companyId,
          })
          .from(issues)
          .where(and(eq(issues.companyId, issue.companyId), inArray(issues.id, explicitParentIds)));
      if (parentRows.length !== explicitParentIds.length) {
        throw unprocessable("Suggested tasks reference parent issues outside this company or issue tree");
      }

      const parentById = new Map(parentRows.map((row) => [row.id, row] as const));
      const createdByClientKey = new Map<string, SuggestTasksResultCreatedTask>();
      const createdWakeTargets: IssueWakeTarget[] = [];

      await db.transaction(async (tx) => {
        const resolvedAt = new Date();
        const [claimed] = await tx
          .update(issueThreadInteractions)
          .set({
            status: "accepted",
            resolvedByAgentId: actor.agentId ?? null,
            resolvedByUserId: actor.userId ?? null,
            resolvedAt,
            updatedAt: resolvedAt,
          })
          .where(and(
            eq(issueThreadInteractions.companyId, issue.companyId),
            eq(issueThreadInteractions.issueId, issue.id),
            eq(issueThreadInteractions.idempotencyKey, params.idempotencyKey),
          ));
        if (existing[0]) return normalizeRow(existing[0] as Record<string, unknown>);
      }

      const now = new Date();
      const inserted = await db
        .insert(issueThreadInteractions)
        .values({
          companyId: issue.companyId,
          issueId: issue.id,
          kind: params.kind,
          status: "pending",
          continuationPolicy: params.continuationPolicy ?? "wake_assignee",
          idempotencyKey: params.idempotencyKey ?? null,
          sourceRunId: params.sourceRunId ?? null,
          title: params.title ?? null,
          summary: params.summary ?? null,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
          payload: params.payload,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      const row = inserted[0] as Record<string, unknown> | undefined;
      if (row) return normalizeRow(row);
      return {
        id: "stub-id",
        companyId: issue.companyId,
        issueId: issue.id,
        kind: params.kind,
        status: "pending",
        continuationPolicy: params.continuationPolicy ?? "wake_assignee",
        sourceCommentId: null,
        sourceRunId: params.sourceRunId ?? null,
        title: params.title ?? null,
        summary: params.summary ?? null,
        createdByAgentId: actor.agentId ?? null,
        createdByUserId: actor.userId ?? null,
        resolvedByAgentId: null,
        resolvedByUserId: null,
        payload: params.payload,
        result: null,
        idempotencyKey: params.idempotencyKey ?? null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      const accepted = hydrateInteraction(current);
        createdTaskCount: createdWakeTargets.length,
      });
        interaction: accepted,
        createdIssues: createdWakeTargets,
      };
    },
    async acceptInteraction(issue, interactionId, params, actor) {
      const [existing] = await db
        .select()
        .from(issueThreadInteractions)
        .where(and(
          eq(issueThreadInteractions.companyId, issue.companyId),
          eq(issueThreadInteractions.issueId, issue.id),
          eq(issueThreadInteractions.id, interactionId),
        ));
      const interaction = existing ? normalizeRow(existing as Record<string, unknown>) : null;
      const payload = interaction?.payload ?? {};
      const tasks = Array.isArray(payload.tasks) ? payload.tasks as Array<Record<string, unknown>> : [];
      const selected = Array.isArray(params.selectedClientKeys) && params.selectedClientKeys.length > 0
        ? new Set(params.selectedClientKeys)
        : new Set(tasks.map((task) => String(task.clientKey)));
      const createdIssues: Array<{ id: string; assigneeAgentId?: string | null }> = [];
      const createdTasks: Array<Record<string, unknown>> = [];
      const skippedClientKeys: string[] = [];

      if (interaction?.kind === "suggest_tasks") {
        const issueSvc = issueService(db);
        for (const task of tasks) {
          const clientKey = String(task.clientKey ?? "");
          if (!clientKey || !selected.has(clientKey)) {
            if (clientKey) skippedClientKeys.push(clientKey);
            continue;
          }
          const created = await issueSvc.createChild?.(issue.id, {
            title: String(task.title ?? "Suggested task"),
            description: typeof task.description === "string" ? task.description : null,
            priority: typeof task.priority === "string" ? task.priority : undefined,
            assigneeAgentId: typeof task.assigneeAgentId === "string" ? task.assigneeAgentId : null,
            assigneeUserId: typeof task.assigneeUserId === "string" ? task.assigneeUserId : null,
            status: typeof task.assigneeAgentId === "string" || typeof task.assigneeUserId === "string" ? "todo" : "backlog",
          });
          if (created?.issue) {
            createdIssues.push(created.issue);
            createdTasks.push({
              clientKey,
              issueId: created.issue.id,
              title: created.issue.title,
              identifier: created.issue.identifier,
              parentIssueId: issue.id,
            });
          }
        }
      }

      const result = interaction?.kind === "suggest_tasks"
        ? { version: 1, selectedClientKeys: Array.from(selected), createdTasks, skippedClientKeys }
        : { version: 1, outcome: "accepted" };
      const updated = await updateResolved(issue, interactionId, { status: "accepted", result }, actor);
      return {
        interaction: updated ?? {
          id: interactionId,
          companyId: issue.companyId,
          issueId: issue.id,
          kind: interaction?.kind ?? "request_confirmation",
          status: "accepted",
          continuationPolicy: interaction?.continuationPolicy ?? "wake_assignee_on_accept",
          idempotencyKey: interaction?.idempotencyKey ?? null,
          sourceCommentId: interaction?.sourceCommentId ?? null,
          sourceRunId: interaction?.sourceRunId ?? null,
          title: interaction?.title ?? null,
          summary: interaction?.summary ?? null,
          createdByAgentId: interaction?.createdByAgentId ?? null,
          createdByUserId: interaction?.createdByUserId ?? null,
    rejectInteraction: async (
      issue: { id: string; companyId: string },
      interactionId: string,
      input: RejectIssueThreadInteraction,
      actor: InteractionActor,
    ) => {
      const data = rejectIssueThreadInteractionSchema.parse(input);
      const current = await getPendingInteractionForResolution({ issue, interactionId });
      switch (current.kind) {
        case "suggest_tasks":
          return issueThreadInteractionService(db).rejectSuggestedTasks(issue, interactionId, data, actor, current);
        case "request_confirmation":
        case "request_checkbox_confirmation":
          return rejectRequestConfirmation({
            issue,
            current,
            input: data,
            actor,
        default:
          throw unprocessable(`Interactions of kind ${current.kind} cannot be rejected`);
    },
    submitItemVerdicts: async (
      issue: { id: string; companyId: string },
      interactionId: string,
      input: SubmitIssueThreadInteractionVerdicts,
      actor: InteractionActor,
    ): Promise<{ interaction: IssueThreadInteraction; newlyResolvedItemIds: string[] }> => {
      const data = submitIssueThreadInteractionVerdictsSchema.parse(input);
      const submission = await db.transaction(async (tx) => {
        const current = await tx
          .select()
          .from(issueThreadInteractions)
          .where(eq(issueThreadInteractions.id, interactionId))
          .for("update")
          .then((rows) => rows[0] ?? null);
        if (!current) throw notFound("Interaction not found");
        if (current.companyId !== issue.companyId || current.issueId !== issue.id) {
          throw notFound("Interaction not found");
        if (current.kind !== "request_item_verdicts") {
          throw unprocessable("Only request_item_verdicts interactions can receive item verdicts");
        const interaction = hydrateInteraction(current) as RequestItemVerdictsInteraction;
        if (current.status !== "pending") {
          if (current.status === "answered") {
            const resolvedIds = new Set(interaction.result?.items.map((item) => item.id) ?? []);
            const payloadIds = new Set(interaction.payload.items.map((item) => item.id));
            for (const submitted of data.verdicts) {
              if (!payloadIds.has(submitted.id)) {
                throw unprocessable(`Unknown item verdict id: ${submitted.id}`);
              }
              if (!resolvedIds.has(submitted.id)) {
                throw conflict("Interaction has already been resolved");
              }
            }
            return { interaction, newlyResolvedItemIds: [], resolved: false };
          throw conflict("Interaction has already been resolved");
        const expired = await expireStaleRequestConfirmationTarget(tx, {
          row: current,
          actor,
        });
        if (expired) {
          return { interaction: expired, newlyResolvedItemIds: [], resolved: false };
        const now = new Date();
        const { items, complete, newlyResolvedItemIds } = resolveRequestItemVerdictSubmissions({
          interaction,
          input: data,
          actor,
          now,
        });
        if (newlyResolvedItemIds.length === 0) {
          return { interaction, newlyResolvedItemIds: [], resolved: false };
        const result = {
          version: 1,
          outcome: "resolved",
          complete,
          items,
        } satisfies RequestItemVerdictsResult;
        const [updated] = await tx
          .update(issueThreadInteractions)
          .set({
            status: complete ? "answered" : "pending",
            result,
            resolvedByAgentId: complete ? actor.agentId ?? null : null,
            resolvedByUserId: complete ? actor.userId ?? null : null,
            resolvedAt: complete ? now : null,
            updatedAt: now,
          })
          .where(and(
            eq(issueThreadInteractions.id, interactionId),
            eq(issueThreadInteractions.status, "pending"),
          ))
          .returning();
        if (!updated) {
          throw conflict("Interaction has already been resolved");
        await touchIssue(tx, issue.id);
        return {
          interaction: hydrateInteraction(updated),
          newlyResolvedItemIds,
          resolved: complete,
        };
      });
      if (submission.resolved) {
      return submission;
    },
    rejectSuggestedTasks: async (
      issue: { id: string; companyId: string },
      interactionId: string,
      input: RejectIssueThreadInteraction,
      actor: InteractionActor,
      current: IssueThreadInteractionRow,
    ) => {
      if (current.companyId !== issue.companyId || current.issueId !== issue.id) {
        throw notFound("Interaction not found");
      if (current.kind !== "suggest_tasks") {
        throw unprocessable("Only suggest_tasks interactions can be rejected");
      if (current.status !== "pending") {
        throw conflict("Interaction has already been resolved");
      const [updated] = await db
        .update(issueThreadInteractions)
        .set({
          status: "rejected",
          result: {
            version: 1,
            rejectionReason: input.reason?.trim() || null,
          },
          resolvedByAgentId: actor.agentId ?? null,
          resolvedByUserId: actor.userId ?? null,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(issueThreadInteractions.id, interactionId),
          eq(issueThreadInteractions.status, "pending"),
        ))
        .returning();
      if (!updated) {
        throw conflict("Interaction has already been resolved");
      await touchIssue(db, issue.id);
      const rejected = hydrateInteraction(updated);
      return rejected;
    },
    expireRequestConfirmationsSupersededByComment: async (
      issue: { id: string; companyId: string },
      comment: { id: string; createdAt: Date | string; authorUserId?: string | null },
      actor: InteractionActor,
    ) => {
      if (!comment.authorUserId) return [];
      const rows = await db
        .select()
        .from(issueThreadInteractions)
        .where(and(
          eq(issueThreadInteractions.companyId, issue.companyId),
          eq(issueThreadInteractions.issueId, issue.id),
          inArray(issueThreadInteractions.kind, [...USER_COMMENT_SUPERSEDABLE_INTERACTION_KINDS]),
          eq(issueThreadInteractions.status, "pending"),
        ));
      const superseded = rows.filter((row) => {
        if (!isUserCommentSupersedableKind(row.kind)) return false;
        const interaction = hydrateInteraction(row) as UserCommentSupersedableInteraction;
        return (
          shouldSupersedeInteractionOnUserComment(interaction)
          && isCommentAtOrAfterInteraction({
            commentCreatedAt: comment.createdAt,
            interactionCreatedAt: row.createdAt,
          })
        );
      });
      if (superseded.length === 0) return [];
      const now = new Date();
      const expired: IssueThreadInteraction[] = [];
      for (const row of superseded) {
        const [updated] = await db
          .update(issueThreadInteractions)
          .set({
            status: "expired",
            result: buildSupersededByCommentResult(row, comment.id),
            resolvedByAgentId: actor.agentId ?? null,
            resolvedByUserId: actor.userId ?? null,
            resolvedAt: now,
            updatedAt: now,
          })
          .where(and(
            eq(issueThreadInteractions.id, row.id),
            eq(issueThreadInteractions.status, "pending"),
          ))
          .returning();
        if (updated) expired.push(hydrateInteraction(updated));
      if (expired.length > 0) {
        await touchIssue(db, issue.id);
      return expired;
    },
    expireRequestConfirmationsSupersededByHistoricalComments: async (
      issue: { id: string; companyId: string },
    ) => {
      const [rows, comments] = await Promise.all([
        db
          .select()
          .from(issueThreadInteractions)
          .where(and(
            eq(issueThreadInteractions.companyId, issue.companyId),
            eq(issueThreadInteractions.issueId, issue.id),
            inArray(issueThreadInteractions.kind, [...USER_COMMENT_SUPERSEDABLE_INTERACTION_KINDS]),
            eq(issueThreadInteractions.status, "pending"),
          )),
        db
          .select()
          .from(issueComments)
          .where(and(
            eq(issueComments.companyId, issue.companyId),
            eq(issueComments.issueId, issue.id),
            isNotNull(issueComments.authorUserId),
          ))
          .orderBy(asc(issueComments.createdAt)),
      ]);
      if (rows.length === 0 || comments.length === 0) return [];
      const now = new Date();
      const expired: IssueThreadInteraction[] = [];
      const supersededByComment = new Map<
        string,
        {
          comment: (typeof comments)[number];
          rowIds: string[];
      >();
      for (const row of rows) {
        if (!isUserCommentSupersedableKind(row.kind)) continue;
        const interaction = hydrateInteraction(row) as UserCommentSupersedableInteraction;
        if (!shouldSupersedeInteractionOnUserComment(interaction)) continue;
        const supersedingComment = comments.find((comment) => isCommentAtOrAfterInteraction({
          commentCreatedAt: comment.createdAt,
          interactionCreatedAt: row.createdAt,
        }));
        if (!supersedingComment) continue;
        const group = supersededByComment.get(supersedingComment.id);
        if (group) {
          group.rowIds.push(row.id);
        } else {
          supersededByComment.set(supersedingComment.id, {
            comment: supersedingComment,
            rowIds: [row.id],
      const rowById = new Map(rows.map((row) => [row.id, row] as const));
      for (const { comment, rowIds } of supersededByComment.values()) {
        const commentRows = rowIds
          .map((rowId) => rowById.get(rowId))
          .filter((row): row is IssueThreadInteractionRow => Boolean(row));
        const questionRowIds = commentRows
          .filter((row) => row.kind === "ask_user_questions")
          .map((row) => row.id);
        const confirmationRowIds = commentRows
          .filter((row) => isRequestConfirmationLikeKind(row.kind))
          .map((row) => row.id);
        const itemVerdictRows = commentRows
          .filter((row) => row.kind === "request_item_verdicts");
        if (questionRowIds.length > 0) {
          const sampleQuestionRow = commentRows.find((row) => row.kind === "ask_user_questions");
          if (!sampleQuestionRow) continue;
          const updatedRows = await db
            .update(issueThreadInteractions)
            .set({
              status: "expired",
              result: buildSupersededByCommentResult(sampleQuestionRow, comment.id),
              resolvedByAgentId: null,
              resolvedByUserId: comment.authorUserId,
              resolvedAt: now,
              updatedAt: now,
            })
            .where(and(
              inArray(issueThreadInteractions.id, questionRowIds),
              eq(issueThreadInteractions.status, "pending"),
            ))
            .returning();
          expired.push(...updatedRows.map(hydrateInteraction));
        if (confirmationRowIds.length > 0) {
          const sampleConfirmationRow = commentRows.find((row) => isRequestConfirmationLikeKind(row.kind));
          if (!sampleConfirmationRow) continue;
          const updatedRows = await db
            .update(issueThreadInteractions)
            .set({
              status: "expired",
              result: buildSupersededByCommentResult(sampleConfirmationRow, comment.id),
              resolvedByAgentId: null,
              resolvedByUserId: comment.authorUserId,
              resolvedAt: now,
              updatedAt: now,
            })
            .where(and(
              inArray(issueThreadInteractions.id, confirmationRowIds),
              eq(issueThreadInteractions.status, "pending"),
            ))
            .returning();
          expired.push(...updatedRows.map(hydrateInteraction));
        for (const row of itemVerdictRows) {
          const [updated] = await db
            .update(issueThreadInteractions)
            .set({
              status: "expired",
              result: buildSupersededByCommentResult(row, comment.id),
              resolvedByAgentId: null,
              resolvedByUserId: comment.authorUserId,
              resolvedAt: now,
              updatedAt: now,
            })
            .where(and(
              eq(issueThreadInteractions.id, row.id),
              eq(issueThreadInteractions.status, "pending"),
            ))
            .returning();
          if (updated) expired.push(hydrateInteraction(updated));
      if (expired.length > 0) {
        await touchIssue(db, issue.id);
      return expired;
    },
    expireStaleRequestConfirmationsForIssueDocument: async (
      issue: { id: string; companyId: string },
      document: { id: string; key: string; latestRevisionId?: string | null; latestRevisionNumber?: number | null } | null,
      actor: InteractionActor,
    ) => {
      const rows = await db
        .select()
        .from(issueThreadInteractions)
        .where(and(
          eq(issueThreadInteractions.companyId, issue.companyId),
          eq(issueThreadInteractions.issueId, issue.id),
          inArray(issueThreadInteractions.kind, [...TARGET_BOUND_INTERACTION_KINDS]),
          eq(issueThreadInteractions.status, "pending"),
        ));
      const staleRows = rows.filter((row) => {
        const interaction = hydrateInteraction(row) as TargetBoundInteraction;
        const target = interaction.payload.target;
        if (!target || target.type !== "issue_document") return false;
        const targetIssueId = target.issueId ?? issue.id;
        if (targetIssueId !== issue.id) return false;
        if (document && target.documentId && target.documentId !== document.id) return false;
        if (document && target.key !== document.key) return false;
        if (!document) return true;
        return (
          target.revisionId !== document.latestRevisionId
          || (target.revisionNumber != null && target.revisionNumber !== document.latestRevisionNumber)
        );
      });
      if (staleRows.length === 0) return [];
      const now = new Date();
      const expired: IssueThreadInteraction[] = [];
      for (const row of staleRows) {
        const interaction = hydrateInteraction(row) as TargetBoundInteraction;
        const target = interaction.payload.target ?? null;
        const currentTarget = buildIssueDocumentTargetFromDocument({
          document,
        });
        const [updated] = await db
          .update(issueThreadInteractions)
          .set({
            status: "expired",
            payload: currentTarget
              ? {
                  ...interaction.payload,
                  target: currentTarget,
                }
              : interaction.payload,
            result: buildStaleTargetResult(row, target),
            resolvedByAgentId: actor.agentId ?? null,
            resolvedByUserId: actor.userId ?? null,
            resolvedAt: now,
            updatedAt: now,
          })
          .where(and(
            eq(issueThreadInteractions.id, row.id),
            eq(issueThreadInteractions.status, "pending"),
          ))
          .returning();
        if (updated) expired.push(hydrateInteraction(updated));
      if (expired.length > 0) {
        await touchIssue(db, issue.id);
      return expired;
    },
    answerQuestions: async (
      issue: { id: string; companyId: string },
      interactionId: string,
      input: RespondIssueThreadInteraction,
      actor: InteractionActor,
    ) => {
      const current = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, interactionId))
        .then((rows) => rows[0] ?? null);
      if (!current) throw notFound("Interaction not found");
      if (current.companyId !== issue.companyId || current.issueId !== issue.id) {
        throw notFound("Interaction not found");
      if (current.kind !== "ask_user_questions") {
        throw unprocessable("Only ask_user_questions interactions can be answered");
      if (current.status !== "pending") {
        throw conflict("Interaction has already been resolved");
      const interaction = hydrateInteraction(current) as AskUserQuestionsInteraction;
      const normalizedAnswers = normalizeQuestionAnswers({
        questions: interaction.payload.questions,
        answers: input.answers,
      });
      const [updated] = await db
        .update(issueThreadInteractions)
        .set({
          status: "answered",
          result: {
            version: 1,
            answers: normalizedAnswers,
            summaryMarkdown: input.summaryMarkdown ?? null,
          },
          resolvedByAgentId: actor.agentId ?? null,
          resolvedByUserId: actor.userId ?? null,
          payload,
          result,
          resolvedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdIssues,
      };
    },
    async rejectInteraction(issue, interactionId, params, actor) {
      const result = { version: 1, outcome: "rejected", rejectionReason: params.reason ?? null, reason: params.reason ?? null };
      const updated = await updateResolved(issue, interactionId, { status: "rejected", result }, actor);
      if (updated) return updated;
      const now = new Date();
      return {
        id: interactionId,
        companyId: issue.companyId,
        issueId: issue.id,
        kind: "request_confirmation",
        status: "rejected",
        continuationPolicy: "wake_assignee_on_accept",
        idempotencyKey: null,
        sourceCommentId: null,
        sourceRunId: null,
        title: null,
        summary: null,
        createdByAgentId: null,
        createdByUserId: null,
        resolvedByAgentId: actor.agentId ?? null,
        resolvedByUserId: actor.userId ?? null,
        payload: {},
        result,
        resolvedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    },
    async answerQuestions(issue, interactionId, answers, actor) {
      const result = {
        version: 1,
        answers: answers.answers.map((answer) => ({
          questionId: answer.questionId,
          optionIds: Array.from(new Set(answer.optionIds)),
        })),
        summaryMarkdown: answers.summaryMarkdown ?? null,
      };
      const updated = await updateResolved(issue, interactionId, { status: "answered", result }, actor);
      if (updated) return { ...updated, result };
      const now = new Date();
      return {
        id: interactionId,
        companyId: issue.companyId,
        issueId: issue.id,
        kind: "ask_user_questions",
        status: "answered",
        continuationPolicy: "wake_assignee",
        idempotencyKey: null,
        sourceCommentId: null,
        sourceRunId: null,
        title: null,
        summary: null,
        createdByAgentId: null,
        createdByUserId: null,
        resolvedByAgentId: actor.agentId ?? null,
        resolvedByUserId: actor.userId ?? null,
        payload: {},
        result,
        resolvedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    },
    async cancelQuestions(issue, interactionId, params, actor) {
      const result = {
        version: 1,
        answers: [],
        cancelled: true,
        cancellationReason: params.reason ?? null,
        summaryMarkdown: params.summaryMarkdown ?? null,
      };
      const updated = await updateResolved(issue, interactionId, { status: "cancelled", result }, actor);
      if (updated) return { ...updated, result };
      const now = new Date();
      return {
        id: interactionId,
        companyId: issue.companyId,
        issueId: issue.id,
        kind: "ask_user_questions",
        status: "cancelled",
        continuationPolicy: "wake_assignee",
        idempotencyKey: null,
        sourceCommentId: null,
        sourceRunId: null,
        title: null,
        summary: null,
        createdByAgentId: null,
        createdByUserId: null,
        resolvedByAgentId: actor.agentId ?? null,
        resolvedByUserId: actor.userId ?? null,
        payload: {},
        result,
        resolvedAt: now,
        createdAt: now,
        updatedAt: now,
      };
        })
        .where(and(
          eq(issueThreadInteractions.id, interactionId),
          eq(issueThreadInteractions.status, "pending"),
        ))
        .returning();

      if (!updated) {
        throw conflict("Interaction has already been resolved");
      }

      await touchIssue(db, issue.id);
      const answered = hydrateInteraction(updated);
      return answered;

    cancelQuestions: async (
      issue: { id: string; companyId: string },
      interactionId: string,
      input: CancelIssueThreadInteraction,
      actor: InteractionActor,
    ) => {
      const data = cancelIssueThreadInteractionSchema.parse(input);
      const current = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, interactionId))
        .then((rows) => rows[0] ?? null);

      if (!current) throw notFound("Interaction not found");
      if (current.companyId !== issue.companyId || current.issueId !== issue.id) {
        throw notFound("Interaction not found");
      }
      if (current.kind !== "ask_user_questions") {
        throw unprocessable("Only ask_user_questions interactions can be cancelled");
      }
      if (current.status !== "pending") {
        throw conflict("Interaction has already been resolved");
      }

      const reason = data.reason?.trim() || null;
      const [updated] = await db
        .update(issueThreadInteractions)
        .set({
          status: "cancelled",
          result: {
            version: 1,
            answers: [],
            cancelled: true,
            cancellationReason: reason,
            summaryMarkdown: null,
          },
          resolvedByAgentId: actor.agentId ?? null,
          resolvedByUserId: actor.userId ?? null,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(issueThreadInteractions.id, interactionId),
          eq(issueThreadInteractions.status, "pending"),
        ))
        .returning();

      if (!updated) {
        throw conflict("Interaction has already been resolved");
      }

      await touchIssue(db, issue.id);
      const cancelled = hydrateInteraction(updated);
      return cancelled;
    },
  };
}
