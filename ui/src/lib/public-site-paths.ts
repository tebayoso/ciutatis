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

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function isPublicSitePath(pathname: string): boolean {
  return PUBLIC_SITE_PATHS.has(normalizePath(pathname));
}
