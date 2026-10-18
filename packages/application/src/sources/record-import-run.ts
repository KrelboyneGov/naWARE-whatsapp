import type { ImportRun } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { SourcesDeps } from "./deps";

export type RecordImportRunInput = Omit<ImportRun, "id">;

/**
 * Internal. Stores the run and updates the source's health. Only a success or partial run moves
 * lastSuccessfulFetchAt; a failure leaves it (and the previous data) untouched.
 */
export async function recordImportRun(
  deps: Pick<SourcesDeps, "dataSources" | "ids">,
  input: RecordImportRunInput,
): Promise<UseCaseResult<ImportRun>> {
  const source = await deps.dataSources.findById(input.sourceId);
  if (!source) return notFound("data_source", input.sourceId);

  const run: ImportRun = { ...input, id: deps.ids.next("run") };
  await deps.dataSources.recordRun(run);

  if (run.status === "failed") {
    await deps.dataSources.update(source.id, { health: "error" });
  } else {
    await deps.dataSources.update(source.id, {
      health: run.status === "success" ? "up_to_date" : "delayed",
      lastSuccessfulFetchAt: run.finishedAt ?? run.startedAt,
    });
  }
  return ok(run);
}
