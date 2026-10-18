/** Phenomenon categories a report or notice can describe. Road incidents are a citizen-only category. */
export const EVENT_CATEGORIES = [
  "fire",
  "flood",
  "landslide",
  "road_incident",
  "heavy_rain",
  "frost",
  "other",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** Who asserts the information. Dimension 1 of 4; never merged with the others. */
export const ORIGINS = ["citizen", "organization", "official"] as const;
export type Origin = (typeof ORIGINS)[number];

/** Editorial review of the facts. Dimension 2. "with_contributions" is not corroboration. */
export const REVIEW_STATUSES = [
  "unverified",
  "with_contributions",
  "corroborated_by_review",
  "officially_backed",
  "disputed",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Visibility workflow. Dimension 3. Publishing does not corroborate. "merged" points at another event. */
export const PUBLICATION_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "hidden",
  "rejected",
  "merged",
] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

/** Whether the fact is still current. Dimension 4. Never derived from elapsed time alone. */
export const SITUATION_STATUSES = [
  "recent_update",
  "no_recent_update",
  "closure_reported",
] as const;
export type SituationStatus = (typeof SITUATION_STATUSES)[number];

/** Validity of an official notice; independent from the situation of any related event. */
export const NOTICE_VALIDITIES = ["active", "expired", "cancelled"] as const;
export type NoticeValidity = (typeof NOTICE_VALIDITIES)[number];

/** How precisely the place is known. Public geometry never exceeds this precision. */
export const LOCATION_PRECISIONS = ["exact", "approximate", "district"] as const;
export type LocationPrecision = (typeof LOCATION_PRECISIONS)[number];

/** How precisely the time is known. */
export const TIME_PRECISIONS = ["exact", "hour", "day", "interval"] as const;
export type TimePrecision = (typeof TIME_PRECISIONS)[number];

/** Severity levels as published by SENAMHI. Stored only with the issuer that published them. */
export const SENAMHI_SEVERITY_LEVELS = ["yellow", "orange", "red"] as const;
export type SenamhiSeverityLevel = (typeof SENAMHI_SEVERITY_LEVELS)[number];

/** Kinds of entries in the public activity feed. */
export const ACTIVITY_TYPES = [
  "new_report",
  "new_evidence",
  "official_update",
  "correction",
  "decision",
  "closure",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
