import type { GeoPoint } from "@emergency-map/domain/schemas";

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Straight-line distance in kilometres (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Bounding box [west, south, east, north] around a point; a cheap pre-filter, not a distance. */
export function boundsAround(center: GeoPoint, radiusKm: number): [number, number, number, number] {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(Math.cos(rad(center.lat)), 0.01));
  return [center.lng - dLng, center.lat - dLat, center.lng + dLng, center.lat + dLat];
}
