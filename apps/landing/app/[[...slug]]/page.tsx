import type { Metadata } from "next";
import PublicApp from "../PublicApp";
import { allLocalizedPaths, resolveRoute } from "../../lib/routes";
import { buildMetadata, SITE_NAME } from "../../lib/site-meta";

function slugFor(path: string): string[] {
  return path.split("/").filter(Boolean);
}

// SSG params: every localized path + /en alias from the route registry, plus a
// couple of representative region pages.
const staticSlugs: string[][] = [
  ...allLocalizedPaths().map(slugFor),
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
  // Non-indexable routes (e.g. account) get robots noindex via the registry.
  return buildMetadata(state.locale, state.route);
}

export default async function PublicCatchAllPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <PublicApp initialRouteState={resolveRoute(`/${(slug ?? []).join("/")}`)} />;
}
