import * as Sentry from "@sentry/nextjs";

/**
 * Next.js server runtime for landing + admin host.
 * Prefer SENTRY_ADMIN_DSN when explicitly targeting the admin project; otherwise
 * public-site DSN remains the default for ciutatis.com.
 */
const PUBLIC_DSN =
  "https://dbe2a85e0768cbf6427765b62a2a920c@o4510991955263488.ingest.us.sentry.io/4511718039289856";
const ADMIN_DSN =
  "https://8308468049519770565f0442f19a7862@o4510991955263488.ingest.us.sentry.io/4511718399541253";

const dsn =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  (process.env.SENTRY_PROJECT === "ciutatis-admin" ? ADMIN_DSN : PUBLIC_DSN);

Sentry.init({
  dsn,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  sendDefaultPii: true,
  enableLogs: true,
  includeLocalVariables: true,
  tracesSampleRate: 1.0,
});
