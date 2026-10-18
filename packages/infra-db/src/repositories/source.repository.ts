import { desc, eq } from "drizzle-orm";
import type { IDataSourceRepository } from "@emergency-map/domain/repositories";
import type { DataSource, ImportRun } from "@emergency-map/domain/schemas";
import { dataSourceTable, importRunTable } from "../schema";
import type { DatabaseClient } from "../client";
import { mapImportRunToDomain, mapSourceToDomain } from "../mappers";

export class DataSourceRepository implements IDataSourceRepository {
  constructor(private db: DatabaseClient) {}

  async list(): Promise<DataSource[]> {
    const rows = await this.db.select().from(dataSourceTable).orderBy(dataSourceTable.name);
    return rows.map(mapSourceToDomain);
  }

  async findById(id: string): Promise<DataSource | null> {
    const rows = await this.db
      .select()
      .from(dataSourceTable)
      .where(eq(dataSourceTable.id, id))
      .limit(1);
    return rows[0] ? mapSourceToDomain(rows[0]) : null;
  }

  async update(
    id: string,
    patch: Partial<Pick<DataSource, "health" | "lastPublishedAt" | "lastSuccessfulFetchAt">>,
  ): Promise<void> {
    const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    if (Object.keys(set).length === 0) return;
    await this.db.update(dataSourceTable).set(set).where(eq(dataSourceTable.id, id));
  }

  async recordRun(run: ImportRun): Promise<void> {
    await this.db.insert(importRunTable).values({
      id: run.id,
      sourceId: run.sourceId,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      status: run.status,
      processed: run.processed,
      duplicatesAvoided: run.duplicatesAvoided,
      errorSummary: run.errorSummary,
    });
  }

  async listRuns(sourceId: string, limit: number): Promise<ImportRun[]> {
    const rows = await this.db
      .select()
      .from(importRunTable)
      .where(eq(importRunTable.sourceId, sourceId))
      .orderBy(desc(importRunTable.startedAt))
      .limit(limit);
    return rows.map(mapImportRunToDomain);
  }
}
