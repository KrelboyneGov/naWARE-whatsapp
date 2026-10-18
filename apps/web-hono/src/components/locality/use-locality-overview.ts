import { useQuery } from "@tanstack/react-query";
import {
  DEMO_EVENTS,
  DEMO_NEEDS,
  DEMO_NOTICES,
  DEMO_NOW,
  DEMO_ORGANIZATIONS,
  DEMO_TERRITORIES,
} from "@emergency-map/domain/demo";
import type { LocalityOverview, Territory } from "@emergency-map/domain/schemas";
import { distanceKm } from "@/components/nearby/geo";

/** Radius of "En localidades cercanas", in km, from the district centroid. */
export const NEAR_LOCALITY_RADIUS_KM = 60;
/** Window for citizen reports and nearby events, in days back from "now". */
export const LOCALITY_PERIOD_DAYS = 30;

export interface LocalitySnapshot {
  now: Date;
  territories: Territory[];
}

/** District list for the picker. Demo data today; the API has `territory.search` for later. */
export function useTerritories() {
  return useQuery({
    queryKey: ["territories", "demo"],
    queryFn: async (): Promise<LocalitySnapshot> => ({
      now: DEMO_NOW,
      territories: DEMO_TERRITORIES,
    }),
    staleTime: Infinity,
  });
}

/**
 * Demo-backed equivalent of `territory.overview` (same `LocalityOverview` shape). Mirrors the
 * application use case: events inside the district and nearby ones are disjoint, only current
 * published events are listed, and `noInformation` is never "safe".
 */
function buildOverview(territory: Territory): LocalityOverview {
  const since = DEMO_NOW.getTime() - LOCALITY_PERIOD_DAYS * 24 * 3_600_000;
  const published = DEMO_EVENTS.filter(
    (e) => e.publicationStatus === "published" && e.lastUpdatedAt.getTime() >= since,
  );
  const inside = published.filter(
    (e) => e.origin !== "official" && e.place.territory.ubigeo === territory.ubigeo,
  );
  const insideIds = new Set(inside.map((e) => e.id));
  // Events known only at district level have no point: they never get a distance, so they
  // cannot be placed "within N km" and are left out of the nearby list.
  const nearbyEvents = published.filter(
    (e) =>
      !insideIds.has(e.id) &&
      e.origin !== "official" &&
      e.place.point !== null &&
      e.place.territory.ubigeo !== territory.ubigeo &&
      distanceKm(territory.centroid, e.place.point) < NEAR_LOCALITY_RADIUS_KM,
  );
  const notices = DEMO_NOTICES.filter(
    (n) =>
      n.validity === "active" &&
      !(n.validTo && n.validTo < DEMO_NOW) &&
      n.territories.some((t) => territory.ubigeo.startsWith(t.ubigeo)),
  ).map((n) => ({
    ...n,
    partialOverlap: !n.territories.some((t) => t.ubigeo === territory.ubigeo),
  }));
  const organizations = DEMO_ORGANIZATIONS.filter((o) =>
    o.coverage.some((c) => territory.ubigeo.startsWith(c.ubigeo)),
  );
  const needs = DEMO_NEEDS.filter(
    (n) =>
      (n.status === "open" || n.status === "paused") &&
      !(n.deadline && n.deadline < DEMO_NOW) &&
      territory.ubigeo.startsWith(n.destinationTerritory.ubigeo),
  );
  return {
    territory,
    notices,
    events: inside,
    nearbyEvents,
    organizations,
    needs,
    noInformation:
      notices.length + inside.length + nearbyEvents.length + organizations.length + needs.length ===
      0,
  };
}

export function useLocalityOverview(ubigeo: string | null) {
  return useQuery({
    queryKey: ["locality-overview", "demo", ubigeo],
    enabled: !!ubigeo,
    staleTime: Infinity,
    queryFn: async (): Promise<LocalityOverview> => {
      const territory = DEMO_TERRITORIES.find((t) => t.ubigeo === ubigeo);
      if (!territory) throw new Error("territory-not-found");
      return buildOverview(territory);
    },
  });
}
