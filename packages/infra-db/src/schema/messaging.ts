import { boolean, index, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { userTable } from "./auth";

export const subscriberTable = createTable(
  "subscriber",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    phoneHash: text("phone_hash").notNull(),
    phoneCiphertext: text("phone_ciphertext").notNull(),
    verificationStatus: text("verification_status").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    homeDistrictName: text("home_district_name").notNull(),
    homeUbigeo: text("home_ubigeo"),
    consentVersion: text("consent_version").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    notificationsEnabled: boolean("notifications_enabled").notNull(),
    optedOutAt: timestamp("opted_out_at", { withTimezone: true }),
    erasureDueAt: timestamp("erasure_due_at", { withTimezone: true }),
    windowOpenedAt: timestamp("window_opened_at", { withTimezone: true }),
    lastHomeLevel: text("last_home_level"),
    lastHomeNoticeId: text("last_home_notice_id"),
    lastInformedAt: timestamp("last_informed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("subscriber_user_id_idx").on(table.userId),
    uniqueIndex("subscriber_phone_hash_idx").on(table.phoneHash),
  ],
);

export const conversationMessageTable = createTable(
  "conversation_message",
  {
    id: text("id").primaryKey(),
    subscriberId: text("subscriber_id")
      .notNull()
      .references(() => subscriberTable.id, { onDelete: "cascade" }),
    direction: text("direction").notNull(),
    bodyCiphertext: text("body_ciphertext").notNull(),
    externalMessageId: text("external_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("conversation_message_subscriber_idx").on(table.subscriberId)],
);

export const conversationSummaryTable = createTable("conversation_summary", {
  subscriberId: text("subscriber_id")
    .primaryKey()
    .references(() => subscriberTable.id, { onDelete: "cascade" }),
  summaryCiphertext: text("summary_ciphertext").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const interestTopicTable = createTable(
  "interest_topic",
  {
    id: text("id").primaryKey(),
    subscriberId: text("subscriber_id")
      .notNull()
      .references(() => subscriberTable.id, { onDelete: "cascade" }),
    placeName: text("place_name").notNull(),
    ubigeo: text("ubigeo"),
    consultedForDate: text("consulted_for_date"),
    lastInformedLevel: text("last_informed_level"),
    lastInformedNoticeId: text("last_informed_notice_id"),
    lastInformedAt: timestamp("last_informed_at", { withTimezone: true }),
  },
  (table) => [index("interest_topic_subscriber_idx").on(table.subscriberId)],
);

export const inboundEventTable = createTable("inbound_event", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull(),
});

export const notificationJobTable = createTable(
  "notification_job",
  {
    id: text("id").primaryKey(),
    dedupeKey: text("dedupe_key").notNull(),
    subscriberId: text("subscriber_id")
      .notNull()
      .references(() => subscriberTable.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    mode: text("mode").notNull(),
    body: text("body").notNull(),
    templateName: text("template_name"),
    variablesJson: text("variables_json"),
    status: text("status").notNull(),
    terminal: boolean("terminal").notNull(),
    attempts: integer("attempts").notNull(),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("notification_job_dedupe_idx").on(table.dedupeKey),
    index("notification_job_due_idx").on(table.status, table.nextAttemptAt),
  ],
);
