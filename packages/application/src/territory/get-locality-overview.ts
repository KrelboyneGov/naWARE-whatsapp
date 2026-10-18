import type { EventFilters, LocalityOverview } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { isCurrentPublic, toPublicEvent } from "../shared/public";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { TerritoryDeps } from "./deps";

const NEIGHBOURS = 5;
const PAGE = { limit: 50, offset: 0 };

const filtersFor = (ubigeo: string): EventFilters => ({
  ubigeo,
  dateField: "last_updated",
  includeDemo: true,
});

/**
 * Everything known about one district. Events inside the district and events in neighbouring
 * districts are kept apart (failure 5 counts nothing twice). `noInformation` is true only when
 * nothing at all was found, and it never means "safe" (failure 9).
 */
export async function getLocalityOverview(
  deps: TerritoryDeps,
  input: { ubigeo: string },
): Promise<UseCaseResult<LocalityOverview>> {
  const territory = await deps.territories.findByUbigeo(input.ubigeo);
  if (!territory) return notFound("territory", input.ubigeo);
  const now = deps.clock.now();

  const [noticeRows, inside, neighbours, organizations, needs] = await Promise.all([
    deps.notices.findIntersectingTerritory(input.ubigeo, { includeExpired: false }),
    deps.events.listPublic(filtersFor(input.ubigeo), PAGE, "last_updated"),
    deps.territories.findNeighbours(input.ubigeo, NEIGHBOURS),
    deps.organizations.listCoveringTerritory(input.ubigeo),
    deps.needs.list({ ubigeo: input.ubigeo, onlyActive: true }, now),
  ]);

  // Validity is recomputed from validTo so a stale stored value cannot show an expired notice.
  const notices = noticeRows
    .filter(
      ({ notice }) => notice.validity === "active" && !(notice.validTo && notice.validTo < now),
    )
    .map(({ notice, partialOverlap }) => ({ ...notice, partialOverlap }));

  const insideEvents = inside.data.filter(isCurrentPublic);
  const insideIds = new Set(insideEvents.map((e) => e.id));

  const nearbyById = new Map<string, (typeof insideEvents)[number]>();
  for (const n of neighbours) {
    const page = await deps.events.listPublic(filtersFor(n.ubigeo), PAGE, "last_updated");
    for (const e of page.data) {
      if (isCurrentPublic(e) && !insideIds.has(e.id)) nearbyById.set(e.id, e);
    }
  }
  const nearbyEvents = [...nearbyById.values()].map(toPublicEvent);

  const activeNeeds = needs.filter(
    (n) => (n.status === "open" || n.status === "paused") && !(n.deadline && n.deadline < now),
  );

  return ok({
    territory,
    notices,
    events: insideEvents.map(toPublicEvent),
    nearbyEvents,
    organizations,
    needs: activeNeeds,
    noInformation:
      notices.length === 0 &&
      insideEvents.length === 0 &&
      nearbyEvents.length === 0 &&
      organizations.length === 0 &&
      activeNeeds.length === 0,
  });
}
