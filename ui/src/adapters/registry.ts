import type { UIAdapterModule } from "./types";
import { geminiLocalUIAdapter } from "./gemini-local";
import { processUIAdapter } from "./process";
import { httpUIAdapter } from "./http";

const adaptersByType = new Map<string, UIAdapterModule>(
  [
    geminiLocalUIAdapter,
    processUIAdapter,
    httpUIAdapter,
  ].map((a) => [a.type, a]),
);

export function getUIAdapter(type: string): UIAdapterModule {
  return adaptersByType.get(type) ?? processUIAdapter;
}
