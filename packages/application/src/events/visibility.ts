import type { Actor, Event } from "@emergency-map/domain/schemas";
import { isModerator } from "../shared/authz";

/**
 * Who may read an event. Everyone sees published events, and merged ones that were published
 * (so old links can redirect). Anything else is visible only to its author and moderators.
 */
export function canViewEvent(event: Event, actor?: Actor): boolean {
  if (event.publicationStatus === "published") return true;
  if (event.publicationStatus === "merged" && event.publishedAt !== null) return true;
  if (!actor) return false;
  return isModerator(actor) || event.authorId === actor.userId;
}
