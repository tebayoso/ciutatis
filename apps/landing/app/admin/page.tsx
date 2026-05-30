import { redirect } from "next/navigation";
import { getServerSession } from "../../lib/server-session";

// Minimal SSR admin entry. Proves the server-runtime + middleware-auth +
// server-side-session pipeline end to end. Real admin views are migrated here
// incrementally from the legacy Vite SPA (apps/ui).

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await getServerSession();
  if (!session) {
    // Middleware should have caught this, but re-check at render time.
    redirect("/admin/login?next=/admin");
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Ciutatis Admin</h1>
      <p style={{ marginTop: "0.5rem", color: "#57534e" }}>
        Signed in as <strong>{session.user.email ?? session.user.id}</strong>
        {session.user.isInstanceAdmin ? " (instance admin)" : ""}.
      </p>
      <p style={{ marginTop: "1rem", color: "#78716c" }}>
        Server-rendered shell. Admin views are being migrated here from the
        legacy SPA.
      </p>
    </main>
  );
}
