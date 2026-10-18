import type { Actor, Need, UpdateNeedStatusInput } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { invalidTransition, notFound, unauthenticated } from "../shared/result";
import type { HelpDeps } from "./deps";
import { requireOrganizationAccess } from "./support";

export async function updateNeedStatus(
  deps: Pick<HelpDeps, "needs" | "clock">,
  input: UpdateNeedStatusInput,
  actor?: Actor,
): Promise<UseCaseResult<Need>> {
  if (!actor) return unauthenticated();
  const need = await deps.needs.findById(input.needId);
  if (!need) return notFound("need", input.needId);

  const denied = requireOrganizationAccess(actor, need.organizationId);
  if (denied) return denied;
  if (need.status === input.status) return invalidTransition(need.status, input.status);

  // Scoped by organization in the query as well (security-hardening).
  const updated = await deps.needs.updateStatus(
    need.id,
    need.organizationId,
    input.status,
    input.note.trim(),
    deps.clock.now(),
  );
  if (!updated) return notFound("need", input.needId);
  const fresh = await deps.needs.findById(need.id);
  return fresh ? ok(fresh) : notFound("need", input.needId);
}
