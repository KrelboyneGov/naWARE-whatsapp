import { Suspense, lazy, useEffect, useState } from "react";
import type { PublicEvent, Territory } from "@emergency-map/domain/schemas";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@emergency-map/web-ui";

export interface EventsMapProps {
  events: PublicEvent[];
  territories: Territory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// maplibre-gl touches `window`, so the map module is loaded only in the browser.
const EventsMapClient = lazy(() => import("./events-map-client"));

function MapSkeleton() {
  return <Skeleton className="h-full min-h-80 w-full rounded-xl" />;
}

/** Compact Peru map with one marker per listed event. Renders a skeleton on the server. */
export function EventsMap(props: EventsMapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-card">
      <div
        className="h-80 bg-[var(--surface-secondary)]"
        role="region"
        aria-label="Mapa compacto de los eventos de la lista"
      >
        {mounted ? (
          <Suspense fallback={<MapSkeleton />}>
            <EventsMapClient {...props} />
          </Suspense>
        ) : (
          <MapSkeleton />
        )}
      </div>
      <div className="flex justify-between gap-2 px-3.5 py-2.5 text-xs text-[var(--text-secondary)]">
        <span>Mismo subconjunto que la lista · {props.events.length} eventos</span>
        <Link to={"/mapa" as "/"} className="text-primary">
          Abrir mapa completo
        </Link>
      </div>
    </div>
  );
}
