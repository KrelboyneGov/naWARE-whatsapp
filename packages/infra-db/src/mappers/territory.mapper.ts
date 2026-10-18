import { getTableColumns } from "drizzle-orm";
import type { Territory } from "@emergency-map/domain/schemas";
import { territoryTable } from "../schema";
import { geoJson, parseArea, parsePoint } from "../utils/postgis";

export const territorySelection = {
  ...getTableColumns(territoryTable),
  centroid: geoJson(territoryTable.centroid),
  geometry: geoJson(territoryTable.geometry),
};

type TerritoryRow = Omit<typeof territoryTable.$inferSelect, "centroid" | "geometry"> & {
  centroid: string | null;
  geometry: string | null;
};

export function mapTerritoryToDomain(row: TerritoryRow): Territory {
  return {
    ubigeo: row.ubigeo,
    name: row.name,
    provinceName: row.provinceName,
    departmentName: row.departmentName,
    level: row.level,
    parentUbigeo: row.parentUbigeo,
    centroid: parsePoint(row.centroid)!,
    geometry: parseArea(row.geometry),
  };
}

export const toTerritoryInsert = (t: Territory, isDemo = false) =>
  ({
    ubigeo: t.ubigeo,
    name: t.name,
    provinceName: t.provinceName,
    departmentName: t.departmentName,
    level: t.level,
    parentUbigeo: t.parentUbigeo,
    centroid: t.centroid,
    geometry: t.geometry,
    isDemo,
  }) satisfies typeof territoryTable.$inferInsert;
