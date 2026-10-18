import { ORPCError } from "@orpc/client";
import { queryOptions } from "@tanstack/react-query";
import type { QueueReason, PublicationStatus } from "@emergency-map/domain/constants";
import { DEMO_EVENTS, DEMO_PENDING_EVENTS } from "@emergency-map/domain/demo";
import { client } from "@/lib/orpc-client";

type QueueResponse = Awaited<ReturnType<typeof client.review.queue>>;
export type QueueItem = NonNullable<QueueResponse["data"]>[number];
type CaseResponse = Awaited<ReturnType<typeof client.review.case>>;
export type ReviewCase = NonNullable<CaseResponse["data"]>;
export type CaseEvent = ReviewCase["event"];
type DuplicatesResponse = Awaited<ReturnType<typeof client.events.findDuplicates>>;
export type DuplicateCandidate = NonNullable<DuplicatesResponse["data"]>[number];

/** "api" = real answer; "demo" = the API was unreachable and demo data stands in (reads only). */
export type DataSource = "api" | "demo";

export interface QueueFilters {
  publicationStatuses: PublicationStatus[];
  reasons: QueueReason[];
  assignedToMe: boolean;
}

/** 401/403 mean "not allowed": never masked with demo data. */
export function isAccessError(error: unknown): boolean {
  return (
    error instanceof ORPCError && (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
  );
}

export interface StaleVersionInfo {
  currentSeq: number | null;
  attemptedSeq: number | null;
}

/** Returns details when the API rejected a decision because the version is no longer current. */
export function asStaleVersion(error: unknown): StaleVersionInfo | null {
  if (!(error instanceof ORPCError) || error.code !== "CONFLICT") return null;
  const data = (error.data ?? {}) as { currentSeq?: unknown; attemptedSeq?: unknown };
  if (typeof data.currentSeq !== "number") return null;
  return {
    currentSeq: data.currentSeq,
    attemptedSeq: typeof data.attemptedSeq === "number" ? data.attemptedSeq : null,
  };
}

function demoQueue(): QueueItem[] {
  const pending = DEMO_PENDING_EVENTS.map((e) => ({
    event: e,
    reason: "possible_duplicate" as const,
  }));
  const disputed = DEMO_EVENTS.filter((e) => e.reviewStatus === "disputed").map((e) => ({
    event: e,
    reason: "disputed" as const,
  }));
  return JSON.parse(
    JSON.stringify(
      [...pending, ...disputed].map(({ event, reason }) => ({
        event,
        reason,
        pendingVersionSeq: event.versionSeq,
        pendingEvidenceCount: event.contributionCount,
        assignedTo: null,
        enteredQueueAt: event.createdAt,
      })),
    ),
  ) as QueueItem[];
}

export function queueQueryOptions(filters: QueueFilters) {
  return queryOptions({
    queryKey: ["review", "queue", filters],
    retry: false,
    staleTime: 15_000,
    queryFn: async (): Promise<{ items: QueueItem[]; source: DataSource }> => {
      try {
        const res = await client.review.queue({
          page: 1,
          limit: 100,
          ...(filters.publicationStatuses.length
            ? { publicationStatuses: filters.publicationStatuses }
            : {}),
          ...(filters.reasons.length ? { reasons: filters.reasons } : {}),
          ...(filters.assignedToMe ? { assignedToMe: true } : {}),
        });
        return { items: res.data ?? [], source: "api" };
      } catch (error) {
        if (isAccessError(error)) throw error;
        return { items: demoQueue(), source: "demo" };
      }
    },
  });
}

export function caseQueryOptions(eventId: string) {
  return queryOptions({
    queryKey: ["review", "case", eventId],
    retry: false,
    // Refetching in the background must never silently change the version being reviewed.
    staleTime: Infinity,
    queryFn: async (): Promise<{ data: ReviewCase | null; source: DataSource }> => {
      try {
        const res = await client.review.case({ eventId });
        return { data: res.data, source: "api" };
      } catch (error) {
        if (isAccessError(error)) throw error;
        if (error instanceof ORPCError && error.code === "NOT_FOUND") {
          return { data: null, source: "api" };
        }
        const event = [...DEMO_PENDING_EVENTS, ...DEMO_EVENTS].find((e) => e.id === eventId);
        if (!event) return { data: null, source: "demo" };
        const data = JSON.parse(
          JSON.stringify({ event, versions: [], evidence: [], decisions: [] }),
        ) as ReviewCase;
        return { data, source: "demo" };
      }
    },
  });
}

export function duplicatesQueryOptions(event: CaseEvent) {
  return queryOptions({
    queryKey: ["review", "duplicates", event.id, event.versionSeq],
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<DuplicateCandidate[]> => {
      try {
        const res = await client.events.findDuplicates({
          category: event.category,
          place: event.place,
          occurredAt: {
            ...event.occurredAt,
            start: new Date(event.occurredAt.start),
            end: event.occurredAt.end ? new Date(event.occurredAt.end) : null,
          },
        });
        return (res.data ?? []).filter((c) => c.event.id !== event.id);
      } catch {
        return [];
      }
    },
  });
}
