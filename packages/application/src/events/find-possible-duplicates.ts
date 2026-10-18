import {
  DUPLICATE_MAX_SUGGESTIONS,
  DUPLICATE_SEARCH_HOURS,
  DUPLICATE_SEARCH_RADIUS_KM,
} from "@emergency-map/domain/constants";
import type { DuplicateCandidate, FindDuplicatesInput } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { isCurrentPublic, toPublicEvent } from "../shared/public";
import type { UseCaseResult } from "../shared/result";
import type { EventsDeps } from "./deps";

const HOUR_MS = 3_600_000;

/**
 * Up to 3 published events of the same category near the report in space and time. The
 * distance is null whenever either side has only district precision (failure 10).
 */
export async function findPossibleDuplicates(
  deps: Pick<EventsDeps, "events">,
  input: FindDuplicatesInput,
): Promise<UseCaseResult<DuplicateCandidate[]>> {
  const windowMs = DUPLICATE_SEARCH_HOURS * HOUR_MS;
  const start = input.occurredAt.start.getTime();

  const found = await deps.events.findCandidates({
    category: input.category,
    point: input.place.precision === "district" ? null : input.place.point,
    ubigeo: input.place.territory.ubigeo,
    from: new Date(start - windowMs),
    to: new Date(start + windowMs),
    radiusKm: DUPLICATE_SEARCH_RADIUS_KM,
    limit: DUPLICATE_MAX_SUGGESTIONS * 3,
  });

  const candidates = found
    .filter(
      ({ event }) => isCurrentPublic(event) && event.currentVersion.category === input.category,
    )
    .map(({ event, distanceKm }): DuplicateCandidate => {
      const districtOnly =
        input.place.precision === "district" || event.currentVersion.place.precision === "district";
      return {
        event: toPublicEvent(event),
        approxDistanceKm: districtOnly ? null : distanceKm,
        hoursApart: Math.abs(event.currentVersion.occurredAt.start.getTime() - start) / HOUR_MS,
      };
    })
    .sort((a, b) => a.hoursApart - b.hoursApart)
    .slice(0, DUPLICATE_MAX_SUGGESTIONS);

  return ok(candidates);
}
