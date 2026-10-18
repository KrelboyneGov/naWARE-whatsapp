import type { Repositories } from "@emergency-map/domain/repositories";
import type { DatabaseClient } from "../client";
import { TodoRepository } from "./todo.repository";
import { EventRepository } from "./event.repository";
import { EvidenceRepository } from "./evidence.repository";
import { ReviewRepository } from "./review.repository";
import { TerritoryRepository } from "./territory.repository";
import { OfficialNoticeRepository } from "./notice.repository";
import { DataSourceRepository } from "./source.repository";
import {
  CollectionPointRepository,
  NeedRepository,
  OrganizationRepository,
} from "./help.repository";

export { TodoRepository } from "./todo.repository";
export { EventRepository } from "./event.repository";
export { EvidenceRepository } from "./evidence.repository";
export { ReviewRepository } from "./review.repository";
export { TerritoryRepository } from "./territory.repository";
export { OfficialNoticeRepository } from "./notice.repository";
export { DataSourceRepository } from "./source.repository";
export {
  CollectionPointRepository,
  NeedRepository,
  OrganizationRepository,
} from "./help.repository";

/** Wires every domain repository interface to its Drizzle implementation. */
export function createRepositories(db: DatabaseClient): Repositories {
  return {
    todos: new TodoRepository(db),
    events: new EventRepository(db),
    evidence: new EvidenceRepository(db),
    review: new ReviewRepository(db),
    territories: new TerritoryRepository(db),
    notices: new OfficialNoticeRepository(db),
    organizations: new OrganizationRepository(db),
    needs: new NeedRepository(db),
    collectionPoints: new CollectionPointRepository(db),
    dataSources: new DataSourceRepository(db),
  };
}
