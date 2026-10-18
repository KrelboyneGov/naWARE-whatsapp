import type {
  IClock,
  IEventRepository,
  IEvidenceRepository,
  IFileStorage,
  IIdGenerator,
  IReviewRepository,
} from "@emergency-map/domain/repositories";

export type EvidenceDeps = {
  events: IEventRepository;
  evidence: IEvidenceRepository;
  review: IReviewRepository;
  storage: IFileStorage;
  clock: IClock;
  ids: IIdGenerator;
};
