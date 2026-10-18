import { createDatabaseClient } from "@emergency-map/infra-db/client";
import { createRepositories } from "@emergency-map/infra-db/repositories";
import type {
  EventsDeps,
  EvidenceDeps,
  HelpDeps,
  ReviewDeps,
  SourcesDeps,
  TerritoryDeps,
} from "@emergency-map/application";
import { env } from "../env";
import { demoFileStorage, demoNoticeImporter, systemClock, uuidIdGenerator } from "./demo-adapters";

/**
 * Composition root (CLAUDE.md: apps are the only place where repositories are wired into use
 * cases). Each module gets the narrow deps object its use cases declare.
 */
const db = createDatabaseClient(env.DATABASE_URL);

export const repositories = createRepositories(db);

const clock = systemClock;
const ids = uuidIdGenerator;

export const eventsDeps: EventsDeps = {
  events: repositories.events,
  evidence: repositories.evidence,
  review: repositories.review,
  clock,
  ids,
};

export const evidenceDeps: EvidenceDeps = {
  events: repositories.events,
  evidence: repositories.evidence,
  review: repositories.review,
  storage: demoFileStorage,
  clock,
  ids,
};

export const reviewDeps: ReviewDeps = {
  events: repositories.events,
  evidence: repositories.evidence,
  review: repositories.review,
  notices: repositories.notices,
  clock,
  ids,
};

export const territoryDeps: TerritoryDeps = {
  territories: repositories.territories,
  events: repositories.events,
  notices: repositories.notices,
  organizations: repositories.organizations,
  needs: repositories.needs,
  collectionPoints: repositories.collectionPoints,
  clock,
};

export const helpDeps: HelpDeps = {
  organizations: repositories.organizations,
  needs: repositories.needs,
  collectionPoints: repositories.collectionPoints,
  clock,
  ids,
};

export const sourcesDeps: SourcesDeps = {
  dataSources: repositories.dataSources,
  notices: repositories.notices,
  importers: [demoNoticeImporter],
  clock,
  ids,
};
