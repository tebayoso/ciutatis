import PublicApp from "../PublicApp";

type Locale = "en" | "es";
type PublicRoute = "home" | "govops" | "scrutiny" | "portal" | "region";

const staticSlugs = [
  [],
  ["en"],
  ["govops"],
  ["scrutiny"],
  ["portal"],
  ["en", "govops"],
  ["en", "scrutiny"],
  ["en", "portal"],
  ["es"],
  ["es", "govops"],
  ["es", "escrutinio"],
  ["es", "portal"],
  ["ar", "municipio", "7000-tandil"],
];

export function generateStaticParams() {
  return staticSlugs.map((slug) => ({ slug }));
}

function isRegionPath(pathname: string): boolean {
  return /^\/[a-z]{2}\/[a-z-]+\/[a-z0-9-]+$/.test(pathname);
}

function resolvePublicRouteFromSlug(slug: string[] = []): { locale: Locale; route: PublicRoute; regionPath?: string } {
  const pathname = `/${slug.join("/")}`.replace(/\/$/, "") || "/";

  if (isRegionPath(pathname)) {
    return { locale: pathname.startsWith("/es") ? "es" : "en", route: "region", regionPath: pathname };
  }

  if (pathname.startsWith("/es")) {
    if (pathname === "/es/escrutinio") return { locale: "es", route: "scrutiny" };
    if (pathname === "/es/govops") return { locale: "es", route: "govops" };
    if (pathname.startsWith("/es/portal")) return { locale: "es", route: "portal" };
    return { locale: "es", route: "home" };
  }

  if (pathname === "/scrutiny" || pathname === "/en/scrutiny") return { locale: "en", route: "scrutiny" };
  if (pathname === "/govops" || pathname === "/en/govops") return { locale: "en", route: "govops" };
  if (pathname.startsWith("/portal") || pathname.startsWith("/en/portal")) return { locale: "en", route: "portal" };
  return { locale: "en", route: "home" };
}

export default async function PublicCatchAllPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <PublicApp initialRouteState={resolvePublicRouteFromSlug(slug)} />;
}
