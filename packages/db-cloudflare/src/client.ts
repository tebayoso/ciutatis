import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema/index.js";

/**
 * Create a Drizzle ORM instance backed by Cloudflare D1.
 *
 * @param d1 - The D1Database binding from the Worker environment
 * @returns A fully-typed Drizzle instance with all Ciutatis schemas
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = ReturnType<typeof createDb>;
