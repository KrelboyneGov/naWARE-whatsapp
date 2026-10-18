import { implement } from "@orpc/server";
import { addEvidence, listEvidenceForEvent, requestUploadUrl } from "@emergency-map/application";
import { evidenceContract } from "../../contract/evidence.contract";
import { optionalActor, requireActor, type AppContext } from "../../lib/actor";
import { evidenceDeps } from "../../lib/container";
import { toPublicEvidence } from "../../lib/public-mappers";
import { toEnvelope, unwrapResult } from "../../lib/result-to-orpc";

const impl = implement(evidenceContract).$context<AppContext>();

export const evidenceRouter = impl.router({
  listForEvent: impl.listForEvent
    .use(optionalActor)
    .handler(async ({ input, context }) =>
      toEnvelope(
        await listEvidenceForEvent(evidenceDeps, { eventId: input.id }, context.actor ?? undefined),
      ),
    ),

  add: impl.add.use(requireActor).handler(async ({ input, context }) => {
    const { id, ...rest } = input;
    const evidence = unwrapResult(
      await addEvidence(evidenceDeps, { ...rest, eventId: id }, context.actor),
    );
    return { data: toPublicEvidence(evidence), error: null };
  }),

  requestUploadUrl: impl.requestUploadUrl
    .use(requireActor)
    .handler(async ({ input, context }) =>
      toEnvelope(await requestUploadUrl(evidenceDeps, input, context.actor)),
    ),
});
