import { useQuery } from "@tanstack/react-query";
import {
  DEMO_COLLECTION_POINTS,
  DEMO_EVENTS,
  DEMO_NOW,
  DEMO_TERRITORIES,
} from "@emergency-map/domain/demo";
import type {
  CollectionPoint,
  GeoPoint,
  PublicEvent,
  Territory,
} from "@emergency-map/domain/schemas";
import { distanceKm } from "./geo";

export type NearbyTab = "events" | "road_incidents" | "help";
export type CenterSource = "gps" | "manual";

/** Road incidents are recent citizen reports, so the tab only looks back this many days. */
export const ROAD_INCIDENT_DAYS = 7;
/**
 * A centre point counts as "inside" a district only within this distance of its centroid. Demo
 * stand-in for the API's point-in-district lookup (no boundary geometry is loaded yet).
 */
const DISTRICT_MATCH_KM = 25;

export interface NearbyDataset {
  now: Date;
  events: PublicEvent[];
  collectionPoints: CollectionPoint[];
  territories: Territory[];
}

export type NearbyRow =
  | { kind: "event"; event: PublicEvent; distanceKm: number | null; territorialMatch: boolean }
  | { kind: "help"; point: CollectionPoint; distanceKm: number };

/**
 * Data source of "Cerca de mí". Demo dataset today (same shapes as `territory.nearby`); swap the
 * queryFn for the oRPC call when the API serves seeded data.
 */
export function useNearbyDataset() {
  return useQuery({
    queryKey: ["nearby-dataset", "demo"],
    staleTime: Infinity,
    queryFn: async (): Promise<NearbyDataset> => ({
      now: DEMO_NOW,
      events: DEMO_EVENTS,
      collectionPoints: DEMO_COLLECTION_POINTS,
      territories: DEMO_TERRITORIES,
    }),
  });
}

/**
 * Mirrors the `listNearby` use case. Events with a public point get a straight-line distance;
 * events known only at district level never get one (failure 10): they appear only when the
 * centre falls in their district, flagged as a territorial match. Withdrawn points are dropped.
 */
export function computeNearby(
  data: NearbyDataset,
  center: GeoPoint,
  radiusKm: number,
  tab: NearbyTab,
): NearbyRow[] {
  if (tab === "help") {
    return data.collectionPoints
      .filter((p) => p.status !== "withdrawn")
      .map((p) => ({ kind: "help" as const, point: p, distanceKm: distanceKm(center, p.location) }))
      .filter((r) => r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  const district = data.territories
    .map((t) => ({ t, d: distanceKm(center, t.centroid) }))
    .filter((x) => x.d <= DISTRICT_MATCH_KM)
    .sort((a, b) => a.d - b.d)[0]?.t;
  const since = data.now.getTime() - ROAD_INCIDENT_DAYS * 24 * 3_600_000;

  const rows: NearbyRow[] = [];
  for (const event of data.events) {
    if (event.publicationStatus !== "published") continue;
    const road = event.category === "road_incident";
    if (tab === "road_incidents" ? !road || event.lastUpdatedAt.getTime() < since : road) continue;
    const point = event.place.point;
    if (event.place.precision === "district" || !point) {
      if (district && event.place.territory.ubigeo === district.ubigeo) {
        rows.push({ kind: "event", event, distanceKm: null, territorialMatch: true });
      }
      continue;
    }
    const d = distanceKm(center, point);
    if (d <= radiusKm) rows.push({ kind: "event", event, distanceKm: d, territorialMatch: false });
  }
  return rows.sort(
    (a, b) =>
      (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY),
  );
}
