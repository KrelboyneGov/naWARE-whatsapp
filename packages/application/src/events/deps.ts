import type {
  IClock,
  IEventRepository,
  IEvidenceRepository,
  IIdGenerator,
  IReviewRepository,
} from "@emergency-map/domain/repositories";

export type EventsDeps = {
  events: IEventRepository;
  evidence: IEvidenceRepository;
  review: IReviewRepository;
  clock: IClock;
  ids: IIdGenerator;
};
