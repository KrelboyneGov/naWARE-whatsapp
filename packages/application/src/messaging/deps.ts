import type {
  IClock,
  IEventRepository,
  IForecastPort,
  IIdGenerator,
  ILog,
  ILlmPort,
  IMessagingStore,
  INotificationPort,
  IOfficialNoticeRepository,
  IOfficialNoticesFeed,
  IOrganizationRepository,
  ITerritoryRepository,
} from "@emergency-map/domain/repositories";
import type { FieldCipher } from "@emergency-map/domain/rules";

export interface MessagingDeps {
  store: IMessagingStore;
  cipher: FieldCipher;
  clock: IClock;
  ids: IIdGenerator;
  notifications: INotificationPort;
  llm: ILlmPort;
  forecast: IForecastPort;
  /** Live SENAMHI notices. Optional: without it the agent says it could not check them. */
  officialFeed?: IOfficialNoticesFeed;
  log: ILog;
  territories: Pick<ITerritoryRepository, "search" | "findByUbigeo" | "findDistrictAt">;
  notices: Pick<IOfficialNoticeRepository, "findIntersectingTerritory">;
  events: Pick<IEventRepository, "listPublic">;
  organizations: Pick<IOrganizationRepository, "listCoveringTerritory">;
  appPublicUrl: string;
  /** Defaults to the catalog welcome, which names the unverified emergency numbers. */
  welcomeText?: string;
  retentionDays: number;
  /** False while the WhatsApp sender reports canSendTemplates=false. */
  templatesEnabled: boolean;
  maxAttempts: number;
  minFollowUpIntervalMs: number;
}
