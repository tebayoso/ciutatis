import * as Sentry from "@sentry/nextjs";

const PUBLIC_DSN =
  "https://dbe2a85e0768cbf6427765b62a2a920c@o4510991955263488.ingest.us.sentry.io/4511718039289856";
const ADMIN_DSN =
  "https://8308468049519770565f0442f19a7862@o4510991955263488.ingest.us.sentry.io/4511718399541253";

function resolveClientDsn(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "admin.ciutatis.com" || host.startsWith("admin.")) {
      return process.env.NEXT_PUBLIC_SENTRY_ADMIN_DSN ?? ADMIN_DSN;
    }
  }
  return (
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    process.env.SENTRY_DSN ??
    PUBLIC_DSN
  );
}

Sentry.init({
  dsn: resolveClientDsn(),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  sendDefaultPii: true,
  enableLogs: true,
  // Full capture for the public site launch; dial down if volume gets costly.
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
    Sentry.feedbackIntegration({
      colorScheme: "light",
      autoInject: true,
    }),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
