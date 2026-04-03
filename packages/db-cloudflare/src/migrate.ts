import { migrate } from "drizzle-orm/d1/migrator";
import { createDb } from "./client.js";

/**
 * Apply pending migrations to a D1 database.
 *
 * @param d1 - The D1Database binding from the Worker environment
 * @param migrationsFolder - Path to the migrations folder (defaults to bundled migrations)
 */
export async function applyMigrations(
  d1: D1Database,
  migrationsFolder?: string,
): Promise<void> {
  const db = createDb(d1);
  await migrate(db, {
    migrationsFolder: migrationsFolder ?? "./migrations",
  });
}
