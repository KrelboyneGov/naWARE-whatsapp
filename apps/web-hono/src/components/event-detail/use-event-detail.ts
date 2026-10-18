import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  DEMO_EVENTS,
  DEMO_NEEDS,
  DEMO_NOTICES,
  DEMO_NOW,
  DEMO_ORGANIZATIONS,
  DEMO_PENDING_EVENTS,
  DEMO_TERRITORIES,
} from "@emergency-map/domain/demo";
import type {
  Need,
  OfficialNotice,
  Organization,
  PublicEvent,
  PublicEvidence,
  PublicReviewDecision,
  Territory,
} from "@emergency-map/domain/schemas";
import type { ActivityType } from "@emergency-map/domain/constants";
import { ACTIVITY_LABELS, ACTOR_ROLE_LABELS } from "@/components/history/activity-labels";
import { loadCommunitySnapshot } from "@/lib/community-source";
import { DEMO_DECISIONS, DEMO_EVIDENCE } from "./demo-detail";

/** One line of "Qué cambió". Built from versions, evidence and public decisions only. */
export interface ChangeEntry {
  id: string;
  type: ActivityType;
  typeLabel: string;
  actor: string;
  roleLabel: string;
  text: string;
  at: Date;
}

export interface EventDetailData {
  now: Date;
  event: PublicEvent;
  /** Only evidence with public visibility. */
  evidence: PublicEvidence[];
  decisions: PublicReviewDecision[];
  /** Official notices linked to this event (official origin or official backing only). */
  sources: OfficialNotice[];
  needs: { need: Need; organization: Organization | undefined }[];
  /** District centroid, used only to frame the map when the event has no public point. */
  districtCentroid: { lat: number; lng: number } | null;
  changes: ChangeEntry[];
}

/**
 * What the page can show for an id. Anything that is not "ok" renders a special state:
 * - withdrawn: hidden / rejected by a review decision
 * - merged: points at the main event
 * - restricted: pending review, visible only to the author and reviewers
 * - not_found: unknown id (never read as "it did not happen")
 */
export type EventDetailResult =
  | { status: "ok"; data: EventDetailData }
  | { status: "withdrawn" }
  | { status: "merged"; mainEventId: string | null }
  | { status: "restricted" }
  | { status: "not_found" };

export function buildChanges(
  event: PublicEvent,
  evidence: readonly PublicEvidence[],
  decisions: readonly PublicReviewDecision[],
): ChangeEntry[] {
  const entries: ChangeEntry[] = [
    {
      id: `${event.id}-created`,
      type: "new_report",
      typeLabel: ACTIVITY_LABELS.new_report,
      actor: event.author.displayName,
      roleLabel: ACTOR_ROLE_LABELS[event.author.role],
      text: "Se recibió el reporte original.",
      at: event.createdAt,
    },
    ...evidence.map<ChangeEntry>((e) => ({
      id: e.id,
      type: "new_evidence",
      typeLabel: ACTIVITY_LABELS.new_evidence,
      actor: e.author.displayName,
      roleLabel: ACTOR_ROLE_LABELS[e.author.role],
      text: e.description,
      at: e.receivedAt,
    })),
    ...decisions.map<ChangeEntry>((d) => ({
      id: d.id,
      type: d.kind === "closure" ? "closure" : "decision",
      typeLabel: d.kind === "closure" ? ACTIVITY_LABELS.closure : ACTIVITY_LABELS.decision,
      actor: "Equipo de revisión",
      roleLabel: ACTOR_ROLE_LABELS.moderator,
      text: d.publicReason,
      at: d.decidedAt,
    })),
  ];
  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/**
 * Single data entry point of the event page. The demo dataset is the queryFn today; swap the body
 * for `client.events.get({ id })` (contract: events.get -> event, evidence, decisions,
 * mergedIntoEventId) and the page keeps working on the same shapes.
 */
async function fetchEventDetail(id: string): Promise<EventDetailResult> {
  const pending = DEMO_PENDING_EVENTS.find((e) => e.id === id);
  if (pending) return { status: "restricted" };

  const event =
    DEMO_EVENTS.find((e) => e.id === id) ??
    (await loadCommunitySnapshot()).quickReportEvents.find((e) => e.id === id);
  if (!event) return { status: "not_found" };
  if (event.publicationStatus === "merged") {
    return { status: "merged", mainEventId: event.mergedIntoEventId };
  }
  if (event.publicationStatus === "hidden" || event.publicationStatus === "rejected") {
    return { status: "withdrawn" };
  }
  if (event.publicationStatus !== "published") return { status: "restricted" };

  const evidence = DEMO_EVIDENCE.filter((e) => e.eventId === id && e.visibility === "public");
  const decisions = DEMO_DECISIONS.filter((d) => d.eventId === id);
  const ubigeo = event.place.territory.ubigeo;
  // A notice is a source only when the event is official or was explicitly linked as official
  // backing by a review decision. Matching district and category alone never links them.
  const linkedToOfficial =
    event.origin === "official" || event.reviewStatus === "officially_backed";
  const sources = DEMO_NOTICES.filter(
    (n) =>
      linkedToOfficial &&
      n.category === event.category &&
      n.validity === "active" &&
      n.territories.some((t) => t.ubigeo === ubigeo),
  );
  const needs = DEMO_NEEDS.filter((n) => n.eventId === id && n.status === "open").map((need) => ({
    need,
    organization: DEMO_ORGANIZATIONS.find((o) => o.id === need.organizationId),
  }));
  const territory: Territory | undefined = DEMO_TERRITORIES.find((t) => t.ubigeo === ubigeo);

  return {
    status: "ok",
    data: {
      now: DEMO_NOW,
      event,
      evidence,
      decisions,
      sources,
      needs,
      districtCentroid: territory?.centroid ?? null,
      changes: buildChanges(event, evidence, decisions),
    },
  };
}

export const eventDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["event-detail", "demo", id],
    queryFn: () => fetchEventDetail(id),
    staleTime: Infinity,
  });

export function useEventDetail(id: string) {
  return useQuery(eventDetailQueryOptions(id));
}
