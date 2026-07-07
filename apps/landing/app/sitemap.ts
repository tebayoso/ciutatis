import type { MetadataRoute } from "next";
import { allRouteUrls, SITE_URL } from "../lib/site-meta";

export default function sitemap(): MetadataRoute.Sitemap {
  return allRouteUrls().map(({ url, languages }) => ({
    url,
    changeFrequency: "weekly",
    priority: url === `${SITE_URL}/` ? 1 : 0.7,
    alternates: { languages },
  }));
}
