export const type = "cloudflare_workers_ai";
export const label = "Cloudflare Workers AI";
export const DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL = "@cf/moonshotai/kimi-k2.5";

export const models: { id: string; label: string }[] = [
  { id: DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL, label: "Moonshot AI Kimi K2.5" },
  { id: "@cf/openai/gpt-oss-20b", label: "OpenAI gpt-oss-20b" },
  { id: "@cf/openai/gpt-oss-120b", label: "OpenAI gpt-oss-120b" },
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "Meta Llama 3.3 70B Instruct Fast",
  },
  {
    id: "@cf/meta/llama-3.1-8b-instruct-fast",
    label: "Meta Llama 3.1 8B Instruct Fast",
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    label: "DeepSeek R1 Distill Qwen 32B",
  },
];

export const agentConfigurationDoc = `# cloudflare_workers_ai agent configuration

Adapter: cloudflare_workers_ai

Use when:
- You want Ciutatis to run against Cloudflare Workers AI instead of a locally installed CLI.
- You want hosted model execution through Cloudflare's direct Workers AI APIs.

Don't use when:
- You need a local filesystem-aware coding CLI with native shell and tool execution.
- The server does not have Cloudflare Workers AI credentials configured.

Server credentials:
- CLOUDFLARE_ACCOUNT_ID or CIUTATIS_CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_API_TOKEN or CIUTATIS_CLOUDFLARE_API_TOKEN

Core fields:
- instructionsFilePath (string, optional): absolute path to a markdown instructions file prepended to the system prompt
- promptTemplate (string, optional): run prompt template
- model (string, optional): Workers AI model id. Defaults to ${DEFAULT_CLOUDFLARE_WORKERS_AI_MODEL}
- effort (string, optional): reasoning effort override (low, medium, high)
- timeoutSec (number, optional): request timeout in seconds (default 120)
- maxOutputTokens (number, optional): maximum response tokens (default 4096)
- env (object, optional): adapter-scoped environment overrides for credentials

Notes:
- This adapter uses Cloudflare's hosted model APIs and does not expose local shell, filesystem, or browser tools by default.
- If you want per-agent credentials, place them in adapterConfig.env using the same variable names listed above.
`;
