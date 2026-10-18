import type {
  ConversationMessage,
  InterestTopic,
  NotificationJob,
  Subscriber,
} from "@emergency-map/domain/schemas";
import type { IMessagingStore } from "@emergency-map/domain/repositories";

function cloneSubscriber(row: Subscriber): Subscriber {
  return { ...row };
}

/** In-memory store for unit tests. Ciphertext is stored as given; this fake does not decrypt. */
export function createMemoryMessagingStore(): IMessagingStore {
  const subscribers: Subscriber[] = [];
  const inbound = new Set<string>();
  const messages: ConversationMessage[] = [];
  const summaries = new Map<string, { ciphertext: string; at: Date }>();
  const topics: InterestTopic[] = [];
  const jobs: NotificationJob[] = [];

  return {
    async insertSubscriber(row) {
      if (
        subscribers.some(
          (item) => item.phoneHash === row.phoneHash && !item.phoneHash.startsWith("erased:"),
        )
      ) {
        return "phone_taken";
      }
      if (subscribers.some((item) => item.userId === row.userId)) return "user_taken";
      subscribers.push(cloneSubscriber(row));
      return "created";
    },

    async findSubscriberById(id) {
      return subscribers.find((item) => item.id === id) ?? null;
    },

    async findSubscriberByUserId(userId) {
      return subscribers.find((item) => item.userId === userId) ?? null;
    },

    async findSubscriberByPhoneHash(phoneHash) {
      return subscribers.find((item) => item.phoneHash === phoneHash) ?? null;
    },

    async updateSubscriber(id, patch) {
      const index = subscribers.findIndex((item) => item.id === id);
      const current = subscribers[index];
      if (!current) return;
      subscribers[index] = { ...current, ...patch, id: current.id };
    },

    async listNotifiable() {
      return subscribers.filter((item) => item.notificationsEnabled).map(cloneSubscriber);
    },

    async listErasureDue(now) {
      return subscribers
        .filter(
          (item) => item.erasureDueAt !== null && item.erasureDueAt.getTime() <= now.getTime(),
        )
        .map(cloneSubscriber);
    },

    async recordInbound(eventId, messageId) {
      if (inbound.has(eventId) || inbound.has(`msg:${messageId}`)) return "duplicate";
      inbound.add(eventId);
      inbound.add(`msg:${messageId}`);
      return "new";
    },

    async addMessage(message) {
      messages.push({ ...message });
    },

    async listMessages(subscriberId) {
      return messages
        .filter((message) => message.subscriberId === subscriberId)
        .map((message) => ({ ...message }));
    },

    async deleteSubscriberMemory(subscriberId) {
      for (let i = messages.length - 1; i >= 0; i -= 1) {
        if (messages[i]?.subscriberId === subscriberId) messages.splice(i, 1);
      }
      summaries.delete(subscriberId);
      for (let i = topics.length - 1; i >= 0; i -= 1) {
        if (topics[i]?.subscriberId === subscriberId) topics.splice(i, 1);
      }
    },

    async upsertSummary(subscriberId, ciphertext) {
      summaries.set(subscriberId, { ciphertext, at: new Date() });
    },

    async getSummary(subscriberId) {
      return summaries.get(subscriberId)?.ciphertext ?? null;
    },

    async upsertTopic(topic) {
      const index = topics.findIndex(
        (item) =>
          item.subscriberId === topic.subscriberId &&
          item.placeName.toLowerCase() === topic.placeName.toLowerCase(),
      );
      if (index >= 0) {
        const current = topics[index];
        if (!current) return topic;
        topics[index] = { ...current, ...topic, id: current.id };
        return topics[index];
      }
      topics.push({ ...topic });
      return topic;
    },

    async listTopics(subscriberId) {
      return topics
        .filter((topic) => topic.subscriberId === subscriberId)
        .map((topic) => ({ ...topic }));
    },

    async listTopicsForFollowUp() {
      return topics.map((topic) => ({ ...topic }));
    },

    async enqueue(job) {
      if (jobs.some((item) => item.dedupeKey === job.dedupeKey)) return "duplicate";
      jobs.push({ ...job, variables: job.variables ? { ...job.variables } : null });
      return "queued";
    },

    async pullDue(now, limit) {
      return jobs
        .filter(
          (job) =>
            job.status === "queued" &&
            !job.terminal &&
            job.nextAttemptAt.getTime() <= now.getTime(),
        )
        .slice(0, limit)
        .map((job) => ({ ...job, variables: job.variables ? { ...job.variables } : null }));
    },

    async saveJob(job) {
      const index = jobs.findIndex((item) => item.id === job.id);
      if (index < 0) return;
      jobs[index] = { ...job, variables: job.variables ? { ...job.variables } : null };
    },
  };
}
