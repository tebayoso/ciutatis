import type { Metadata } from "next";
import { SentryExampleClient } from "./SentryExampleClient";

export const metadata: Metadata = {
  title: "Sentry example",
  robots: { index: false, follow: false },
};

export default function SentryExamplePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="font-serif text-3xl text-[var(--ink)]">Sentry example</h1>
      <p className="text-sm text-[var(--muted-strong)]">
        Triggers a client-side exception so you can confirm the public site is reporting into the{" "}
        <code>ciutatus-public</code> project on thcargentina.
      </p>
      <SentryExampleClient />
    </main>
  );
}
