"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

export function SentryExampleClient() {
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="hero-button-solid w-fit"
        onClick={() => {
          const eventId = Sentry.captureException(new Error("Sentry test error from Ciutatis public site"));
          setLastEventId(eventId);
          // Also throw so the global handlers / replay path fire.
          setTimeout(() => {
            throw new Error("Sentry uncaught test error from Ciutatis public site");
          }, 0);
        }}
      >
        Throw client test error
      </button>
      <button
        type="button"
        className="ghost-button w-fit"
        onClick={() => {
          Sentry.logger.info("Sentry log test from Ciutatis public site", {
            surface: "sentry-example-page",
          });
          setLastEventId("log-sent");
        }}
      >
        Send test log
      </button>
      {lastEventId ? (
        <p className="text-xs text-[var(--muted)]">
          Last capture: <code>{lastEventId}</code>
        </p>
      ) : null}
    </div>
  );
}
