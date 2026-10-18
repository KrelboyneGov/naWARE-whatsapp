/**
 * Client-only locator map for the event page (not interactive). Loaded lazily so MapLibre never
 * runs on the server. Precision rules: an exact point is a marker; an approximate point is a
 * marker plus a dashed uncertainty circle; a district-only event has NO marker, only a dashed
 * circle around the district centroid, so a point is never invented.
 */
import { useMemo } from "react";
import type { LocationPrecision } from "@emergency-map/domain/constants";
import { Map as MapCanvas, MapGeoJSON, MapMarker, MarkerContent } from "@/components/ui/map";

interface Props {
  precision: LocationPrecision;
  point: { lat: number; lng: number } | null;
  /** District centroid, used to frame the map when there is no public point. */
  centroid: { lat: number; lng: number } | null;
}

const RADIUS_KM: Record<LocationPrecision, number> = { exact: 0, approximate: 1.2, district: 4 };

function circle(center: { lat: number; lng: number }, km: number) {
  const ring: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    ring.push([
      center.lng + ((km / 111) * Math.cos(a)) / Math.cos((center.lat * Math.PI) / 180),
      center.lat + (km / 111) * Math.sin(a),
    ]);
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [ring] },
  };
}

export default function EventLocationMap({ precision, point, centroid }: Props) {
  const center = point ?? centroid;
  const area = useMemo(
    () => (center && precision !== "exact" ? circle(center, RADIUS_KM[precision]) : null),
    [center, precision],
  );
  if (!center) return null;
  return (
    <MapCanvas
      center={[center.lng, center.lat]}
      zoom={precision === "district" ? 10 : 13}
      interactive={false}
      attributionControl={false}
      className="h-full w-full"
    >
      {area && (
        <MapGeoJSON
          id="uncertainty"
          data={area}
          fillPaint={{ "fill-color": "#175CD3", "fill-opacity": 0.1 }}
          linePaint={{ "line-color": "#175CD3", "line-width": 1.5, "line-dasharray": [2, 2] }}
        />
      )}
      {point && (
        <MapMarker longitude={point.lng} latitude={point.lat}>
          <MarkerContent>
            <span
              aria-hidden
              className="block size-6 rounded-full border-2 bg-white shadow-[0_0_0_3px_#175CD3]"
              style={{
                borderStyle: precision === "exact" ? "solid" : "dashed",
                borderColor: "#111",
              }}
            />
          </MarkerContent>
        </MapMarker>
      )}
    </MapCanvas>
  );
}
