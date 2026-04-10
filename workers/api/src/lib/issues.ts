import { eq, or } from "drizzle-orm";
import { issues, type Db } from "@ciutatis/db-cloudflare";

function normalizeIssueRef(rawId: string) {
  return /^[A-Z]+-\d+$/i.test(rawId) ? rawId.toUpperCase() : rawId;
}

export async function resolveIssueByRef(db: Db, rawId: string) {
  return db
    .select()
    .from(issues)
    .where(or(eq(issues.id, rawId), eq(issues.identifier, normalizeIssueRef(rawId))))
    .then((rows: any[]) => rows[0] ?? null);
}
