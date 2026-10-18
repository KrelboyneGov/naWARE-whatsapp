export type { ITodoRepository } from "./todo.repository";
export type {
  IClock,
  IIdGenerator,
  IFileStorage,
  IOfficialNoticeImporter,
  Ingestor,
} from "./ports";
export type { IEventRepository, EventPage } from "./event.repository";
export type { IEvidenceRepository } from "./evidence.repository";
export type { IReviewRepository } from "./review.repository";
export type { ITerritoryRepository } from "./territory.repository";
export type { IOfficialNoticeRepository } from "./notice.repository";
export type {
  IOrganizationRepository,
  INeedRepository,
  ICollectionPointRepository,
} from "./help.repository";
export type { IDataSourceRepository } from "./source.repository";
export type {
  IMessagingStore,
  INotificationPort,
  ILlmPort,
  IForecastPort,
  ILog,
  NotificationSendResult,
  SendTextInput,
  SendTemplateInput,
  LlmMessage,
  LlmToolDefinition,
  LlmToolCall,
  LlmCompletion,
  ForecastQuery,
  ForecastSnapshot,
} from "./messaging";

import type { ITodoRepository } from "./todo.repository";
import type { IEventRepository } from "./event.repository";
import type { IEvidenceRepository } from "./evidence.repository";
import type { IReviewRepository } from "./review.repository";
import type { ITerritoryRepository } from "./territory.repository";
import type { IOfficialNoticeRepository } from "./notice.repository";
import type {
  ICollectionPointRepository,
  INeedRepository,
  IOrganizationRepository,
} from "./help.repository";
import type { IDataSourceRepository } from "./source.repository";

/** What `createRepositories(db)` in infra-db returns. */
export interface Repositories {
  todos: ITodoRepository;
  events: IEventRepository;
  evidence: IEvidenceRepository;
  review: IReviewRepository;
  territories: ITerritoryRepository;
  notices: IOfficialNoticeRepository;
  organizations: IOrganizationRepository;
  needs: INeedRepository;
  collectionPoints: ICollectionPointRepository;
  dataSources: IDataSourceRepository;
}
