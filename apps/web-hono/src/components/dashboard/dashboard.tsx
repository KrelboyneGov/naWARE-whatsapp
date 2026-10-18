import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Map as MapIcon } from "lucide-react";
import { buttonVariants, Skeleton } from "@emergency-map/web-ui";
import type { PublicEvent } from "@emergency-map/domain/schemas";

import { EmptyState } from "../event/empty-state";
import { EventCard } from "../event/event-card";
import { EventsMap } from "./events-map";
import { HelpTeaser } from "./help-teaser";
import { Indicators } from "./indicators";
import { LocalityBlock } from "./locality-block";
import { WhatsappHero } from "./whatsapp-hero";
import {
  DASHBOARD_PERIOD_LABEL,
  selectDashboardView,
  useDashboardSnapshot,
  type Scope,
} from "./use-dashboard-data";
import { useSavedLocality } from "./use-saved-locality";
import { cn } from "@/lib/utils";

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando novedades">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

/**
 * Kind of update shown above a news card. Derived from the review state only; the public read
 * model has no change history yet, so this never claims more than the record says.
 */
function updateKind(event: PublicEvent): string {
  if (event.origin === "official") return "Actualización oficial";
  switch (event.reviewStatus) {
    case "disputed":
      return "Corrección";
    case "corroborated_by_review":
    case "officially_backed":
      return "Corroboración";
    case "with_contributions":
      return "Nueva evidencia";
    default:
      return "Nuevo reporte";
  }
}

type ScopeKind = "peru" | "local";

/** Home dashboard (design doc 04, "Inicio"). Every number derives from one filtered view. */
export function Dashboard() {
  const { data: snapshot } = useDashboardSnapshot();
  const [savedUbigeo, saveUbigeo] = useSavedLocality();
  const [scopeKind, setScopeKind] = useState<ScopeKind>("peru");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const saved = snapshot?.territories.find((x) => x.ubigeo === savedUbigeo) ?? null;
  const scope: Scope = useMemo(
    () =>
      scopeKind === "local" && saved
        ? { kind: "district", ubigeo: saved.ubigeo, name: saved.name }
        : { kind: "peru" },
    [scopeKind, saved],
  );

  const view = useMemo(
    () => (snapshot ? selectDashboardView(snapshot, scope) : null),
    [snapshot, scope],
  );
  const scopeName = scope.kind === "peru" ? "Perú" : scope.name;
  const scopeLabel = scope.kind === "peru" ? "Todo Perú" : scope.name;

  // Picking a locality from the search switches the dashboard to it.
  const onLocalityChange = (ubigeo: string | null) => {
    saveUbigeo(ubigeo);
    setScopeKind(ubigeo ? "local" : "peru");
  };

  const segment = (active: boolean) =>
    cn(
      "h-8 rounded-md px-3 text-[13px] font-medium transition-colors",
      active
        ? "bg-card text-foreground shadow-[var(--shadow-xs)]"
        : "text-[var(--text-secondary)] hover:text-foreground",
    );

  return (
    <div className="mx-auto w-full max-w-[1160px] space-y-8 px-4 py-6 md:px-10 md:py-10">
      <WhatsappHero />
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-2.5">
          <h2 className="font-heading text-[26px] leading-[1.1] font-bold text-cacao md:text-[30px]">
            Qué se ha reportado en {scopeName}
          </h2>
          <p className="text-[var(--text-secondary)]">
            Eventos publicados en los {DASHBOARD_PERIOD_LABEL}, según reportes ciudadanos y fuentes
            conectadas. La cobertura es parcial.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Ámbito"
              className="inline-flex gap-0.5 rounded-lg bg-[var(--surface-quiet)] p-0.5"
            >
              <button
                type="button"
                aria-pressed={scope.kind === "peru"}
                className={segment(scope.kind === "peru")}
                onClick={() => setScopeKind("peru")}
              >
                Todo Perú
              </button>
              {saved && (
                <button
                  type="button"
                  aria-pressed={scope.kind === "district"}
                  className={segment(scope.kind === "district")}
                  onClick={() => setScopeKind("local")}
                >
                  {saved.name} (guardada)
                </button>
              )}
            </div>
            <Link to={"/mi-localidad" as "/"} className="text-[13px] font-medium text-primary">
              {saved ? "Cambiar localidad" : "Elegir localidad"}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={"/mapa" as "/"}
            className={cn(buttonVariants(), "h-[42px] gap-2 px-4 text-[15px] font-medium")}
          >
            <MapIcon className="size-4" aria-hidden />
            Explorar mapa
          </Link>
          <Link
            to={"/reportar" as "/"}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-[42px] px-4 text-[15px] font-medium",
            )}
          >
            Reportar un evento
          </Link>
        </div>
      </header>

      {snapshot && view ? (
        <>
          <Indicators view={view} scopeLabel={scopeLabel} />

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
            <section aria-labelledby="novedades" className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="novedades" className="font-heading text-xl font-semibold tracking-tight">
                  Últimas actualizaciones
                </h2>
                <span className="text-xs text-[var(--text-secondary)]">
                  Ordenado por última actualización; puede incluir cambios en eventos antiguos ·{" "}
                  <Link to={"/eventos" as "/"} className="text-primary">
                    Ver historial
                  </Link>
                </span>
              </div>
              {view.events.length === 0 ? (
                <EmptyState
                  title="No encontramos información para esta localidad"
                  description="En las fuentes conectadas y el periodo elegido. Amplía el periodo, consulta localidades cercanas o publica un reporte. Esto no significa que no haya peligro."
                  action={
                    scope.kind === "district" ? (
                      <button
                        type="button"
                        onClick={() => setScopeKind("peru")}
                        className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4 text-sm")}
                      >
                        Ver todo Perú
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="grid gap-3">
                  {view.events.map((event) => (
                    <li key={event.id}>
                      <EventCard
                        event={event}
                        now={snapshot.now}
                        eyebrow={updateKind(event)}
                        selected={event.id === selectedId}
                        onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <aside className="grid gap-4 lg:sticky lg:top-4">
              <EventsMap
                events={view.events}
                territories={snapshot.territories}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <LocalityBlock
                territories={snapshot.territories}
                savedUbigeo={savedUbigeo}
                onChange={onLocalityChange}
                view={view}
              />
              <HelpTeaser view={view} snapshot={snapshot} />
            </aside>
          </div>
        </>
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}
