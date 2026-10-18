import type {
  IClock,
  IEventRepository,
  IEvidenceRepository,
  IIdGenerator,
  IOfficialNoticeRepository,
  IReviewRepository,
} from "@emergency-map/domain/repositories";

export type ReviewDeps = {
  events: IEventRepository;
  evidence: IEvidenceRepository;
  review: IReviewRepository;
  notices: IOfficialNoticeRepository;
  clock: IClock;
  ids: IIdGenerator;
};
