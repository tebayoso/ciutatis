import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Loader2, Search } from "lucide-react";
import type { PublicInstitutionSummary } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}

export function InstitutionSearch() {
  const [institutions, setInstitutions] = useState<PublicInstitutionSummary[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInstitutions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/public/institutions", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load institutions.");
        }

        const data = (await response.json()) as PublicInstitutionSummary[];

        if (!controller.signal.aborted) {
          setInstitutions(Array.isArray(data) ? data : []);
        }
      } catch (fetchError) {
        if (controller.signal.aborted) return;

        setError(fetchError instanceof Error ? fetchError.message : "Failed to load institutions.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadInstitutions();

    return () => controller.abort();
  }, []);

  const filteredInstitutions = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();
    if (!normalizedQuery) return institutions;

    return institutions.filter((institution) => institution.name.toLowerCase().includes(normalizedQuery));
  }, [debouncedQuery, institutions]);

  return (
    <section data-testid="institution-search" className="w-full">
      <Card className="rounded-3xl border-slate-200/80 bg-white/95 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Public institutions
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">Search by institution name</h2>
            <p className="text-sm leading-6 text-slate-600">
              Find a public portal and open it directly.
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              data-testid="institution-search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search institutions"
              className="h-11 pl-9"
            />
          </div>
        </div>

        <ul
          data-testid="institution-search-results"
          className="mt-5 grid gap-3"
          aria-live="polite"
        >
          {isLoading ? (
            <li className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading institutions…
            </li>
          ) : error ? (
            <li className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
              {error}
            </li>
          ) : filteredInstitutions.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              No institutions found.
            </li>
          ) : (
            filteredInstitutions.map((institution) => (
              <li key={institution.id}>
                <Link
                  to={`/portal/${institution.slug}`}
                  className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
                      <h3 className="truncate text-sm font-semibold text-slate-950">
                        {institution.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {institution.description ?? "No description available."}
                    </p>
                  </div>

                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                </Link>
              </li>
            ))
          )}
        </ul>
      </Card>
    </section>
  );
}
