import { implement } from "@orpc/server";
import {
  decideCorroboration,
  decidePublication,
  decideRelation,
  getReviewCase,
  listReviewQueue,
  reportClosure,
  reportIssue,
} from "@emergency-map/application";
import { reviewContract } from "../../contract/review.contract";
import { requireActor, requireRole, type AppContext } from "../../lib/actor";
import { reviewDeps } from "../../lib/container";
import { toPublicEvidence, toPublicIssue } from "../../lib/public-mappers";
import { toEnvelope, unwrapResult } from "../../lib/result-to-orpc";

const impl = implement(reviewContract).$context<AppContext>();
const moderator = requireRole("moderator");

export const reviewRouter = impl.router({
  queue: impl.queue.use(moderator).handler(async ({ input, context }) => {
    const page = unwrapResult(await listReviewQueue(reviewDeps, input, context.actor));
    return { data: page.data, error: null, meta: { pagination: page.meta } };
  }),

  case: impl.case.use(moderator).handler(async ({ input, context }) => {
    const reviewCase = unwrapResult(await getReviewCase(reviewDeps, input, context.actor));
    return {
      data: { ...reviewCase, evidence: reviewCase.evidence.map(toPublicEvidence) },
      error: null,
    };
  }),

  decidePublication: impl.decidePublication
    .use(moderator)
    .handler(async ({ input, context }) =>
      toEnvelope(await decidePublication(reviewDeps, input, context.actor)),
    ),

  decideCorroboration: impl.decideCorroboration
    .use(moderator)
    .handler(async ({ input, context }) =>
      toEnvelope(await decideCorroboration(reviewDeps, input, context.actor)),
    ),

  decideRelation: impl.decideRelation
    .use(moderator)
    .handler(async ({ input, context }) =>
      toEnvelope(await decideRelation(reviewDeps, input, context.actor)),
    ),

  reportClosure: impl.reportClosure
    .use(moderator)
    .handler(async ({ input, context }) =>
      toEnvelope(await reportClosure(reviewDeps, input, context.actor)),
    ),

  reportIssue: impl.reportIssue.use(requireActor).handler(async ({ input, context }) => {
    const issue = unwrapResult(await reportIssue(reviewDeps, input, context.actor));
    return { data: toPublicIssue(issue), error: null };
  }),
});
