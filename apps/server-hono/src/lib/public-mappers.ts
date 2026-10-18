import type {
  Event,
  Evidence,
  IssueReport,
  PublicEvent,
  PublicEvidence,
} from "@emergency-map/domain/schemas";

/**
 * Field-by-field copies: an internal record is never spread into a response, so privateLocation
 * and author ids cannot leak when a field is added to the internal type later.
 */
export function toPublicEvent(event: Event): PublicEvent {
  const version = event.currentVersion;
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
    versionSeq: version.seq,
    category: version.category,
    title: version.title,
    description: version.description,
    place: version.place,
    occurredAt: version.occurredAt,
  };
}

export function toPublicEvidence(evidence: Evidence): PublicEvidence {
  const { authorId: _authorId, ...rest } = evidence;
  return rest;
}

export function toPublicIssue(issue: IssueReport) {
  const { reporterId: _reporterId, ...rest } = issue;
  return rest;
}
