import type { GeoPoint } from "@emergency-map/domain/schemas";

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line (great-circle) distance in km. Not a travel distance. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** GeoJSON polygon approximating a circle of `km` around `center` (search area only). */
export function circlePolygon(center: GeoPoint, km: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const steps = 72;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    coords.push([
      center.lng + ((km / 111) * Math.cos(a)) / Math.cos(rad(center.lat)),
      center.lat + (km / 111) * Math.sin(a),
    ]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}
