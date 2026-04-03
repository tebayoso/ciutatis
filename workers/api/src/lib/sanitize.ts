const SENSITIVE_KEYS = new Set([
  "password",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "authorization",
  "credential",
  "private_key",
  "privateKey",
]);

export function sanitizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeRecord(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
