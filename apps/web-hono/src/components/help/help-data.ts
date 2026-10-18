import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  DEMO_COLLECTION_POINTS,
  DEMO_NEEDS,
  DEMO_NOW,
  DEMO_ORGANIZATIONS,
  DEMO_TERRITORIES,
} from "@emergency-map/domain/demo";
import type {
  CollectionPoint,
  Need,
  Organization,
  PublicContact,
  TerritoryRef,
} from "@emergency-map/domain/schemas";
import type { NeedStatus } from "@emergency-map/domain/constants";
import { client } from "@/lib/orpc-client";

/** Everything the help screens read, already revived (Dates) and with one clock. */
export interface HelpSnapshot {
  /** "Now" used for every deadline comparison: the demo clock for demo data, real time for API data. */
  now: Date;
  needs: Need[];
  points: CollectionPoint[];
  organizations: Organization[];
  /** "api" when the oRPC endpoints answered; "demo" when they were unavailable. */
  source: "api" | "demo";
  /** Centroids by ubigeo, to draw destination markers. Empty for unknown territories. */
  centroids: Record<string, { lat: number; lng: number }>;
}

const date = (v: unknown): Date | null => (v ? new Date(v as string) : null);

type Jsonified<T> = { [K in keyof T]: T[K] extends Date | null ? string | null : T[K] };

function reviveNeed(n: Jsonified<Need>): Need {
  return {
    ...n,
    deadline: date(n.deadline),
    updatedAt: new Date(n.updatedAt as unknown as string),
  };
}

function revivePoint(p: Jsonified<CollectionPoint>): CollectionPoint {
  return {
    ...p,
    schedule: { ...p.schedule, confirmedAt: date(p.schedule.confirmedAt) },
    availabilityConfirmedAt: date(p.availabilityConfirmedAt),
    updatedAt: new Date(p.updatedAt as unknown as string),
  };
}

function reviveOrg(o: Jsonified<Organization>): Organization {
  return {
    ...o,
    identityReviewedAt: date(o.identityReviewedAt),
    contactReviewedAt: date(o.contactReviewedAt),
    createdAt: new Date(o.createdAt as unknown as string),
  };
}

const demoCentroids = Object.fromEntries(DEMO_TERRITORIES.map((t) => [t.ubigeo, t.centroid]));

function demoSnapshot(): HelpSnapshot {
  return {
    now: DEMO_NOW,
    needs: DEMO_NEEDS,
    points: DEMO_COLLECTION_POINTS,
    organizations: DEMO_ORGANIZATIONS,
    source: "demo",
    centroids: demoCentroids,
  };
}

/**
 * Reads needs, collection points and organization profiles from the oRPC endpoints. If the API
 * cannot answer, the typed demo dataset takes over and the snapshot says so (`source: "demo"`),
 * so the screen can tell the visitor instead of silently pretending.
 */
async function fetchHelpSnapshot(): Promise<HelpSnapshot> {
  try {
    const [needsRes, pointsRes] = await Promise.all([
      client.help.listNeeds({ onlyActive: false }),
      client.help.listCollectionPoints({}),
    ]);
    if (!needsRes.data || !pointsRes.data) throw new Error("empty help response");
    const needs = (needsRes.data as unknown as Jsonified<Need>[]).map(reviveNeed);
    const points = (pointsRes.data as unknown as Array<{ point: Jsonified<CollectionPoint> }>).map(
      (x) => revivePoint(x.point),
    );
    const orgIds = [
      ...new Set([...needs.map((n) => n.organizationId), ...points.map((p) => p.organizationId)]),
    ];
    const profiles = await Promise.all(orgIds.map((id) => client.help.getOrganization({ id })));
    const organizations = profiles.flatMap((p) =>
      p.data ? [reviveOrg(p.data.organization as unknown as Jsonified<Organization>)] : [],
    );
    return {
      now: new Date(),
      needs,
      points,
      organizations,
      source: "api",
      centroids: demoCentroids,
    };
  } catch {
    return demoSnapshot();
  }
}

export const helpQueryOptions = queryOptions({
  queryKey: ["help", "snapshot"],
  queryFn: fetchHelpSnapshot,
  staleTime: 60_000,
});

export function useHelpSnapshot() {
  return useQuery(helpQueryOptions);
}

/**
 * Status as the reader must see it: a need still marked "open" whose deadline already passed is
 * "expired", whatever the stored value says (failure 8: never listed under "vigentes").
 */
export function effectiveNeedStatus(need: Need, now: Date): NeedStatus {
  if (need.status === "open" && need.deadline && need.deadline.getTime() <= now.getTime()) {
    return "expired";
  }
  return need.status;
}

/** A need belongs under "vigentes" only if open and not past its deadline. */
export function isNeedCurrent(need: Need, now: Date): boolean {
  return effectiveNeedStatus(need, now) === "open";
}

/** Withdrawn points never appear in the directory; temporarily closed ones appear as closed. */
export function isPointListed(point: CollectionPoint): boolean {
  return point.status !== "withdrawn";
}

export function isPointOperating(point: CollectionPoint): boolean {
  return point.status === "active";
}

export const DAY_MS = 86_400_000;

/** A contact or availability confirmation older than 7 days is flagged as stale. */
export function isStale(at: Date | null, now: Date): boolean {
  return !at || now.getTime() - at.getTime() > 7 * DAY_MS;
}

export function territoryLabel(t: TerritoryRef): string {
  return t.departmentName && t.departmentName !== t.name
    ? `${t.name}, ${t.departmentName}`
    : t.name;
}

export function contactOf(contacts: PublicContact[]): PublicContact | undefined {
  return contacts[0];
}
