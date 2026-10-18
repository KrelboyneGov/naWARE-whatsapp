/** Contribution kinds. A photo is not proof; a testimony is a contribution too. */
export const EVIDENCE_TYPES = ["photo", "document_link", "testimony"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

/** Visibility of one evidence item. Sensitive items stay restricted. */
export const EVIDENCE_VISIBILITIES = ["pending", "public", "restricted", "removed"] as const;
export type EvidenceVisibility = (typeof EVIDENCE_VISIBILITIES)[number];

/** Decisions on visibility. Publishing keeps the review status untouched. */
export const PUBLICATION_DECISIONS = ["publish", "request_info", "reject", "withdraw"] as const;
export type PublicationDecision = (typeof PUBLICATION_DECISIONS)[number];

/** Decisions on the facts. Each one states what was checked and what remains uncertain. */
export const CORROBORATION_DECISIONS = [
  "keep_unverified",
  "record_contributions",
  "corroborate_aspects",
  "link_official_backing",
  "mark_disputed",
] as const;
export type CorroborationDecision = (typeof CORROBORATION_DECISIONS)[number];

/** Decisions on how events relate to each other. */
export const RELATION_DECISIONS = ["link", "merge", "split"] as const;
export type RelationDecision = (typeof RELATION_DECISIONS)[number];

/** Why a case entered the review queue. */
export const QUEUE_REASONS = [
  "new_report",
  "new_evidence",
  "possible_duplicate",
  "issue_reported",
  "disputed",
  "edit_pending",
] as const;
export type QueueReason = (typeof QUEUE_REASONS)[number];

/** What a visitor can flag about an event. Never published as an accusation. */
export const ISSUE_TYPES = [
  "wrong_location",
  "wrong_date",
  "reused_image",
  "duplicate",
  "contradicted",
  "personal_data",
  "inappropriate",
] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];
