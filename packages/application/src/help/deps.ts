import type {
  IClock,
  ICollectionPointRepository,
  IIdGenerator,
  INeedRepository,
  IOrganizationRepository,
} from "@emergency-map/domain/repositories";

export type HelpDeps = {
  organizations: IOrganizationRepository;
  needs: INeedRepository;
  collectionPoints: ICollectionPointRepository;
  clock: IClock;
  ids: IIdGenerator;
};
