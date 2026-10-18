import { implement } from "@orpc/server";
import { contract } from "./contract";
import type { AppContext } from "./lib/actor";
import { eventsRouter } from "./modules/events/events.router";
import { evidenceRouter } from "./modules/evidence/evidence.router";
import { helpRouter } from "./modules/help/help.router";
import { reviewRouter } from "./modules/review/review.router";
import { sourcesRouter } from "./modules/sources/sources.router";
import { territoryRouter } from "./modules/territory/territory.router";
import { onboardingRouter } from "./modules/onboarding/onboarding.router";
import { todoRouter } from "./modules/todo/todo.router";

const impl = implement(contract).$context<AppContext>();

export const appRouter = impl.router({
  todo: todoRouter,
  events: eventsRouter,
  evidence: evidenceRouter,
  review: reviewRouter,
  territory: territoryRouter,
  help: helpRouter,
  sources: sourcesRouter,
  onboarding: onboardingRouter,
});

export type AppRouter = typeof appRouter;
