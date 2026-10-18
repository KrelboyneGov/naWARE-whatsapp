import type { Territory } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { TerritoryDeps } from "./deps";

export async function getTerritory(
  deps: Pick<TerritoryDeps, "territories">,
  input: { ubigeo: string },
): Promise<UseCaseResult<Territory>> {
  const territory = await deps.territories.findByUbigeo(input.ubigeo);
  return territory ? ok(territory) : notFound("territory", input.ubigeo);
}
