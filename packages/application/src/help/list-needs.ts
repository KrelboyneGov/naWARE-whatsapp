import type { ListNeedsInput, Need } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import type { HelpDeps } from "./deps";
import { effectiveNeed, isActiveNeed } from "./support";

/**
 * With onlyActive, covered, expired and past-deadline needs are excluded (failure 8). Without
 * it, past-deadline needs are returned as "expired" so history never shows them as open.
 */
export async function listNeeds(
  deps: Pick<HelpDeps, "needs" | "clock">,
  input: ListNeedsInput,
): Promise<UseCaseResult<Need[]>> {
  const now = deps.clock.now();
  const needs = (await deps.needs.list(input, now)).map((n) => effectiveNeed(n, now));
  return ok(input.onlyActive ? needs.filter(isActiveNeed) : needs);
}
