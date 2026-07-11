import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env.SENTRY_DSN ??
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://dbe2a85e0768cbf6427765b62a2a920c@o4510991955263488.ingest.us.sentry.io/4511718039289856";

Sentry.init({
  dsn,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  sendDefaultPii: true,
  enableLogs: true,
  tracesSampleRate: 1.0,
});
