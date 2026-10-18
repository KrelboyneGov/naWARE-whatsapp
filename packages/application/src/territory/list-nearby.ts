import type { EventCategory } from "@emergency-map/domain/constants";
import { EVENT_CATEGORIES } from "@emergency-map/domain/constants";
import type { EventFilters, NearbyInput, NearbyItem } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { boundsAround, distanceKm } from "../shared/geo";
import { isCurrentPublic, toPublicEvent } from "../shared/public";
import type { UseCaseResult } from "../shared/result";
import type { TerritoryDeps } from "./deps";

const PAGE = { limit: 100, offset: 0 };

const NON_ROAD = EVENT_CATEGORIES.filter((c) => c !== "road_incident");

/**
 * "Cerca de mí". Events with a point get a straight-line distance; events known only at district
 * level get approxDistanceKm null and territorialMatch true, never an invented distance
 * (failure 10). "events" excludes road incidents, which have their own kind.
 */
export async function listNearby(
  deps: Pick<TerritoryDeps, "territories" | "events" | "collectionPoints">,
  input: NearbyInput,
): Promise<UseCaseResult<NearbyItem[]>> {
  if (input.kind === "help") {
    const rows = await deps.collectionPoints.list({ near: input.center, radiusKm: input.radiusKm });
    const items = rows
      .filter(({ point }) => point.status !== "withdrawn")
      .map(
        ({ point, distanceKm: d }): NearbyItem => ({
          kind: "collection_point",
          event: null,
          collectionPoint: point,
          approxDistanceKm: d ?? distanceKm(input.center, point.location),
          territorialMatch: false,
        }),
      )
      .filter((i) => (i.approxDistanceKm ?? 0) <= input.radiusKm)
      .sort((a, b) => (a.approxDistanceKm ?? 0) - (b.approxDistanceKm ?? 0));
    return ok(items);
  }

  const categories: EventCategory[] =
    input.kind === "road_incidents" ? ["road_incident"] : NON_ROAD;
  const base: EventFilters = { categories, dateField: "last_updated", includeDemo: true };

  const district = await deps.territories.findDistrictAt(input.center);
  const [byBounds, byDistrict] = await Promise.all([
    deps.events.listPublic(
      { ...base, bounds: boundsAround(input.center, input.radiusKm) },
      PAGE,
      "last_updated",
    ),
    district
      ? deps.events.listPublic({ ...base, ubigeo: district.ubigeo }, PAGE, "last_updated")
      : Promise.resolve({ data: [], total: 0 }),
  ]);

  const byId = new Map<string, NearbyItem & { sortKey: number }>();
  for (const event of [...byBounds.data, ...byDistrict.data]) {
    if (!isCurrentPublic(event) || byId.has(event.id)) continue;
    const place = event.currentVersion.place;
    if (place.precision === "district" || place.point === null) {
      if (district && place.territory.ubigeo === district.ubigeo) {
        byId.set(event.id, {
          kind: "event",
          event: toPublicEvent(event),
          collectionPoint: null,
          approxDistanceKm: null,
          territorialMatch: true,
          sortKey: Number.POSITIVE_INFINITY,
        });
      }
      continue;
    }
    const d = distanceKm(input.center, place.point);
    if (d > input.radiusKm) continue;
    byId.set(event.id, {
      kind: "event",
      event: toPublicEvent(event),
      collectionPoint: null,
      approxDistanceKm: d,
      territorialMatch: false,
      sortKey: d,
    });
  }

  const items = [...byId.values()]
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey: _sortKey, ...item }) => item);
  return ok(items);
}
