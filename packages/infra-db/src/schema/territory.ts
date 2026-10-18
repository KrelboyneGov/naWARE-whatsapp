import { boolean, index, text, timestamp } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { geometryMultiPolygon, geometryPoint } from "../utils/postgis";

/** Territorial units (department, province, district) keyed by INEI ubigeo. */
export const territoryTable = createTable(
  "territory",
  {
    ubigeo: text("ubigeo").primaryKey(),
    name: text("name").notNull(),
    provinceName: text("province_name"),
    departmentName: text("department_name").notNull(),
    level: text("level").$type<"department" | "province" | "district">().notNull(),
    parentUbigeo: text("parent_ubigeo"),
    centroid: geometryPoint("centroid").notNull(),
    /** Null until a licensed boundary source is loaded. */
    geometry: geometryMultiPolygon("geometry"),
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("territory_name_idx").on(t.name),
    index("territory_parent_idx").on(t.parentUbigeo),
    index("territory_centroid_gix").using("gist", t.centroid),
    index("territory_geometry_gix").using("gist", t.geometry),
  ],
);
