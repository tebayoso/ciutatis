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

// Entity metadata from the geo reference layer, fetched server-side (region
// pages render dynamically on the worker; the two SSG samples fetch at build).
async function geoMetadata(path: string): Promise<Metadata | null> {
  try {
    const base = process.env.API_INTERNAL_BASE || "https://admin.ciutatis.com";
    const response = await fetch(`${base}/api/public/geo/by-path?path=${encodeURIComponent(path)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const entity = (await response.json()) as {
      name: string;
      jurisdictionType: string;
      parents: { name: string }[];
      childCount: number;
    };
    const chain = [...entity.parents.map((p) => p.name)].reverse().join(", ");
    return {
      title: `${entity.name} — ${entity.jurisdictionType}${chain ? ` (${chain})` : ""}`,
      description: `${entity.name} on the Ciutatis civic map: administrative boundaries, hierarchy${
        entity.childCount > 0 ? `, ${entity.childCount} contained territories` : ""
      }, public requests and open civic data.`,
      alternates: { canonical: path },
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const state = resolveRoute(`/${(slug ?? []).join("/")}`);
  if (state.route === "region") {
    const geo = state.regionPath ? await geoMetadata(state.regionPath) : null;
    if (geo) return geo;
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
