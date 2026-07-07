import type { Metadata } from "next";
import PublicApp from "../PublicApp";
import { CONTENT_ROUTES, ROUTE_PATHS, resolveRoute } from "../../lib/routes";
import { buildMetadata, SITE_NAME } from "../../lib/site-meta";

function slugFor(path: string): string[] {
  return path.split("/").filter(Boolean);
}

// SSG params: every localized content route + a couple of representative region pages.
const staticSlugs: string[][] = [
  [],
  ...CONTENT_ROUTES.flatMap((route) => [slugFor(ROUTE_PATHS[route].en), slugFor(ROUTE_PATHS[route].es)]),
  ["en", "govops"],
  ["en", "scrutiny"],
  ["en", "portal"],
  ["ar", "municipio", "7000-tandil"],
  ["us", "municipio", "new-york"],
];

export function generateStaticParams() {
  return staticSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const state = resolveRoute(`/${(slug ?? []).join("/")}`);
  if (state.route === "region") {
    return {
      title: `Public institution & place — ${SITE_NAME}`,
      description: "Explore a public institution or place on Ciutatis: claim, public requests, and civic data.",
      alternates: { canonical: state.regionPath },
    };
  }
  const meta = buildMetadata(state.locale, state.route);
  if (state.route === "account") {
    meta.robots = { index: false, follow: false };
  }
  return meta;
}

export default async function PublicCatchAllPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <PublicApp initialRouteState={resolveRoute(`/${(slug ?? []).join("/")}`)} />;
}
