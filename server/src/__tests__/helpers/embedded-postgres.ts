export interface EmbeddedPostgresTestSupport {
  supported: boolean;
  reason?: string;
}

export async function getEmbeddedPostgresTestSupport(): Promise<EmbeddedPostgresTestSupport> {
  return {
    supported: false,
    reason: "embedded Postgres is not available in this test environment",
  };
}

export async function startEmbeddedPostgresTestDatabase(_prefix: string): Promise<never> {
  throw new Error("embedded Postgres is not available in this test environment");
}
