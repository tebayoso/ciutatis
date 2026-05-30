import { getServerSession } from "../../../lib/server-session";
import { redirect } from "next/navigation";

// Placeholder sign-in route. Reachable without a session (see middleware.ts).
// The full sign-in form will be migrated from the legacy SPA's /auth page; for
// now it links operators to the existing admin shell to authenticate.

export const dynamic = "force-dynamic";

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getServerSession();
  const { next } = await searchParams;
  if (session) {
    redirect(next && next.startsWith("/admin") ? next : "/admin");
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Sign in</h1>
      <p style={{ marginTop: "0.5rem", color: "#78716c" }}>
        Authentication is being migrated into this app. Sign-in form coming next.
      </p>
    </main>
  );
}
