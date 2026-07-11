"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-2xl text-[var(--ink)]">Something went wrong</h1>
      <p className="text-sm text-[var(--muted-strong)]">The error was reported to Sentry.</p>
      <button type="button" className="hero-button-solid" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
