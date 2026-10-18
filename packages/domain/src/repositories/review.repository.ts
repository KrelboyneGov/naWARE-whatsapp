import type {
  IssueReport,
  ReviewDecision,
  ReviewQueueFilters,
  ReviewQueueItem,
} from "../schemas/review";
import type { QueueReason } from "../constants";

export interface IReviewRepository {
  listQueue(
    filters: ReviewQueueFilters,
    actorId: string,
  ): Promise<{ data: ReviewQueueItem[]; total: number }>;
  enqueue(item: {
    eventId: string;
    reason: QueueReason;
    versionSeq: number;
    at: Date;
  }): Promise<void>;
  dequeue(eventId: string): Promise<void>;
  assign(eventId: string, userId: string): Promise<void>;
  listDecisions(eventId: string): Promise<ReviewDecision[]>;
  recordDecision(decision: ReviewDecision): Promise<void>;
  createIssue(issue: IssueReport): Promise<void>;
}
