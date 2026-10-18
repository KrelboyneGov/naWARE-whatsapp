import type { CollectionPoint, ListCollectionPointsInput } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import type { HelpDeps } from "./deps";

/** A withdrawn point is never listed (failure 8), even if the repository returns it. */
export async function listCollectionPoints(
  deps: Pick<HelpDeps, "collectionPoints">,
  input: ListCollectionPointsInput,
): Promise<UseCaseResult<{ point: CollectionPoint; distanceKm: number | null }[]>> {
  const rows = await deps.collectionPoints.list(input);
  return ok(rows.filter(({ point }) => point.status !== "withdrawn"));
}
