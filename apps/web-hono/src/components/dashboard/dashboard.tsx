import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { buttonVariants, Skeleton } from "@emergency-map/web-ui";

import { EmptyState } from "../event/empty-state";
import { EventCard } from "../event/event-card";
import { EventsMap } from "./events-map";
import { HelpTeaser } from "./help-teaser";
import { Indicators } from "./indicators";
import { LocalityBlock, districtLabel, selectClass } from "./locality-block";
import {
  DASHBOARD_PERIOD_LABEL,
  selectDashboardView,
  useDashboardSnapshot,
  type Scope,
} from "./use-dashboard-data";
import { useSavedLocality } from "./use-saved-locality";
import { NO_RESULTS_COPY } from "@/lib/labels";
import { cn } from "@/lib/utils";

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

/** Home dashboard (design doc 04, "Inicio"). Every number derives from one filtered view. */
export function Dashboard() {
  const { data: snapshot } = useDashboardSnapshot();
  const [savedUbigeo, saveUbigeo] = useSavedLocality();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scope: Scope = useMemo(() => {
    const t = snapshot?.territories.find((x) => x.ubigeo === savedUbigeo);
    return t ? { kind: "district", ubigeo: t.ubigeo, name: t.name } : { kind: "peru" };
  }, [snapshot, savedUbigeo]);

  const view = useMemo(
    () => (snapshot ? selectDashboardView(snapshot, scope) : null),
    [snapshot, scope],
  );
  const scopeLabel = scope.kind === "peru" ? "Todo Perú" : scope.name;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-heading text-[28px] font-bold leading-tight md:text-[32px]">
            Qué se ha reportado en Perú
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {scopeLabel} · {DASHBOARD_PERIOD_LABEL} · ordenado por última actualización, lo que
            puede incluir cambios en eventos más antiguos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={"/mapa" as "/"}
            className={cn(buttonVariants(), "h-11 px-5 text-sm font-semibold")}
          >
            Explorar mapa
          </Link>
          <Link
            to={"/reportar" as "/"}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 px-5 text-sm font-semibold",
            )}
          >
            Reportar un evento
          </Link>
        </div>
      </header>

      {snapshot && view ? (
        <>
          <div className="max-w-xs">
            <label htmlFor="scope-select" className="text-sm font-medium">
              Ámbito
            </label>
            <select
              id="scope-select"
              className={cn(selectClass, "mt-1")}
              value={savedUbigeo ?? ""}
              onChange={(e) => saveUbigeo(e.target.value || null)}
            >
              <option value="">Todo Perú</option>
              {snapshot.territories.map((t) => (
                <option key={t.ubigeo} value={t.ubigeo}>
                  {districtLabel(t)}
                </option>
              ))}
            </select>
          </div>

          <Indicators view={view} scopeLabel={scopeLabel} />

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="novedades" className="space-y-3">
              <h2 id="novedades" className="font-heading text-xl font-bold">
                Novedades
              </h2>
              {view.events.length === 0 ? (
                <EmptyState
                  description={NO_RESULTS_COPY}
                  action={
                    scope.kind === "district" ? (
                      <button
                        type="button"
                        onClick={() => saveUbigeo(null)}
                        className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4 text-sm")}
                      >
                        Ver todo Perú
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {view.events.map((event) => (
                    <li key={event.id}>
                      <EventCard
                        event={event}
                        now={snapshot.now}
                        selected={event.id === selectedId}
                        onSelect={(id) => setSelectedId((cur) => (cur === id ? null : id))}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <EventsMap
              events={view.events}
              territories={snapshot.territories}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <LocalityBlock
              territories={snapshot.territories}
              savedUbigeo={savedUbigeo}
              onChange={saveUbigeo}
              view={view}
            />
            <HelpTeaser view={view} snapshot={snapshot} />
          </div>
        </>
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}
