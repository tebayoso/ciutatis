export interface CurrentUserRedactionOptions {
  enabled?: boolean;
  userNames?: string[];
  homeDirs?: string[];
}

export const CURRENT_USER_REDACTION_TOKEN = "current-user";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueNonEmpty(values: readonly string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

export function redactCurrentUserText(
  text: string,
  opts?: CurrentUserRedactionOptions,
): string {
  if (opts?.enabled === false) return text;

  let redacted = text;
  for (const homeDir of uniqueNonEmpty(opts?.homeDirs)) {
    const normalized = homeDir.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    const userName = parts.at(-1);
    if (!userName) continue;
    const redactedHomeDir = homeDir.replace(userName, CURRENT_USER_REDACTION_TOKEN);
    redacted = redacted.replace(new RegExp(escapeRegExp(homeDir), "g"), redactedHomeDir);
  }

  for (const userName of uniqueNonEmpty(opts?.userNames)) {
    redacted = redacted.replace(
      new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(userName)}(?![A-Za-z0-9_-])`, "g"),
      CURRENT_USER_REDACTION_TOKEN,
    );
  }

  return redacted;
}

export function redactCurrentUserValue(
  value: unknown,
  opts?: CurrentUserRedactionOptions,
): unknown {
  if (typeof value === "string") return redactCurrentUserText(value, opts);
  if (Array.isArray(value)) return value.map((item) => redactCurrentUserValue(item, opts));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactCurrentUserValue(entry, opts)]),
    );
  }
  return value;
}
