import type {
  Event,
  Evidence,
  PublicEvent,
  PublicEvidence,
  PublicReviewDecision,
  ReviewDecision,
} from "@emergency-map/domain/schemas";

/**
 * Public read model of an event. Drops privateLocation and authorId (failure 6) by building the
 * object field by field instead of spreading the internal record.
 */
export function toPublicEvent(event: Event): PublicEvent {
  const v = event.currentVersion;
  return {
    id: event.id,
    origin: event.origin,
    reviewStatus: event.reviewStatus,
    publicationStatus: event.publicationStatus,
    situationStatus: event.situationStatus,
    severity: event.severity,
    author: event.author,
    mergedIntoEventId: event.mergedIntoEventId,
    contributionCount: event.contributionCount,
    hasOpenNeeds: event.hasOpenNeeds,
    isDemo: event.isDemo,
    publishedAt: event.publishedAt,
    lastUpdatedAt: event.lastUpdatedAt,
    createdAt: event.createdAt,
    versionSeq: v.seq,
    category: v.category,
    title: v.title,
    description: v.description,
    place: v.place,
    occurredAt: v.occurredAt,
  };
}

export function toPublicEvidence(e: Evidence): PublicEvidence {
  const { authorId: _authorId, ...rest } = e;
  return rest;
}

export function toPublicDecision(d: ReviewDecision): PublicReviewDecision {
  const { actorId: _actorId, privateNote: _privateNote, ...rest } = d;
  return rest;
}

/** Listed as a current event: published and not merged (failure 5). */
export function isCurrentPublic(e: Pick<Event, "publicationStatus" | "mergedIntoEventId">) {
  return e.publicationStatus === "published" && e.mergedIntoEventId === null;
}
