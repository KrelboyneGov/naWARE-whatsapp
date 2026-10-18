import { sql } from "drizzle-orm";
import { boolean, index, jsonb, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { PublicContact, TerritoryRef } from "@emergency-map/domain/schemas";
import type {
  CollectionPointStatus,
  NeedCategory,
  NeedStatus,
  OrganizationMemberRole,
  OrganizationReviewStatus,
} from "@emergency-map/domain/constants";
import { createTable } from "../utils/table-creator";
import { geometryPoint } from "../utils/postgis";
import { userTable } from "./auth";
import { eventTable } from "./event";

const emptyArray = sql`'[]'::jsonb`;

export const organizationTable = createTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  coverage: jsonb("coverage").$type<TerritoryRef[]>().default(emptyArray).notNull(),
  contacts: jsonb("contacts").$type<PublicContact[]>().default(emptyArray).notNull(),
  identityReview: text("identity_review").$type<OrganizationReviewStatus>().notNull(),
  identityReviewedAt: timestamp("identity_reviewed_at", { withTimezone: true }),
  contactReview: text("contact_review").$type<OrganizationReviewStatus>().notNull(),
  contactReviewedAt: timestamp("contact_reviewed_at", { withTimezone: true }),
  isDemo: boolean("is_demo").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Membership lives in our tables, not in Better Auth (ADR 0005). */
export const organizationMemberTable = createTable(
  "organization_member",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationTable.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    role: text("role").$type<OrganizationMemberRole>().notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.userId] }),
    index("organization_member_user_idx").on(t.userId),
  ],
);

export const collectionPointTable = createTable(
  "collection_point",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address").notNull(),
    arrivalReference: text("arrival_reference"),
    location: geometryPoint("location").notNull(),
    territoryUbigeo: text("territory_ubigeo").notNull(),
    territoryName: text("territory_name").notNull(),
    territoryProvinceName: text("territory_province_name"),
    territoryDepartmentName: text("territory_department_name").notNull(),
    scheduleText: text("schedule_text").notNull(),
    scheduleConfirmedAt: timestamp("schedule_confirmed_at", { withTimezone: true }),
    accepts: jsonb("accepts").$type<NeedCategory[]>().default(emptyArray).notNull(),
    doesNotAccept: text("does_not_accept"),
    destinationTerritories: jsonb("destination_territories")
      .$type<TerritoryRef[]>()
      .default(emptyArray)
      .notNull(),
    contacts: jsonb("contacts").$type<PublicContact[]>().default(emptyArray).notNull(),
    status: text("status").$type<CollectionPointStatus>().notNull(),
    availabilityConfirmedAt: timestamp("availability_confirmed_at", { withTimezone: true }),
    isDemo: boolean("is_demo").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("collection_point_org_idx").on(t.organizationId),
    index("collection_point_territory_idx").on(t.territoryUbigeo),
    index("collection_point_location_gix").using("gist", t.location),
  ],
);

export const needTable = createTable(
  "need",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationTable.id, { onDelete: "cascade" }),
    eventId: text("event_id").references(() => eventTable.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").$type<NeedCategory>().notNull(),
    destinationUbigeo: text("destination_ubigeo").notNull(),
    destinationName: text("destination_name").notNull(),
    destinationProvinceName: text("destination_province_name"),
    destinationDepartmentName: text("destination_department_name").notNull(),
    collectionPointId: text("collection_point_id").references(() => collectionPointTable.id, {
      onDelete: "set null",
    }),
    quantity: text("quantity"),
    deadline: timestamp("deadline", { withTimezone: true }),
    status: text("status").$type<NeedStatus>().notNull(),
    statusNote: text("status_note"),
    isDemo: boolean("is_demo").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("need_org_idx").on(t.organizationId),
    index("need_event_idx").on(t.eventId),
    index("need_destination_idx").on(t.destinationUbigeo),
  ],
);
