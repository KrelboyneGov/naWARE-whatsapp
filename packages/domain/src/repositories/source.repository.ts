import type { DataSource, ImportRun } from "../schemas/source";

export interface IDataSourceRepository {
  list(): Promise<DataSource[]>;
  findById(id: string): Promise<DataSource | null>;
  update(
    id: string,
    patch: Partial<Pick<DataSource, "health" | "lastPublishedAt" | "lastSuccessfulFetchAt">>,
  ): Promise<void>;
  recordRun(run: ImportRun): Promise<void>;
  listRuns(sourceId: string, limit: number): Promise<ImportRun[]>;
}
