/** Client-only map for /cerca. Imported lazily so MapLibre never runs on the server. */
import { useEffect, useRef } from "react";
import { HandHelping } from "lucide-react";
import { PERU_BOUNDS } from "@emergency-map/domain/constants";
import type { GeoPoint } from "@emergency-map/domain/schemas";
import {
  Map as MapCanvas,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  useMap,
} from "@/components/ui/map";
import { CATEGORY_ICONS } from "@/components/event";
import { CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { circlePolygon } from "./geo";
import type { NearbyRow } from "./use-nearby";

export interface NearbyMapProps {
  center: GeoPoint | null;
  radiusKm: number;
  rows: NearbyRow[];
  pending: GeoPoint | null;
  /** Fly here (e.g. "Elegir un punto"); changes with `key` so the same target can repeat. */
  focus: { lat: number; lng: number; zoom: number; key: number } | null;
  onPick: (p: GeoPoint) => void;
  onTilesFailed: () => void;
}

function Effects({
  center,
  radiusKm,
  focus,
  onPick,
  onTilesFailed,
}: Pick<NearbyMapProps, "center" | "radiusKm" | "focus" | "onPick" | "onTilesFailed">) {
  const { map } = useMap();
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const failRef = useRef(onTilesFailed);
  failRef.current = onTilesFailed;

  useEffect(() => {
    if (!map) return;
    let errors = 0;
    const onClick = (e: { lngLat: { lat: number; lng: number } }) =>
      pickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    const onError = () => {
      errors += 1;
      if (errors >= 3 || !map.isStyleLoaded()) failRef.current();
    };
    map.on("click", onClick);
    map.on("error", onError);
    return () => {
      map.off("click", onClick);
      map.off("error", onError);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !focus) return;
    map.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom, duration: 800 });
  }, [map, focus]);

  useEffect(() => {
    if (!map) return;
    if (!center) {
      map.fitBounds(PERU_BOUNDS as unknown as [number, number, number, number], {
        padding: 24,
        duration: 600,
      });
      return;
    }
    const ring = circlePolygon(center, radiusKm).geometry.coordinates[0] ?? [];
    const lngs = ring.map((c) => c[0] ?? 0);
    const lats = ring.map((c) => c[1] ?? 0);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: 60,
        duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 600,
      },
    );
  }, [map, center, radiusKm]);

  return null;
}

export default function NearbyMap({
  center,
  radiusKm,
  rows,
  pending,
  focus,
  onPick,
  onTilesFailed,
}: NearbyMapProps) {
  return (
    <MapCanvas
      theme="light"
      bounds={PERU_BOUNDS as unknown as [number, number, number, number]}
      fitBoundsOptions={{ padding: 24 }}
      className="h-full w-full"
    >
      <Effects
        center={center}
        radiusKm={radiusKm}
        focus={focus}
        onPick={onPick}
        onTilesFailed={onTilesFailed}
      />
      <MapControls position="bottom-right" showZoom />

      {center && (
        <>
          <MapGeoJSON
            id="search-area"
            data={circlePolygon(center, radiusKm)}
            fillPaint={{ "fill-color": "#175CD3", "fill-opacity": 0.08 }}
            linePaint={{ "line-color": "#175CD3", "line-width": 1.5 }}
          />
          <MapMarker longitude={center.lng} latitude={center.lat}>
            <MarkerContent>
              <span
                role="img"
                aria-label="Tu punto de búsqueda"
                className="block size-4 rounded-full border-[3px] border-white bg-primary shadow ring-[1.5px] ring-primary"
              />
            </MarkerContent>
          </MapMarker>
        </>
      )}

      {pending && (
        <MapMarker longitude={pending.lng} latitude={pending.lat}>
          <MarkerContent>
            <span
              role="img"
              aria-label="Punto propuesto"
              className="block size-4 rounded-full border-2 border-dashed border-primary bg-white"
            />
          </MarkerContent>
        </MapMarker>
      )}

      {rows.map((r) => {
        if (r.kind === "help") {
          return (
            <MapMarker
              key={r.point.id}
              longitude={r.point.location.lng}
              latitude={r.point.location.lat}
            >
              <MarkerContent>
                <div
                  role="img"
                  aria-label={`Punto de acopio: ${r.point.name}`}
                  className="flex size-7 items-center justify-center rounded-md border-2 border-white bg-emerald-600 text-white shadow-md"
                >
                  <HandHelping className="size-4" aria-hidden />
                </div>
              </MarkerContent>
              <MarkerTooltip>
                <span className="text-xs">
                  Punto de acopio: {r.point.name} (no es una emergencia)
                </span>
              </MarkerTooltip>
            </MapMarker>
          );
        }
        const point = r.event.place.point;
        if (!point) return null; // district precision: never invent a point
        const Icon = CATEGORY_ICONS[r.event.category];
        return (
          <MapMarker key={r.event.id} longitude={point.lng} latitude={point.lat}>
            <MarkerContent>
              <div
                role="img"
                aria-label={`${CATEGORY_LABELS[r.event.category]}: ${r.event.title}`}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 bg-white text-foreground shadow",
                  r.event.place.precision === "exact"
                    ? "border-foreground"
                    : "border-dashed border-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </div>
            </MarkerContent>
            <MarkerTooltip>
              <span className="text-xs">{r.event.title}</span>
            </MarkerTooltip>
          </MapMarker>
        );
      })}
    </MapCanvas>
  );
}
