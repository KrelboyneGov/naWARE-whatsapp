import type { Actor, Event, EventVersion, SubmitReportInput } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { unauthenticated, validation } from "../shared/result";
import type { EventsDeps } from "./deps";
import { findPossibleDuplicates } from "./find-possible-duplicates";

/**
 * Creates a citizen report: event + version 1, pending review, unverified. The author's exact
 * coordinates are stored privately; the public place follows the declared precision.
 */
export async function submitReport(
  deps: EventsDeps,
  input: SubmitReportInput,
  actor?: Actor,
): Promise<UseCaseResult<Event>> {
  if (!actor) return unauthenticated();

  const title = input.title.trim();
  if (title.length === 0) return validation("title", "Title is required");

  const { place } = input;
  if (place.precision === "district" && place.point !== null) {
    return validation("place.point", "A district-precision place must not carry a point");
  }
  if (place.precision !== "district" && place.point === null) {
    return validation("place.point", "An exact or approximate place needs a point");
  }

  const now = deps.clock.now();
  const eventId = deps.ids.next("evt");

  const duplicates = await findPossibleDuplicates(deps, {
    category: input.category,
    place,
    occurredAt: input.occurredAt,
  });
  const dismissed = new Set(input.dismissedDuplicateIds);
  const undismissed = (duplicates.data ?? []).filter((c) => !dismissed.has(c.event.id));

  const version: EventVersion = {
    eventId,
    seq: 1,
    category: input.category,
    title,
    description: input.description,
    place,
    occurredAt: input.occurredAt,
    createdBy: actor.userId,
    createdAt: now,
    publicationStatus: "pending_review",
  };

  const event: Event = {
    id: eventId,
    origin: "citizen",
    reviewStatus: "unverified",
    publicationStatus: "pending_review",
    situationStatus: "recent_update",
    severity: null,
    currentVersion: version,
    authorId: actor.userId,
    author: { displayName: actor.publicName, role: "citizen" },
    privateLocation: input.privateLocation,
    mergedIntoEventId: null,
    contributionCount: 0,
    hasOpenNeeds: false,
    isDemo: false,
    publishedAt: null,
    lastUpdatedAt: now,
    createdAt: now,
  };

  // The repository persists the embedded currentVersion (seq 1) together with the event.
  const created = await deps.events.create(event);

  await deps.review.enqueue({
    eventId,
    reason: undismissed.length > 0 ? "possible_duplicate" : "new_report",
    versionSeq: 1,
    at: now,
  });

  await deps.events.appendActivity({
    id: deps.ids.next("act"),
    eventId,
    eventTitle: title,
    type: "new_report",
    actorRole: "citizen",
    summary: `New report: ${title}`,
    at: now,
    isDemo: false,
  });

  return ok(created);
}
