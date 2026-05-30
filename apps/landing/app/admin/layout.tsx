import type { ReactNode } from "react";

// Admin route group. This is the SSR shell that will host the consolidated
// admin surface as routes are migrated off the legacy Vite SPA (apps/ui).
// Auth is enforced by middleware.ts (redirects unauthenticated users to
// /admin/login); pages re-read the session server-side for rendering.

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
