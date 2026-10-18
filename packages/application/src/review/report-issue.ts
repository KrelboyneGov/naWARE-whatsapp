import type { Actor, IssueReport, ReportIssueInput } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import { canViewEvent } from "../events/visibility";
import type { UseCaseResult } from "../shared/result";
import { notFound, unauthenticated } from "../shared/result";
import type { ReviewDeps } from "./deps";

/**
 * Any signed-in user can flag a visible event. This is the one review use case that does not
 * need a moderator role: it only opens an issue and queues the case; it decides nothing.
 */
export async function reportIssue(
  deps: Pick<ReviewDeps, "events" | "review" | "clock" | "ids">,
  input: ReportIssueInput,
  actor?: Actor,
): Promise<UseCaseResult<IssueReport>> {
  if (!actor) return unauthenticated();
  const event = await deps.events.findById(input.eventId);
  if (!event || !canViewEvent(event, actor)) return notFound("event", input.eventId);

  const now = deps.clock.now();
  const issue: IssueReport = {
    ...input,
    id: deps.ids.next("iss"),
    reporterId: actor.userId,
    status: "open",
    createdAt: now,
  };
  await deps.review.createIssue(issue);
  await deps.review.enqueue({
    eventId: event.id,
    reason: "issue_reported",
    versionSeq: event.currentVersion.seq,
    at: now,
  });
  return ok(issue);
}
