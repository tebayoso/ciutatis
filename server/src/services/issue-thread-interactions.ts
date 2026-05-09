// Stub - issue-thread-interactions feature intentionally removed from Ciutatis
// This file exists only to satisfy upstream imports

import type { Db } from "@paperclipai/db";

export interface IssueThreadInteractionService {
  recordInteraction(): Promise<void>;
  getInteractions(): Promise<unknown[]>;
  create(
    _issue: { id: string; companyId: string },
    _params: {
      kind: string;
      idempotencyKey: string;
      sourceRunId: string;
      title: string;
      summary: string;
      continuationPolicy: string;
      payload: Record<string, unknown>;
    },
    _actor: { agentId?: string; userId?: string }
  ): Promise<{
    id: string;
    kind: string;
    status: string;
    result: unknown;
    idempotencyKey: string;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  answerQuestions(
    _issue: { id: string; companyId: string },
    _interactionId: string,
    _answers: {
      answers: Array<{ questionId: string; optionIds: string[] }>;
      summaryMarkdown: string;
    },
    _actor: { userId?: string; agentId?: string }
  ): Promise<{
    id: string;
    kind: string;
    status: string;
    result: Record<string, unknown>;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export function issueThreadInteractionService(_db: Db): IssueThreadInteractionService {
  return {
    async recordInteraction() {
      // No-op - feature removed
    },
    async getInteractions() {
      return [];
    },
    async create(_issue, params, _actor) {
      return {
        id: "stub-id",
        kind: params.kind,
        status: "created",
        result: null,
        idempotencyKey: params.idempotencyKey,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
    async answerQuestions(_issue, _interactionId, answers, _actor) {
      // Stub - feature removed from Ciutatis
      return {
        id: "stub-id",
        kind: "stub",
        status: "answered",
        result: {
          version: 1,
          answers: answers.answers,
          summaryMarkdown: answers.summaryMarkdown,
        },
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
  };
}
