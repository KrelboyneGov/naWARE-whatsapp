/** Supply categories an organization can request. */
export const NEED_CATEGORIES = ["water", "food", "shelter", "hygiene", "tools", "other"] as const;
export type NeedCategory = (typeof NEED_CATEGORIES)[number];

/** Lifecycle of a need. "expired" leaves the active filter but stays in history. */
export const NEED_STATUSES = ["open", "paused", "covered", "expired"] as const;
export type NeedStatus = (typeof NEED_STATUSES)[number];

/** Lifecycle of a collection point. A withdrawn point is never listed as operating. */
export const COLLECTION_POINT_STATUSES = ["active", "temporarily_closed", "withdrawn"] as const;
export type CollectionPointStatus = (typeof COLLECTION_POINT_STATUSES)[number];

/** Review of an organization's identity and contact; separate checks with separate dates. */
export const ORGANIZATION_REVIEW_STATUSES = ["pending", "reviewed", "stale"] as const;
export type OrganizationReviewStatus = (typeof ORGANIZATION_REVIEW_STATUSES)[number];
