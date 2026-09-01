import * as Sentry from "@sentry/node";

/**
 * Ciutatis admin API (Express) → Sentry project `ciutatis-admin`.
 * Must be imported before any other application modules.
 */
const DEFAULT_ADMIN_DSN =
  "https://8308468049519770565f0442f19a7862@o4510991955263488.ingest.us.sentry.io/4511718399541253";

const dsn = process.env.SENTRY_DSN?.trim() || DEFAULT_ADMIN_DSN;
const enabled = process.env.SENTRY_ENABLED !== "0" && Boolean(dsn);

Sentry.init({
  dsn: enabled ? dsn : undefined,
  enabled,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  release: process.env.SENTRY_RELEASE ?? process.env.npm_package_version,
  serverName: process.env.SENTRY_SERVER_NAME,
  sendDefaultPii: true,
  enableLogs: true,
  includeLocalVariables: true,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "1.0"),
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below.
    // userInfo: false,
    // httpBodies: [],
  },
});

export { Sentry };
