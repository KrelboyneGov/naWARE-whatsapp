import { Link } from "@tanstack/react-router";
import type { Territory } from "@emergency-map/domain/schemas";

import type { DashboardView } from "./use-dashboard-data";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@emergency-map/web-ui";

export const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary";

export function districtLabel(t: Territory) {
  return t.name === t.departmentName ? t.name : `${t.name}, ${t.departmentName}`;
}

/** "Mi localidad": pick a district without an account; the choice lives in localStorage. */
export function LocalityBlock({
  territories,
  savedUbigeo,
  onChange,
  view,
}: {
  territories: Territory[];
  savedUbigeo: string | null;
  onChange: (ubigeo: string | null) => void;
  view: DashboardView;
}) {
  const saved = territories.find((t) => t.ubigeo === savedUbigeo) ?? null;
  return (
    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="mi-localidad">
      <h2 id="mi-localidad" className="font-heading text-xl font-bold">
        Mi localidad
      </h2>
      {saved ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Qué se ha publicado en <strong className="text-foreground">{saved.name}</strong> (
            {saved.departmentName}), en los últimos 7 días:
          </p>
          <ul className="tabular mt-3 space-y-1 text-sm">
            <li>{view.events.length} eventos publicados</li>
            <li>{view.activeNotices.length} avisos oficiales vigentes</li>
            <li>{view.openNeeds.length} necesidades abiertas</li>
          </ul>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Cero resultados no significa que no haya peligro: solo cubrimos las fuentes conectadas.
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Elige una localidad para seguir sus novedades. No necesitas una cuenta; la guardamos solo
          en este navegador.
        </p>
      )}
      <label htmlFor="locality-select" className="mt-4 block text-sm font-medium">
        Distrito
      </label>
      <select
        id="locality-select"
        className={cn(selectClass, "mt-1")}
        value={savedUbigeo ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Todo Perú</option>
        {territories.map((t) => (
          <option key={t.ubigeo} value={t.ubigeo}>
            {districtLabel(t)}
          </option>
        ))}
      </select>
      {saved && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={"/mapa" as "/"}
            className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4 text-sm")}
          >
            Ver en mapa
          </Link>
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cn(buttonVariants({ variant: "ghost" }), "h-10 px-4 text-sm")}
          >
            Quitar localidad
          </button>
        </div>
      )}
    </section>
  );
}
