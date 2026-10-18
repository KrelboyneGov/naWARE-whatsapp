import { implement } from "@orpc/server";
import {
  getLocalityOverview,
  getTerritory,
  listNearby,
  searchTerritories,
} from "@emergency-map/application";
import { territoryContract } from "../../contract/territory.contract";
import type { AppContext } from "../../lib/actor";
import { territoryDeps } from "../../lib/container";
import { toEnvelope } from "../../lib/result-to-orpc";

const impl = implement(territoryContract).$context<AppContext>();

export const territoryRouter = impl.router({
  search: impl.search.handler(async ({ input }) =>
    toEnvelope(await searchTerritories(territoryDeps, input)),
  ),

  get: impl.get.handler(async ({ input }) => toEnvelope(await getTerritory(territoryDeps, input))),

  overview: impl.overview.handler(async ({ input }) =>
    toEnvelope(await getLocalityOverview(territoryDeps, input)),
  ),

  nearby: impl.nearby.handler(async ({ input }) =>
    toEnvelope(await listNearby(territoryDeps, input)),
  ),
});
