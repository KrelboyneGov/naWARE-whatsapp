import { boolean, index, integer, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import type { IssueType, QueueReason } from "@emergency-map/domain/constants";
import { createTable } from "../utils/table-creator";
import { userTable } from "./auth";
import { eventTable } from "./event";

/** One open queue entry per event. */
export const reviewQueueTable = createTable(
  "review_queue",
  {
    eventId: text("event_id")
      .primaryKey()
      .references(() => eventTable.id, { onDelete: "cascade" }),
    reason: text("reason").$type<QueueReason>().notNull(),
    versionSeq: integer("version_seq").notNull(),
    assignedTo: text("assigned_to").references(() => userTable.id, { onDelete: "set null" }),
    enteredAt: timestamp("entered_at", { withTimezone: true }).notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
  },
  (t) => [index("review_queue_entered_idx").on(t.enteredAt)],
);

/** Decisions reference the exact (event, version) the moderator saw (ADR 0004). */
export const reviewDecisionTable = createTable(
  "review_decision",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => eventTable.id, { onDelete: "cascade" }),
    versionSeq: integer("version_seq").notNull(),
    kind: text("kind").$type<"publication" | "corroboration" | "relation" | "closure">().notNull(),
    decision: text("decision").notNull(),
    actorId: text("actor_id").notNull(),
    publicReason: text("public_reason").notNull(),
    privateNote: text("private_note"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
  },
  (t) => [index("review_decision_event_idx").on(t.eventId, t.decidedAt)],
);

export const issueReportTable = createTable(
  "issue_report",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => eventTable.id, { onDelete: "cascade" }),
    type: text("type").$type<IssueType>().notNull(),
    explanation: text("explanation").notNull(),
    url: text("url"),
    reporterId: text("reporter_id").notNull(),
    status: text("status").$type<"open" | "resolved" | "dismissed">().default("open").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    isDemo: boolean("is_demo").default(false).notNull(),
  },
  (t) => [index("issue_report_event_idx").on(t.eventId)],
);
