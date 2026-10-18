import { oc } from "@orpc/contract";
import { todoContract } from "./todo.contract";
import { eventsContract } from "./events.contract";
import { evidenceContract } from "./evidence.contract";
import { reviewContract } from "./review.contract";
import { territoryContract } from "./territory.contract";
import { helpContract } from "./help.contract";
import { sourcesContract } from "./sources.contract";
import { onboardingContract } from "./onboarding.contract";

export const contract = oc.router({
  todo: todoContract,
  events: eventsContract,
  evidence: evidenceContract,
  review: reviewContract,
  territory: territoryContract,
  help: helpContract,
  sources: sourcesContract,
  onboarding: onboardingContract,
});

export {
  todoContract,
  eventsContract,
  evidenceContract,
  reviewContract,
  territoryContract,
  helpContract,
  sourcesContract,
  onboardingContract,
};

export type Contract = typeof contract;
