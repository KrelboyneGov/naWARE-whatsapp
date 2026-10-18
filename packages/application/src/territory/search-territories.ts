import type { SearchTerritoriesInput, Territory } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import type { TerritoryDeps } from "./deps";

export async function searchTerritories(
  deps: Pick<TerritoryDeps, "territories">,
  input: SearchTerritoriesInput,
): Promise<UseCaseResult<Territory[]>> {
  return ok(await deps.territories.search(input.query.trim(), input.level, input.limit));
}
