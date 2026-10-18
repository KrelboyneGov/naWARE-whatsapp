import type { Actor } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { isCurrentPublic } from "../shared/public";
import type { UseCaseResult } from "../shared/result";
import { notFound } from "../shared/result";
import type { EventsDeps } from "./deps";

export type ShareSummary = {
  title: string;
  date: Date;
  /** English keys; the client localizes them. Review and publication stay separate. */
  reviewLabel: string;
  publicationLabel: string;
  urlPath: string;
  isDemo: boolean;
};

/**
 * What a shared link may show. Only published events can be shared, and the summary carries no
 * location at all, so private coordinates cannot leak (failure 6).
 */
export async function shareSummary(
  deps: Pick<EventsDeps, "events">,
  input: { eventId: string },
  _actor?: Actor,
): Promise<UseCaseResult<ShareSummary>> {
  const event = await deps.events.findById(input.eventId);
  if (!event || !isCurrentPublic(event)) return notFound("event", input.eventId);
  return ok({
    title: event.currentVersion.title,
    date: event.currentVersion.occurredAt.start,
    reviewLabel: event.reviewStatus,
    publicationLabel: event.publicationStatus,
    urlPath: `/eventos/${event.id}`,
    isDemo: event.isDemo,
  });
}
