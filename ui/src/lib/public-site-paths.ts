const PUBLIC_SITE_PATHS = new Set([
  "/",
  "/platform",
  "/about",
  "/partners",
  "/en",
  "/en/platform",
  "/en/about",
  "/en/partners",
  "/es",
  "/es/procesos",
  "/es/modulos",
  "/es/casos",
  "/es/plataforma",
  "/es/nosotros",
  "/es/alianzas",
]);

const ADMIN_HOSTNAMES = new Set([
  "admin.ciutatis.com",
]);

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function normalizeHostname(hostname: string | null | undefined): string {
  return (hostname ?? "").trim().toLowerCase();
}

export function isAdminHostname(hostname: string | null | undefined): boolean {
  return ADMIN_HOSTNAMES.has(normalizeHostname(hostname));
}

export function isPublicSitePath(pathname: string, hostname?: string | null): boolean {
  if (isAdminHostname(hostname ?? globalThis.location?.hostname)) {
    return false;
  }

  return PUBLIC_SITE_PATHS.has(normalizePath(pathname));
}
