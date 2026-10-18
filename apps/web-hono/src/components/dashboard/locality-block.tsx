import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Locate, MapPin, Search } from "lucide-react";
import type { Territory } from "@emergency-map/domain/schemas";
import { Input } from "@emergency-map/web-ui";

import type { DashboardView } from "./use-dashboard-data";
import { searchTerritories, territoryLabel } from "@/lib/map-filters";

export const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary";

export function districtLabel(t: Territory) {
  return t.name === t.departmentName ? t.name : `${t.name}, ${t.departmentName}`;
}

/**
 * "Elige una localidad": search a district without an account; the choice lives in localStorage.
 * Props are kept from the earlier select-based version (`view` is no longer used).
 */
export function LocalityBlock({
  territories,
  savedUbigeo,
  onChange,
}: {
  territories: Territory[];
  savedUbigeo: string | null;
  onChange: (ubigeo: string | null) => void;
  view?: DashboardView;
}) {
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => searchTerritories(territories, query, 6), [territories, query]);
  const saved = territories.find((t) => t.ubigeo === savedUbigeo) ?? null;

  return (
    <section
      className="grid gap-2.5 rounded-xl border border-[var(--border-subtle)] bg-card p-4"
      aria-labelledby="mi-localidad"
    >
      <h2 id="mi-localidad" className="text-[15px] font-semibold">
        Elige una localidad para seguir sus novedades
      </h2>
      <p className="text-[13px] text-[var(--text-secondary)]">
        Se guarda en este dispositivo. No hace falta cuenta ni GPS.
        {saved && (
          <>
            {" "}
            Guardada: <strong className="text-foreground">{territoryLabel(saved)}</strong>.{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => onChange(null)}
            >
              Quitar
            </button>
          </>
        )}
      </p>
      <div className="relative">
        <label htmlFor="locality-search" className="sr-only">
          Buscar distrito o provincia
        </label>
        <Search
          className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="locality-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar distrito o provincia"
          className="pl-8"
          autoComplete="off"
        />
        {query.trim().length >= 2 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-popover shadow-md">
            {suggestions.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                No encontramos esa localidad en los datos de demostración.
              </li>
            )}
            {suggestions.map((t) => (
              <li key={t.ubigeo}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--surface-hover)]"
                  onClick={() => {
                    onChange(t.ubigeo);
                    setQuery("");
                  }}
                >
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Distrito · {t.provinceName} · {t.departmentName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-3 text-[13px] font-medium">
        <Link to={"/mi-localidad" as "/"} className="inline-flex items-center gap-1.5 text-primary">
          <MapPin className="size-3.5" aria-hidden /> Mi localidad
        </Link>
        <Link to={"/cerca" as "/"} className="inline-flex items-center gap-1.5 text-primary">
          <Locate className="size-3.5" aria-hidden /> Cerca de mí
        </Link>
      </div>
    </section>
  );
}
