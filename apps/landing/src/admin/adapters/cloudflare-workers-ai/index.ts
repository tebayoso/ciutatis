import type { UIAdapterModule } from "../types";
import {
  buildCloudflareWorkersAiConfig,
  parseCloudflareWorkersAiStdoutLine,
} from "@ciutatis/adapter-cloudflare-workers-ai/ui";
import { CloudflareWorkersAiConfigFields } from "./config-fields";

export const cloudflareWorkersAiUIAdapter: UIAdapterModule = {
  type: "cloudflare_workers_ai",
  label: "Cloudflare Workers AI",
  parseStdoutLine: parseCloudflareWorkersAiStdoutLine,
  ConfigFields: CloudflareWorkersAiConfigFields,
  buildAdapterConfig: buildCloudflareWorkersAiConfig,
};
