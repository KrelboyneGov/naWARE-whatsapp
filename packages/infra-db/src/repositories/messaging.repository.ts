import { and, eq, lte, or } from "drizzle-orm";
import type { IMessagingStore } from "@emergency-map/domain/repositories";
import type {
  ConversationMessage,
  InterestTopic,
  NotificationJob,
  NotificationPurpose,
  Subscriber,
} from "@emergency-map/domain/schemas";
import type { DatabaseClient } from "../client";
import {
  conversationMessageTable,
  conversationSummaryTable,
  inboundEventTable,
  interestTopicTable,
  notificationJobTable,
  subscriberTable,
} from "../schema";

type SubscriberRow = typeof subscriberTable.$inferSelect;
type JobRow = typeof notificationJobTable.$inferSelect;

function toSubscriber(row: SubscriberRow): Subscriber {
  return {
    id: row.id,
    userId: row.userId,
    phoneHash: row.phoneHash,
    phoneCiphertext: row.phoneCiphertext,
    verificationStatus: row.verificationStatus === "verified" ? "verified" : "pending",
    verifiedAt: row.verifiedAt,
    homeDistrictName: row.homeDistrictName,
    homeUbigeo: row.homeUbigeo,
    consentVersion: row.consentVersion,
    consentAt: row.consentAt,
    notificationsEnabled: row.notificationsEnabled,
    optedOutAt: row.optedOutAt,
    erasureDueAt: row.erasureDueAt,
    windowOpenedAt: row.windowOpenedAt,
    lastHomeLevel: row.lastHomeLevel,
    lastHomeNoticeId: row.lastHomeNoticeId,
    lastInformedAt: row.lastInformedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toJob(row: JobRow): NotificationJob {
  return {
    id: row.id,
    dedupeKey: row.dedupeKey,
    subscriberId: row.subscriberId,
    purpose: row.purpose as NotificationPurpose,
    mode: row.mode === "template" ? "template" : "text",
    body: row.body,
    templateName: row.templateName,
    variables: row.variablesJson ? (JSON.parse(row.variablesJson) as Record<string, string>) : null,
    status: row.status as NotificationJob["status"],
    terminal: row.terminal,
    attempts: row.attempts,
    lastError: row.lastError,
    nextAttemptAt: row.nextAttemptAt,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
  };
}

export class MessagingRepository implements IMessagingStore {
  constructor(private db: DatabaseClient) {}

  async insertSubscriber(row: Subscriber): Promise<"created" | "phone_taken" | "user_taken"> {
    const byPhone = await this.findSubscriberByPhoneHash(row.phoneHash);
    if (byPhone && !byPhone.phoneHash.startsWith("erased:")) return "phone_taken";
    const byUser = await this.findSubscriberByUserId(row.userId);
    if (byUser) return "user_taken";
    await this.db.insert(subscriberTable).values({
      id: row.id,
      userId: row.userId,
      phoneHash: row.phoneHash,
      phoneCiphertext: row.phoneCiphertext,
      verificationStatus: row.verificationStatus,
      verifiedAt: row.verifiedAt,
      homeDistrictName: row.homeDistrictName,
      homeUbigeo: row.homeUbigeo,
      consentVersion: row.consentVersion,
      consentAt: row.consentAt,
      notificationsEnabled: row.notificationsEnabled,
      optedOutAt: row.optedOutAt,
      erasureDueAt: row.erasureDueAt,
      windowOpenedAt: row.windowOpenedAt,
      lastHomeLevel: row.lastHomeLevel,
      lastHomeNoticeId: row.lastHomeNoticeId,
      lastInformedAt: row.lastInformedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    return "created";
  }

  async findSubscriberById(id: string): Promise<Subscriber | null> {
    const rows = await this.db
      .select()
      .from(subscriberTable)
      .where(eq(subscriberTable.id, id))
      .limit(1);
    return rows[0] ? toSubscriber(rows[0]) : null;
  }

  async findSubscriberByUserId(userId: string): Promise<Subscriber | null> {
    const rows = await this.db
      .select()
      .from(subscriberTable)
      .where(eq(subscriberTable.userId, userId))
      .limit(1);
    return rows[0] ? toSubscriber(rows[0]) : null;
  }

  async findSubscriberByPhoneHash(phoneHash: string): Promise<Subscriber | null> {
    const rows = await this.db
      .select()
      .from(subscriberTable)
      .where(eq(subscriberTable.phoneHash, phoneHash))
      .limit(1);
    return rows[0] ? toSubscriber(rows[0]) : null;
  }

  async updateSubscriber(id: string, patch: Partial<Subscriber>): Promise<void> {
    const set: Partial<typeof subscriberTable.$inferInsert> = {};
    if ("phoneHash" in patch && patch.phoneHash) set.phoneHash = patch.phoneHash;
    if ("phoneCiphertext" in patch && patch.phoneCiphertext)
      set.phoneCiphertext = patch.phoneCiphertext;
    if ("verificationStatus" in patch && patch.verificationStatus) {
      set.verificationStatus = patch.verificationStatus;
    }
    if ("verifiedAt" in patch) set.verifiedAt = patch.verifiedAt ?? null;
    if ("homeDistrictName" in patch && patch.homeDistrictName)
      set.homeDistrictName = patch.homeDistrictName;
    if ("homeUbigeo" in patch) set.homeUbigeo = patch.homeUbigeo ?? null;
    if ("notificationsEnabled" in patch && patch.notificationsEnabled !== undefined) {
      set.notificationsEnabled = patch.notificationsEnabled;
    }
    if ("optedOutAt" in patch) set.optedOutAt = patch.optedOutAt ?? null;
    if ("erasureDueAt" in patch) set.erasureDueAt = patch.erasureDueAt ?? null;
    if ("windowOpenedAt" in patch) set.windowOpenedAt = patch.windowOpenedAt ?? null;
    if ("lastHomeLevel" in patch) set.lastHomeLevel = patch.lastHomeLevel ?? null;
    if ("lastHomeNoticeId" in patch) set.lastHomeNoticeId = patch.lastHomeNoticeId ?? null;
    if ("lastInformedAt" in patch) set.lastInformedAt = patch.lastInformedAt ?? null;
    if ("updatedAt" in patch && patch.updatedAt) set.updatedAt = patch.updatedAt;
    if (Object.keys(set).length === 0) return;
    await this.db.update(subscriberTable).set(set).where(eq(subscriberTable.id, id));
  }

  async listNotifiable(): Promise<Subscriber[]> {
    const rows = await this.db
      .select()
      .from(subscriberTable)
      .where(eq(subscriberTable.notificationsEnabled, true));
    return rows.map(toSubscriber);
  }

  async listErasureDue(now: Date): Promise<Subscriber[]> {
    const rows = await this.db
      .select()
      .from(subscriberTable)
      .where(lte(subscriberTable.erasureDueAt, now));
    return rows.map(toSubscriber);
  }

  async recordInbound(eventId: string, messageId: string, at: Date): Promise<"new" | "duplicate"> {
    const existing = await this.db
      .select({ id: inboundEventTable.id })
      .from(inboundEventTable)
      .where(or(eq(inboundEventTable.id, eventId), eq(inboundEventTable.messageId, messageId)))
      .limit(1);
    if (existing.length > 0) return "duplicate";
    await this.db.insert(inboundEventTable).values({ id: eventId, messageId, processedAt: at });
    return "new";
  }

  async addMessage(message: ConversationMessage): Promise<void> {
    await this.db.insert(conversationMessageTable).values({
      id: message.id,
      subscriberId: message.subscriberId,
      direction: message.direction,
      bodyCiphertext: message.bodyCiphertext,
      externalMessageId: message.externalMessageId,
      createdAt: message.createdAt,
    });
  }

  async listMessages(subscriberId: string): Promise<ConversationMessage[]> {
    const rows = await this.db
      .select()
      .from(conversationMessageTable)
      .where(eq(conversationMessageTable.subscriberId, subscriberId));
    return rows.map((row) => ({
      id: row.id,
      subscriberId: row.subscriberId,
      direction: row.direction === "out" ? "out" : "in",
      bodyCiphertext: row.bodyCiphertext,
      externalMessageId: row.externalMessageId,
      createdAt: row.createdAt,
    }));
  }

  async deleteSubscriberMemory(subscriberId: string): Promise<void> {
    await this.db
      .delete(conversationMessageTable)
      .where(eq(conversationMessageTable.subscriberId, subscriberId));
    await this.db
      .delete(conversationSummaryTable)
      .where(eq(conversationSummaryTable.subscriberId, subscriberId));
    await this.db
      .delete(interestTopicTable)
      .where(eq(interestTopicTable.subscriberId, subscriberId));
  }

  async upsertSummary(subscriberId: string, ciphertext: string, at: Date): Promise<void> {
    await this.db
      .insert(conversationSummaryTable)
      .values({ subscriberId, summaryCiphertext: ciphertext, updatedAt: at })
      .onConflictDoUpdate({
        target: conversationSummaryTable.subscriberId,
        set: { summaryCiphertext: ciphertext, updatedAt: at },
      });
  }

  async getSummary(subscriberId: string): Promise<string | null> {
    const rows = await this.db
      .select()
      .from(conversationSummaryTable)
      .where(eq(conversationSummaryTable.subscriberId, subscriberId))
      .limit(1);
    return rows[0]?.summaryCiphertext ?? null;
  }

  async upsertTopic(topic: InterestTopic): Promise<InterestTopic> {
    const existing = await this.db
      .select()
      .from(interestTopicTable)
      .where(eq(interestTopicTable.subscriberId, topic.subscriberId));
    const match = existing.find(
      (row) => row.placeName.toLowerCase() === topic.placeName.toLowerCase(),
    );
    if (!match) {
      await this.db.insert(interestTopicTable).values(topic);
      return topic;
    }
    const next = { ...topic, id: match.id };
    await this.db.update(interestTopicTable).set(next).where(eq(interestTopicTable.id, match.id));
    return next;
  }

  async listTopics(subscriberId: string): Promise<InterestTopic[]> {
    const rows = await this.db
      .select()
      .from(interestTopicTable)
      .where(eq(interestTopicTable.subscriberId, subscriberId));
    return rows.map(toTopic);
  }

  async listTopicsForFollowUp(): Promise<InterestTopic[]> {
    const rows = await this.db.select().from(interestTopicTable);
    return rows.map(toTopic);
  }

  async enqueue(job: NotificationJob): Promise<"queued" | "duplicate"> {
    const existing = await this.db
      .select({ id: notificationJobTable.id })
      .from(notificationJobTable)
      .where(eq(notificationJobTable.dedupeKey, job.dedupeKey))
      .limit(1);
    if (existing.length > 0) return "duplicate";
    await this.db.insert(notificationJobTable).values(toJobInsert(job));
    return "queued";
  }

  async pullDue(now: Date, limit: number): Promise<NotificationJob[]> {
    const rows = await this.db
      .select()
      .from(notificationJobTable)
      .where(
        and(
          eq(notificationJobTable.status, "queued"),
          eq(notificationJobTable.terminal, false),
          lte(notificationJobTable.nextAttemptAt, now),
        ),
      )
      .limit(limit);
    return rows.map(toJob);
  }

  async saveJob(job: NotificationJob): Promise<void> {
    await this.db
      .update(notificationJobTable)
      .set(toJobInsert(job))
      .where(eq(notificationJobTable.id, job.id));
  }
}

function toTopic(row: typeof interestTopicTable.$inferSelect): InterestTopic {
  return {
    id: row.id,
    subscriberId: row.subscriberId,
    placeName: row.placeName,
    ubigeo: row.ubigeo,
    consultedForDate: row.consultedForDate,
    lastInformedLevel: row.lastInformedLevel,
    lastInformedNoticeId: row.lastInformedNoticeId,
    lastInformedAt: row.lastInformedAt,
  };
}

function toJobInsert(job: NotificationJob): typeof notificationJobTable.$inferInsert {
  return {
    id: job.id,
    dedupeKey: job.dedupeKey,
    subscriberId: job.subscriberId,
    purpose: job.purpose,
    mode: job.mode,
    body: job.body,
    templateName: job.templateName,
    variablesJson: job.variables ? JSON.stringify(job.variables) : null,
    status: job.status,
    terminal: job.terminal,
    attempts: job.attempts,
    lastError: job.lastError,
    nextAttemptAt: job.nextAttemptAt,
    createdAt: job.createdAt,
    sentAt: job.sentAt,
  };
}
