import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { TerritoryRef } from "@emergency-map/domain/schemas";
import type {
  EventCategory,
  ImportRunStatus,
  NoticeValidity,
  SourceAccessKind,
  SourceHealth,
} from "@emergency-map/domain/constants";
import { createTable } from "../utils/table-creator";
import { geometryMultiPolygon } from "../utils/postgis";

export const dataSourceTable = createTable("data_source", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  institution: text("institution").notNull(),
  infoType: text("info_type").notNull(),
  accessKind: text("access_kind").$type<SourceAccessKind>().notNull(),
  coverage: text("coverage").notNull(),
  originalUrl: text("original_url"),
  lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
  lastSuccessfulFetchAt: timestamp("last_successful_fetch_at", { withTimezone: true }),
  health: text("health").$type<SourceHealth>().notNull(),
  isDemo: boolean("is_demo").default(false).notNull(),
});

export const importRunTable = createTable(
  "import_run",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => dataSourceTable.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: text("status").$type<ImportRunStatus>().notNull(),
    processed: integer("processed").default(0).notNull(),
    duplicatesAvoided: integer("duplicates_avoided").default(0).notNull(),
    errorSummary: text("error_summary"),
    isDemo: boolean("is_demo").default(false).notNull(),
  },
  (t) => [index("import_run_source_started_idx").on(t.sourceId, t.startedAt)],
);

/** An official notice keeps the issuer's identifier, legend and validity untouched. */
export const officialNoticeTable = createTable(
  "official_notice",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => dataSourceTable.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    institution: text("institution").notNull(),
    title: text("title").notNull(),
    category: text("category").$type<EventCategory>().notNull(),
    severityLevel: text("severity_level"),
    severityIssuer: text("severity_issuer"),
    severityLegend: text("severity_legend"),
    url: text("url"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    validity: text("validity").$type<NoticeValidity>().notNull(),
    geometry: geometryMultiPolygon("geometry"),
    territories: jsonb("territories").$type<TerritoryRef[]>().default(sql`'[]'::jsonb`).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
  },
  (t) => [
    uniqueIndex("official_notice_source_external_uq").on(t.sourceId, t.externalId),
    index("official_notice_validity_idx").on(t.validity),
    index("official_notice_geometry_gix").using("gist", t.geometry),
  ],
);
