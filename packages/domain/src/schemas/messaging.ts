export interface Subscriber {
  id: string;
  userId: string;
  phoneHash: string;
  phoneCiphertext: string;
  verificationStatus: "pending" | "verified";
  verifiedAt: Date | null;
  homeDistrictName: string;
  homeUbigeo: string | null;
  consentVersion: string;
  consentAt: Date;
  notificationsEnabled: boolean;
  optedOutAt: Date | null;
  erasureDueAt: Date | null;
  windowOpenedAt: Date | null;
  lastHomeLevel: string | null;
  lastHomeNoticeId: string | null;
  lastInformedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  subscriberId: string;
  direction: "in" | "out";
  bodyCiphertext: string;
  externalMessageId: string | null;
  createdAt: Date;
}

export interface InterestTopic {
  id: string;
  subscriberId: string;
  placeName: string;
  ubigeo: string | null;
  consultedForDate: string | null;
  lastInformedLevel: string | null;
  lastInformedNoticeId: string | null;
  lastInformedAt: Date | null;
}

export type NotificationPurpose = "reply" | "confirmation" | "follow_up";

export interface NotificationJob {
  id: string;
  dedupeKey: string;
  subscriberId: string;
  purpose: NotificationPurpose;
  mode: "text" | "template";
  body: string;
  templateName: string | null;
  variables: Record<string, string> | null;
  status: "queued" | "sent" | "failed" | "skipped";
  terminal: boolean;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: Date;
  createdAt: Date;
  sentAt: Date | null;
}

export interface RegisterSubscriberInput {
  userId: string;
  phone: string;
  districtName: string;
  ubigeo?: string | null;
  /** Browser geolocation. Resolved to a district and then discarded. */
  point?: { lat: number; lng: number } | null;
  consentAccepted: boolean;
  adultConfirmed: boolean;
}
