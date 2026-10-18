import type { Actor, ReviewQueueFilters, ReviewQueueItem } from "@emergency-map/domain/schemas";
import type { PaginatedResult } from "@emergency-map/domain/types";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import type { ReviewDeps } from "./deps";
import { requireModerator } from "./support";

export async function listReviewQueue(
  deps: Pick<ReviewDeps, "review">,
  input: ReviewQueueFilters,
  actor?: Actor,
): Promise<UseCaseResult<PaginatedResult<ReviewQueueItem>>> {
  const denied = requireModerator(actor);
  if (denied) return denied;
  const result = await deps.review.listQueue(input, actor!.userId);
  return ok({
    data: result.data,
    meta: {
      page: input.page,
      limit: input.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / input.limit),
    },
  });
}
