import pc from "picocolors";

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

export function printCloudflareWorkersAiStreamEvent(raw: string, _debug: boolean): void {
  const line = raw.trim();
  if (!line) return;

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    console.log(line);
    return;
  }

  const type = asString(parsed.type);
  if (type === "assistant") {
    const content = Array.isArray(asRecord(parsed.message)?.content)
      ? (asRecord(parsed.message)?.content as unknown[])
      : [];
    const text = content
      .map((entry) => asString(asRecord(entry)?.text))
      .filter(Boolean)
      .join("\n\n")
      .trim();
    if (text) console.log(pc.green(`assistant: ${text}`));
    return;
  }

  if (type === "result") {
    const usage = asRecord(parsed.usage) ?? {};
    console.log(
      pc.blue(
        `tokens: in=${asNumber(usage.input_tokens)} out=${asNumber(usage.output_tokens)} cached=${asNumber(usage.cached_input_tokens)}`,
      ),
    );
    return;
  }

  if (type === "system") {
    const subtype = asString(parsed.subtype);
    const text = asString(parsed.message) || asString(parsed.error) || subtype || "system";
    console.log(subtype === "error" ? pc.red(text) : pc.gray(text));
    return;
  }

  console.log(line);
}
