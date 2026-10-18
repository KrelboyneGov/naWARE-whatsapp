import { implement } from "@orpc/server";
import {
  findPossibleDuplicates,
  getEvent,
  listActivity,
  listEvents,
  shareSummary,
  submitReport,
} from "@emergency-map/application";
import { eventsContract } from "../../contract/events.contract";
import { optionalActor, requireActor, type AppContext } from "../../lib/actor";
import { eventsDeps } from "../../lib/container";
import { toPublicEvent } from "../../lib/public-mappers";
import { toEnvelope, unwrapResult } from "../../lib/result-to-orpc";

const impl = implement(eventsContract).$context<AppContext>();

export const eventsRouter = impl.router({
  list: impl.list.handler(async ({ input }) => {
    const page = unwrapResult(await listEvents(eventsDeps, input));
    return { data: page.data, error: null, meta: { pagination: page.meta } };
  }),

  get: impl.get
    .use(optionalActor)
    .handler(async ({ input, context }) =>
      toEnvelope(await getEvent(eventsDeps, { eventId: input.id }, context.actor ?? undefined)),
    ),

  submit: impl.submit.use(requireActor).handler(async ({ input, context }) => {
    const event = unwrapResult(await submitReport(eventsDeps, input, context.actor));
    return { data: toPublicEvent(event), error: null };
  }),

  findDuplicates: impl.findDuplicates.handler(async ({ input }) =>
    toEnvelope(await findPossibleDuplicates(eventsDeps, input)),
  ),

  activity: impl.activity.handler(async ({ input }) => {
    const page = unwrapResult(await listActivity(eventsDeps, input));
    return { data: page.data, error: null, meta: { pagination: page.meta } };
  }),

  share: impl.share
    .use(optionalActor)
    .handler(async ({ input, context }) =>
      toEnvelope(await shareSummary(eventsDeps, { eventId: input.id }, context.actor ?? undefined)),
    ),
});
