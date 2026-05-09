// Stub - plugin-managed-routines feature intentionally removed from Ciutatis
// Routines were explicitly removed per project constraints
// This file exists only to satisfy upstream imports

import type { Db } from "@paperclipai/db";

export interface PluginManagedRoutineService {
  createRoutine(): Promise<void>;
  deleteRoutine(): Promise<void>;
  listRoutines(): Promise<unknown[]>;
}

export function pluginManagedRoutineService(_db: Db): PluginManagedRoutineService {
  return {
    async createRoutine() {
      throw new Error("Routines not available in Ciutatis");
    },
    async deleteRoutine() {
      // No-op
    },
    async listRoutines() {
      return [];
    },
  };
}
