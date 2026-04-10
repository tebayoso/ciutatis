import * as p from "@clack/prompts";
import type { LlmConfig } from "../config/schema.js";

export async function promptLlm(): Promise<LlmConfig | undefined> {
  const configureLlm = await p.confirm({
    message: "Configure Cloudflare Workers AI now?",
    initialValue: false,
  });

  if (p.isCancel(configureLlm)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  if (!configureLlm) return undefined;

  const accountId = await p.text({
    message: "Cloudflare account ID",
    validate: (val) => {
      if (!val) return "Account ID is required";
    },
  });

  if (p.isCancel(accountId)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  const apiKey = await p.password({
    message: "Cloudflare API token",
    validate: (val) => {
      if (!val) return "API token is required";
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  return { provider: "cloudflare_workers_ai", apiKey, accountId };
}
