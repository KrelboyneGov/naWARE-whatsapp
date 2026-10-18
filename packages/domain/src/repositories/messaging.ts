import type {
  ConversationMessage,
  InterestTopic,
  NotificationJob,
  Subscriber,
} from "../schemas/messaging";

export interface IMessagingStore {
  insertSubscriber(row: Subscriber): Promise<"created" | "phone_taken" | "user_taken">;
  findSubscriberById(id: string): Promise<Subscriber | null>;
  findSubscriberByUserId(userId: string): Promise<Subscriber | null>;
  findSubscriberByPhoneHash(phoneHash: string): Promise<Subscriber | null>;
  updateSubscriber(id: string, patch: Partial<Subscriber>): Promise<void>;
  listNotifiable(): Promise<Subscriber[]>;
  listErasureDue(now: Date): Promise<Subscriber[]>;

  recordInbound(eventId: string, messageId: string, at: Date): Promise<"new" | "duplicate">;

  addMessage(message: ConversationMessage): Promise<void>;
  listMessages(subscriberId: string): Promise<ConversationMessage[]>;
  deleteSubscriberMemory(subscriberId: string): Promise<void>;

  upsertSummary(subscriberId: string, ciphertext: string, at: Date): Promise<void>;
  getSummary(subscriberId: string): Promise<string | null>;

  upsertTopic(topic: InterestTopic): Promise<InterestTopic>;
  listTopics(subscriberId: string): Promise<InterestTopic[]>;
  listTopicsForFollowUp(): Promise<InterestTopic[]>;

  enqueue(job: NotificationJob): Promise<"queued" | "duplicate">;
  pullDue(now: Date, limit: number): Promise<NotificationJob[]>;
  saveJob(job: NotificationJob): Promise<void>;
}

export interface SendTextInput {
  to: string;
  text: string;
}

export interface SendTemplateInput {
  to: string;
  templateName: string;
  variables: Record<string, string>;
}

export type NotificationSendResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "failed"; terminal: boolean; code: string; message: string };

/**
 * Outbound WhatsApp. Implementations must target an explicit sender and the
 * whatsapp channel. The project default sender is not a safe fallback.
 */
export interface INotificationPort {
  sendText(input: SendTextInput): Promise<NotificationSendResult>;
  sendTemplate(input: SendTemplateInput): Promise<NotificationSendResult>;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type LlmCompletion =
  | { kind: "message"; text: string }
  | { kind: "tool_calls"; calls: LlmToolCall[] };

export interface ILlmPort {
  complete(input: { messages: LlmMessage[]; tools: LlmToolDefinition[] }): Promise<LlmCompletion>;
}

export interface ForecastQuery {
  placeName: string;
  latitude: number | null;
  longitude: number | null;
  date: string;
}

export interface ForecastSnapshot {
  available: boolean;
  source: "Open-Meteo";
  /** ISO time of this fetch. Null when the source did not answer. */
  fetchedAt: string | null;
  summary: string | null;
  precipitationProbabilityMax: number | null;
  /** Why `available` is false. */
  reason: string | null;
}

export interface IForecastPort {
  forecast(query: ForecastQuery): Promise<ForecastSnapshot>;
}

export interface ILog {
  info(message: string): void;
  error(message: string): void;
}
