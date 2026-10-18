import type { ActivityEntry, EventFilters, ListPage } from "@emergency-map/domain/schemas";
import type { PaginatedResult } from "@emergency-map/domain/types";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import type { EventsDeps } from "./deps";

export async function listActivity(
  deps: Pick<EventsDeps, "events">,
  input: EventFilters & ListPage,
): Promise<UseCaseResult<PaginatedResult<ActivityEntry>>> {
  const { page, limit, ...filters } = input;
  const result = await deps.events.listActivity(filters, { limit, offset: (page - 1) * limit });
  return ok({
    data: result.data,
    meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
  });
}
