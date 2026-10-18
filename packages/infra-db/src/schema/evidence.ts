import { boolean, index, text, timestamp } from "drizzle-orm/pg-core";
import type {
  EvidenceType,
  EvidenceVisibility,
  ReviewStatus,
  TimePrecision,
} from "@emergency-map/domain/constants";
import { createTable } from "../utils/table-creator";
import { userTable } from "./auth";
import { eventTable } from "./event";

export const evidenceTable = createTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => eventTable.id, { onDelete: "cascade" }),
    type: text("type").$type<EvidenceType>().notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => userTable.id),
    authorDisplayName: text("author_display_name").notNull(),
    authorRole: text("author_role")
      .$type<"citizen" | "organization" | "moderator" | "official">()
      .notNull(),
    description: text("description").notNull(),
    storageKey: text("storage_key"),
    /** Hash of the uploaded file, used to flag the same image uploaded twice. */
    fileSha256: text("file_sha256"),
    url: text("url"),
    observedPersonally: boolean("observed_personally"),
    ownsImage: boolean("owns_image"),
    declaredCapturedPrecision: text("declared_captured_precision").$type<TimePrecision>(),
    declaredCapturedStart: timestamp("declared_captured_start", { withTimezone: true }),
    declaredCapturedEnd: timestamp("declared_captured_end", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    reviewStatus: text("review_status").$type<ReviewStatus>().notNull(),
    visibility: text("visibility").$type<EvidenceVisibility>().notNull(),
    duplicateOfEvidenceId: text("duplicate_of_evidence_id"),
    isDemo: boolean("is_demo").default(false).notNull(),
  },
  (t) => [
    index("evidence_event_idx").on(t.eventId),
    index("evidence_file_sha256_idx").on(t.fileSha256),
  ],
);
