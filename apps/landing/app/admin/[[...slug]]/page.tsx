"use client";

import dynamic from "next/dynamic";

// Mount the react-router admin SPA client-side under /admin. ssr:false because
// the SPA's BrowserRouter and providers read `window` at render. Every path
// under /admin is handled by the SPA's own router (basename "/admin").
const AdminApp = dynamic(() => import("@/AdminApp").then((m) => m.AdminApp), {
  ssr: false,
});

export default function AdminCatchAll() {
  return <AdminApp />;
}
