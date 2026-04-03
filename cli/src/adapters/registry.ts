import type { CLIAdapterModule } from "@ciutatis/adapter-utils";
import { printGeminiStreamEvent } from "@ciutatis/adapter-gemini-local/cli";
import { processCLIAdapter } from "./process/index.js";
import { httpCLIAdapter } from "./http/index.js";

const geminiLocalCLIAdapter: CLIAdapterModule = {
  type: "gemini_local",
  formatStdoutEvent: printGeminiStreamEvent,
};

const adaptersByType = new Map<string, CLIAdapterModule>(
  [
    geminiLocalCLIAdapter,
    processCLIAdapter,
    httpCLIAdapter,
  ].map((a) => [a.type, a]),
);

export function getCLIAdapter(type: string): CLIAdapterModule {
  return adaptersByType.get(type) ?? processCLIAdapter;
}
