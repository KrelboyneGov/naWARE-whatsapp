import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { ITerritoryRepository } from "@emergency-map/domain/repositories";
import type { GeoPoint, Territory } from "@emergency-map/domain/schemas";
import { territoryTable } from "../schema";
import type { DatabaseClient } from "../client";
import { mapTerritoryToDomain, territorySelection } from "../mappers";
import { pointSql } from "../utils/postgis";
import { escapeLike, fold, foldValue } from "./sql-helpers";

const t = territoryTable;

export class TerritoryRepository implements ITerritoryRepository {
  constructor(private db: DatabaseClient) {}

  async findByUbigeo(ubigeo: string): Promise<Territory | null> {
    const rows = await this.db
      .select(territorySelection)
      .from(t)
      .where(eq(t.ubigeo, ubigeo))
      .limit(1);
    return rows[0] ? mapTerritoryToDomain(rows[0]) : null;
  }

  async search(
    query: string,
    level: Territory["level"] | undefined,
    limit: number,
  ): Promise<Territory[]> {
    const needle = escapeLike(foldValue(query.trim()));
    const rows = await this.db
      .select(territorySelection)
      .from(t)
      .where(
        and(
          sql`(${fold(t.name)} LIKE ${"%" + needle + "%"} OR ${fold(t.provinceName)} LIKE ${"%" + needle + "%"} OR ${fold(t.departmentName)} LIKE ${"%" + needle + "%"})`,
          level ? eq(t.level, level) : undefined,
        ),
      )
      .orderBy(sql`CASE WHEN ${fold(t.name)} LIKE ${needle + "%"} THEN 0 ELSE 1 END`, asc(t.name))
      .limit(limit);
    return rows.map(mapTerritoryToDomain);
  }

  async findDistrictAt(point: GeoPoint): Promise<Territory | null> {
    const pt = pointSql(point);
    // Exact containment when a boundary is loaded.
    const inside = await this.db
      .select(territorySelection)
      .from(t)
      .where(
        and(
          eq(t.level, "district"),
          sql`${t.geometry} IS NOT NULL`,
          sql`ST_Contains(${t.geometry}, ${pt})`,
        ),
      )
      .limit(1);
    if (inside[0]) return mapTerritoryToDomain(inside[0]);

    // Fallback: nearest district centroid.
    const nearest = await this.db
      .select(territorySelection)
      .from(t)
      .where(eq(t.level, "district"))
      .orderBy(sql`${t.centroid}::geography <-> ${pt}::geography`)
      .limit(1);
    return nearest[0] ? mapTerritoryToDomain(nearest[0]) : null;
  }

  async findNeighbours(ubigeo: string, limit: number): Promise<Territory[]> {
    const origin = sql`(SELECT ${t.centroid} FROM ${t} WHERE ${t.ubigeo} = ${ubigeo})`;
    const self = await this.db
      .select({ level: t.level })
      .from(t)
      .where(eq(t.ubigeo, ubigeo))
      .limit(1);
    if (!self[0]) return [];
    const rows = await this.db
      .select(territorySelection)
      .from(t)
      .where(and(eq(t.level, self[0].level), ne(t.ubigeo, ubigeo)))
      .orderBy(sql`${t.centroid}::geography <-> ${origin}::geography`)
      .limit(limit);
    return rows.map(mapTerritoryToDomain);
  }
}
