import type { TranscriptEntry } from "@paperclipai/adapter-utils";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseCloudflareWorkersAiStdoutLine(
  line: string,
  ts: string,
): TranscriptEntry[] {
  const parsed = asRecord(safeJsonParse(line));
  if (!parsed) return [{ kind: "stdout", ts, text: line }];

  const type = asString(parsed.type);
  if (type === "assistant") {
    const message = asRecord(parsed.message);
    const content = Array.isArray(message?.content) ? message?.content : [];
    const text = content
      .map((entry) => asString(asRecord(entry)?.text))
      .filter(Boolean)
      .join("\n\n")
      .trim();
    return text ? [{ kind: "assistant", ts, text }] : [];
  }

  if (type === "result") {
    const usage = asRecord(parsed.usage) ?? {};
    return [
      {
        kind: "result",
        ts,
        text: "",
        inputTokens: asNumber(usage.input_tokens),
        outputTokens: asNumber(usage.output_tokens),
        cachedTokens: asNumber(usage.cached_input_tokens),
        costUsd: asNumber(parsed.total_cost_usd),
        subtype: asString(parsed.subtype) || "success",
        isError: parsed.is_error === true,
        errors: [],
      },
    ];
  }

  if (type === "system") {
    const subtype = asString(parsed.subtype);
    if (subtype === "init") {
      return [
        {
          kind: "init",
          ts,
          model: asString(parsed.model),
          sessionId: "",
        },
      ];
    }
    return [
      {
        kind: "system",
        ts,
        text: asString(parsed.message) || asString(parsed.error) || subtype || "system",
      },
    ];
  }

  return [{ kind: "stdout", ts, text: line }];
}
