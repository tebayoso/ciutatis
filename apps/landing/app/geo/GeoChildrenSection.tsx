"use client";

// Child-entity navigation grid shared by the geo entity pages and the claimed
// place pages (RegionPage): everything territorially inside an entity, with
// claimed members badged and load-more pagination.

import { useEffect, useState } from "react";
import { ChevronRight, Layers } from "lucide-react";

import type { Locale } from "../../lib/routes";
import { fetchGeoChildren, type GeoEntity } from "../../lib/public-search";

const copy = {
  en: { title: "Inside this territory", loadMore: "Load more", inCiutatis: "In Ciutatis", entities: "entities" },
  es: { title: "Dentro de este territorio", loadMore: "Cargar más", inCiutatis: "En Ciutatis", entities: "entidades" },
};

export default function GeoChildrenSection({
  locale,
  geoId,
  childCount,
}: {
  locale: Locale;
  geoId: string;
  childCount: number;
}) {
  const t = copy[locale];
  const [children, setChildren] = useState<GeoEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChildren([]);
    setTotal(0);
    if (childCount > 0) {
      fetchGeoChildren(geoId).then((page) => {
        if (cancelled || !page) return;
        setChildren(page.items);
        setTotal(page.total);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [geoId, childCount]);

  async function loadMore() {
    setLoading(true);
    const page = await fetchGeoChildren(geoId, { offset: children.length });
    setLoading(false);
    if (page) setChildren((prev) => [...prev, ...page.items]);
  }

  if (total === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white/80 p-6 shadow-sm sm:p-8">
      <div className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        <Layers className="h-3.5 w-3.5" />
        {t.title}
        <span className="text-[var(--muted)]">— {total} {t.entities}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <a
            key={child.id}
            href={child.pathPrefix}
            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-sm"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-[var(--ink)]">{child.name}</span>
              <span className="block truncate text-xs text-[var(--muted-strong)]">{child.jurisdictionType}</span>
            </span>
            {child.claimed ? (
              <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                {t.inCiutatis}
              </span>
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
            )}
          </a>
        ))}
      </div>
      {children.length < total ? (
        <div className="mt-6 flex justify-center">
          <button type="button" onClick={() => void loadMore()} disabled={loading} className="ghost-button disabled:opacity-50">
            {t.loadMore} ({children.length}/{total})
          </button>
        </div>
      ) : null}
    </section>
  );
}
