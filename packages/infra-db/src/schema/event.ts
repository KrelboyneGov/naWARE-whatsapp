import { boolean, index, integer, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type {
  ActivityType,
  EventCategory,
  LocationPrecision,
  Origin,
  PublicationStatus,
  ReviewStatus,
  SituationStatus,
  TimePrecision,
} from "@emergency-map/domain/constants";
import { createTable } from "../utils/table-creator";
import { geometryPoint } from "../utils/postgis";
import { userTable } from "./auth";

/**
 * Identity and current dimension values of an event (ADR 0004). Editable content lives in
 * `event_version`; `current_version_seq` points at the latest snapshot (no FK: the version row
 * references the event, so a composite FK back would be circular).
 */
export const eventTable = createTable(
  "event",
  {
    id: text("id").primaryKey(),
    origin: text("origin").$type<Origin>().notNull(),
    reviewStatus: text("review_status").$type<ReviewStatus>().notNull(),
    publicationStatus: text("publication_status").$type<PublicationStatus>().notNull(),
    situationStatus: text("situation_status").$type<SituationStatus>().notNull(),
    severityLevel: text("severity_level"),
    severityIssuer: text("severity_issuer"),
    severityLegend: text("severity_legend"),
    currentVersionSeq: integer("current_version_seq").default(1).notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => userTable.id),
    authorDisplayName: text("author_display_name").notNull(),
    authorRole: text("author_role")
      .$type<"citizen" | "organization" | "moderator" | "official">()
      .notNull(),
    /** Exact point captured by the reporter. PRIVATE: never selected by public reads. */
    privateLocation: geometryPoint("private_location"),
    mergedIntoEventId: text("merged_into_event_id"),
    contributionCount: integer("contribution_count").default(0).notNull(),
    hasOpenNeeds: boolean("has_open_needs").default(false).notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("event_publication_idx").on(t.publicationStatus, t.lastUpdatedAt),
    index("event_author_idx").on(t.authorId),
    index("event_merged_into_idx").on(t.mergedIntoEventId),
    index("event_private_location_gix").using("gist", t.privateLocation),
  ],
);

/** Immutable snapshot of the editable content of an event. Rows are never updated. */
export const eventVersionTable = createTable(
  "event_version",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => eventTable.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    category: text("category").$type<EventCategory>().notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    placePrecision: text("place_precision").$type<LocationPrecision>().notNull(),
    /** Public point; null when precision is "district". */
    placePoint: geometryPoint("place_point"),
    territoryUbigeo: text("territory_ubigeo").notNull(),
    territoryName: text("territory_name").notNull(),
    territoryProvinceName: text("territory_province_name"),
    territoryDepartmentName: text("territory_department_name").notNull(),
    placeReference: text("place_reference"),
    occurredPrecision: text("occurred_precision").$type<TimePrecision>().notNull(),
    occurredStart: timestamp("occurred_start", { withTimezone: true }).notNull(),
    occurredEnd: timestamp("occurred_end", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    publicationStatus: text("publication_status").$type<PublicationStatus>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.seq] }),
    index("event_version_category_idx").on(t.category),
    index("event_version_territory_idx").on(t.territoryUbigeo),
    index("event_version_occurred_idx").on(t.occurredStart),
    index("event_version_place_point_gix").using("gist", t.placePoint),
  ],
);

/** Public activity feed. */
export const activityTable = createTable(
  "activity",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => eventTable.id, { onDelete: "cascade" }),
    eventTitle: text("event_title").notNull(),
    type: text("type").$type<ActivityType>().notNull(),
    actorRole: text("actor_role")
      .$type<"citizen" | "organization" | "moderator" | "official">()
      .notNull(),
    summary: text("summary").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
  },
  (t) => [index("activity_at_idx").on(t.at), index("activity_event_idx").on(t.eventId)],
);
