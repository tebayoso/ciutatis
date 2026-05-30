import type { ReactNode } from "react";

// Admin route group. This is the SSR shell that hosts the consolidated
// admin surface (the SPA mounted under /admin via next/dynamic, ssr:false).
// Auth is enforced client-side by the SPA: CloudAccessGate redirects
// unauthenticated users to /admin/auth (via App.tsx). There is no
// middleware.ts/proxy.ts; this layout only provides the route shell.

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
