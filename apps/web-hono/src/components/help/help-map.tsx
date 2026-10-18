/** Client-only map of /ayudar. Loaded lazily so MapLibre never runs on the server. */
import { useMemo } from "react";
import { HandHelping } from "lucide-react";
import { PERU_BOUNDS } from "@emergency-map/domain/constants";
import type { CollectionPoint } from "@emergency-map/domain/schemas";
import {
  Map as MapCanvas,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from "@/components/ui/map";
import { cn } from "@/lib/utils";
import { isPointOperating, territoryLabel } from "./help-data";

export interface HelpMapProps {
  points: CollectionPoint[];
  centroids: Record<string, { lat: number; lng: number }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function HelpMap({ points, centroids, selectedId, onSelect }: HelpMapProps) {
  const destinations = useMemo(() => {
    const seen = new Map<string, { lat: number; lng: number; name: string }>();
    for (const p of points) {
      for (const t of p.destinationTerritories) {
        const c = centroids[t.ubigeo];
        if (c) seen.set(t.ubigeo, { ...c, name: territoryLabel(t) });
      }
    }
    return [...seen.entries()];
  }, [points, centroids]);

  const links = useMemo<GeoJSON.Feature>(
    () => ({
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: points.flatMap((p) =>
          p.destinationTerritories.flatMap((t) => {
            const c = centroids[t.ubigeo];
            return c
              ? [
                  [
                    [p.location.lng, p.location.lat],
                    [c.lng, c.lat],
                  ],
                ]
              : [];
          }),
        ),
      },
    }),
    [points, centroids],
  );

  return (
    <MapCanvas
      theme="light"
      bounds={PERU_BOUNDS as unknown as [number, number, number, number]}
      fitBoundsOptions={{ padding: 40 }}
      className="h-full w-full"
    >
      <MapControls position="bottom-right" showZoom />
      <MapGeoJSON
        id="help-links"
        data={links}
        fillPaint={false}
        linePaint={{ "line-color": "#087F75", "line-width": 1, "line-dasharray": [2, 3] }}
      />
      {destinations.map(([ubigeo, d]) => (
        <MapMarker key={ubigeo} longitude={d.lng} latitude={d.lat}>
          <MarkerContent>
            <span
              role="img"
              aria-label={`Localidad destinataria: ${d.name}`}
              className="block size-7 rounded-full border-[1.5px] border-dashed border-help bg-help/10"
            />
          </MarkerContent>
          <MarkerTooltip>
            <span className="text-xs">Localidad destinataria: {d.name}</span>
          </MarkerTooltip>
        </MapMarker>
      ))}
      {points.map((p) => (
        <MapMarker
          key={p.id}
          longitude={p.location.lng}
          latitude={p.location.lat}
          onClick={() => onSelect(p.id)}
        >
          <MarkerContent>
            <button
              type="button"
              aria-label={p.name}
              className="flex size-11 cursor-pointer items-center justify-center bg-transparent p-0"
            >
              <span
                className={cn(
                  "flex size-[30px] items-center justify-center rounded-lg border-[1.5px] border-help bg-help-quiet text-help shadow-sm",
                  !isPointOperating(p) && "opacity-60",
                  selectedId === p.id && "ring-2 ring-[color:var(--accent-primary)]",
                )}
              >
                <HandHelping className="size-4" aria-hidden />
              </span>
            </button>
          </MarkerContent>
          <MarkerTooltip>
            <span className="text-xs">Punto de recepción: {p.name}</span>
          </MarkerTooltip>
        </MapMarker>
      ))}
    </MapCanvas>
  );
}
