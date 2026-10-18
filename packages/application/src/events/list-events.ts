import type { ListEventsInput, PublicEvent } from "@emergency-map/domain/schemas";
import type { PaginatedResult } from "@emergency-map/domain/types";
import { ok } from "@emergency-map/domain/types";
import { isCurrentPublic, toPublicEvent } from "../shared/public";
import type { UseCaseResult } from "../shared/result";
import type { EventsDeps } from "./deps";

/** Published, non-merged events only; merged or withdrawn ones are filtered again here. */
export async function listEvents(
  deps: Pick<EventsDeps, "events">,
  input: ListEventsInput,
): Promise<UseCaseResult<PaginatedResult<PublicEvent>>> {
  const { page, limit, sort, ...filters } = input;
  const result = await deps.events.listPublic(filters, { limit, offset: (page - 1) * limit }, sort);
  return ok({
    data: result.data.filter(isCurrentPublic).map(toPublicEvent),
    meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
  });
}
