import type { ActivityEntry, Event, EventFilters, EventVersion } from "../schemas/event";
import type { GeoPoint } from "../schemas/common";
import type { EventCategory, PublicationStatus, ReviewStatus, SituationStatus } from "../constants";

export interface EventPage {
  data: Event[];
  total: number;
}

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  /** Published, non-merged events only, filters applied in SQL. */
  listPublic(
    filters: EventFilters,
    page: { limit: number; offset: number },
    sort: "last_updated" | "occurred",
  ): Promise<EventPage>;
  listVersions(eventId: string): Promise<EventVersion[]>;
  /** Candidates for duplicate detection: same category, time window, distance or same district. */
  findCandidates(input: {
    category: EventCategory;
    point: GeoPoint | null;
    ubigeo: string;
    from: Date;
    to: Date;
    radiusKm: number;
    limit: number;
  }): Promise<{ event: Event; distanceKm: number | null }[]>;
  create(event: Event): Promise<Event>;
  addVersion(version: EventVersion): Promise<void>;
  /** Updates dimensions atomically, guarded by the expected current version seq. */
  updateStatus(
    id: string,
    expectedSeq: number,
    patch: Partial<{
      reviewStatus: ReviewStatus;
      publicationStatus: PublicationStatus;
      situationStatus: SituationStatus;
      currentVersionSeq: number;
      mergedIntoEventId: string | null;
      contributionCount: number;
      publishedAt: Date | null;
      lastUpdatedAt: Date;
    }>,
  ): Promise<boolean>;
  listActivity(
    filters: EventFilters,
    page: { limit: number; offset: number },
  ): Promise<{ data: ActivityEntry[]; total: number }>;
  appendActivity(entry: ActivityEntry): Promise<void>;
}
