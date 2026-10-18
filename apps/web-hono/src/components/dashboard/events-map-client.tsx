import { PERU_BOUNDS } from "@emergency-map/domain/constants";

import { CATEGORY_ICONS } from "../event/category-icon";
import { eventPoint } from "./use-dashboard-data";
import type { EventsMapProps } from "./events-map";
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Client-only part of the compact map. Imported lazily by EventsMap. */
export default function EventsMapClient({
  events,
  territories,
  selectedId,
  onSelect,
}: EventsMapProps) {
  return (
    <Map
      theme="light"
      className="size-full"
      bounds={[...PERU_BOUNDS] as [number, number, number, number]}
      fitBoundsOptions={{ padding: 16 }}
      scrollZoom={false}
    >
      <MapControls position="top-right" showZoom />
      {events.map((event) => {
        const point = eventPoint(event, territories);
        if (!point) return null;
        const Icon = CATEGORY_ICONS[event.category];
        const selected = event.id === selectedId;
        // Only an exact point is drawn solid; district centroid and approximate points are dashed.
        const exact = event.place.precision === "exact";
        return (
          <MapMarker
            key={event.id}
            longitude={point.lng}
            latitude={point.lat}
            onClick={() => onSelect(event.id)}
          >
            <MarkerContent>
              <div
                aria-label={`${CATEGORY_LABELS[event.category]}: ${event.title}`}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-[1.5px] bg-card text-foreground shadow-sm",
                  exact ? "border-solid" : "border-dashed",
                  selected
                    ? "scale-125 border-primary ring-4 ring-primary/30"
                    : "border-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="max-w-52 rounded-lg border border-border bg-card p-2 text-sm shadow-md">
                <p className="font-semibold">{event.title}</p>
                <p className="text-[13px] text-muted-foreground">
                  {event.place.territory.name}
                  {event.place.precision === "district" ? " · solo distrito" : ""}
                </p>
                {event.isDemo && <p className="text-xs font-medium text-warning">Demostración</p>}
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}
    </Map>
  );
}
