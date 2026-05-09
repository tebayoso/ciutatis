// Stub file for upstream features not in Ciutatis
// Join request dedupe lib

export interface JoinRequestRow {
  id: string;
  inviteId?: string | null;
  status: string;
  requestingUserId: string | null;
  requestEmailSnapshot: string | null;
  approvedByUserId?: string | null;
  rejectedByUserId?: string | null;
  createdAt?: Date;
  requestType?: string;
}

export function collapseDuplicatePendingHumanJoinRequests<T extends JoinRequestRow>(
  rows: T[],
): T[] {
  // Ciutatis: no deduplication logic needed for simplified join flow
  return rows;
}

export function findReusableHumanJoinRequest<T extends JoinRequestRow>(
  rows: T[],
  criteria: {
    requestingUserId: string | null;
    requestEmailSnapshot: string | null;
  },
): T | null {
  // Ciutatis: simplified - no reuse logic
  return null;
}

export function dedupeJoinRequests(): void {}
