import type { Db } from "@paperclipai/db";

export function routineService(
  _db: Db,
  _opts?: Record<string, unknown>,
) {
  return {
    async runRoutine() {
      throw new Error("Routine execution is unavailable in this Ciutatis build.");
    },
  };
}
