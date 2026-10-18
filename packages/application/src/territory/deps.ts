import type {
  IClock,
  ICollectionPointRepository,
  IEventRepository,
  INeedRepository,
  IOfficialNoticeRepository,
  IOrganizationRepository,
  ITerritoryRepository,
} from "@emergency-map/domain/repositories";

export type TerritoryDeps = {
  territories: ITerritoryRepository;
  events: IEventRepository;
  notices: IOfficialNoticeRepository;
  organizations: IOrganizationRepository;
  needs: INeedRepository;
  collectionPoints: ICollectionPointRepository;
  clock: IClock;
};
