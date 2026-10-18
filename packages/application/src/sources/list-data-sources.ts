import type { DataSource } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import type { SourcesDeps } from "./deps";

/** Public status of every source. Technical health, not a statement about the phenomenon. */
export async function listDataSources(
  deps: Pick<SourcesDeps, "dataSources">,
): Promise<UseCaseResult<DataSource[]>> {
  return ok(await deps.dataSources.list());
}
