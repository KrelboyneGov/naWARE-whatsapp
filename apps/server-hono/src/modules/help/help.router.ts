import { implement } from "@orpc/server";
import {
  createCollectionPoint,
  createNeed,
  createOrganization,
  getOrganizationProfile,
  listCollectionPoints,
  listNeeds,
  updateNeedStatus,
} from "@emergency-map/application";
import { helpContract } from "../../contract/help.contract";
import { requireActor, type AppContext } from "../../lib/actor";
import { helpDeps } from "../../lib/container";
import { toEnvelope } from "../../lib/result-to-orpc";

const impl = implement(helpContract).$context<AppContext>();

export const helpRouter = impl.router({
  listNeeds: impl.listNeeds.handler(async ({ input }) =>
    toEnvelope(await listNeeds(helpDeps, input)),
  ),

  createNeed: impl.createNeed.use(requireActor).handler(async ({ input, context }) => {
    const { id, ...rest } = input;
    return toEnvelope(await createNeed(helpDeps, { ...rest, organizationId: id }, context.actor));
  }),

  updateNeedStatus: impl.updateNeedStatus.use(requireActor).handler(async ({ input, context }) => {
    const { id, ...rest } = input;
    return toEnvelope(await updateNeedStatus(helpDeps, { ...rest, needId: id }, context.actor));
  }),

  listCollectionPoints: impl.listCollectionPoints.handler(async ({ input }) => {
    const { lat, lng, ...rest } = input;
    const near = lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
    return toEnvelope(await listCollectionPoints(helpDeps, { ...rest, near }));
  }),

  createCollectionPoint: impl.createCollectionPoint
    .use(requireActor)
    .handler(async ({ input, context }) => {
      const { id, ...rest } = input;
      return toEnvelope(
        await createCollectionPoint(helpDeps, { ...rest, organizationId: id }, context.actor),
      );
    }),

  getOrganization: impl.getOrganization.handler(async ({ input }) =>
    toEnvelope(await getOrganizationProfile(helpDeps, { organizationId: input.id })),
  ),

  createOrganization: impl.createOrganization
    .use(requireActor)
    .handler(async ({ input, context }) =>
      toEnvelope(await createOrganization(helpDeps, input, context.actor)),
    ),
});
