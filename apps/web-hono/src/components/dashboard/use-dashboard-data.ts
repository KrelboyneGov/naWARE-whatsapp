import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  DEMO_EVENTS,
  DEMO_NEEDS,
  DEMO_NOTICES,
  DEMO_NOW,
  DEMO_ORGANIZATIONS,
  DEMO_TERRITORIES,
} from "@emergency-map/domain/demo";
import type {
  Need,
  OfficialNotice,
  Organization,
  PublicEvent,
  Territory,
} from "@emergency-map/domain/schemas";

/** Window shown on the home dashboard, in days, counted back from "now". */
export const DASHBOARD_PERIOD_DAYS = 7;
export const DASHBOARD_PERIOD_LABEL = `últimos ${DASHBOARD_PERIOD_DAYS} días`;

export interface DashboardSnapshot {
  now: Date;
  events: PublicEvent[];
  notices: OfficialNotice[];
  needs: Need[];
  organizations: Organization[];
  territories: Territory[];
}

/**
 * Single data entry point of the dashboard. Today the queryFn returns the demo dataset; swapping
 * to the oRPC client later means changing only this function.
 */
async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  return {
    now: DEMO_NOW,
    events: DEMO_EVENTS,
    notices: DEMO_NOTICES,
    needs: DEMO_NEEDS,
    organizations: DEMO_ORGANIZATIONS,
    territories: DEMO_TERRITORIES,
  };
}

export const dashboardQueryOptions = queryOptions({
  queryKey: ["dashboard", "snapshot"],
  queryFn: fetchDashboardSnapshot,
  staleTime: Infinity,
});

export function useDashboardSnapshot() {
  return useQuery(dashboardQueryOptions);
}

/** Scope selector value: whole country or one district ubigeo. */
export type Scope = { kind: "peru" } | { kind: "district"; ubigeo: string; name: string };

export interface DashboardView {
  events: PublicEvent[];
  activeNotices: OfficialNotice[];
  openNeeds: Need[];
  /** Distinct sources behind the notices counted, for the coverage note. */
  noticeSourceCount: number;
}

/**
 * Applies scope and period once. The list, the map markers and every indicator read from the
 * returned arrays, so counts can never disagree.
 */
export function selectDashboardView(snapshot: DashboardSnapshot, scope: Scope): DashboardView {
  const since = snapshot.now.getTime() - DASHBOARD_PERIOD_DAYS * 24 * 3_600_000;
  const inScope = (ubigeo: string) => scope.kind === "peru" || ubigeo === scope.ubigeo;

  const events = snapshot.events
    .filter(
      (e) =>
        e.publicationStatus === "published" &&
        e.lastUpdatedAt.getTime() >= since &&
        inScope(e.place.territory.ubigeo),
    )
    .sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime());

  const activeNotices = snapshot.notices.filter(
    (n) => n.validity === "active" && n.territories.some((t) => inScope(t.ubigeo)),
  );
  const openNeeds = snapshot.needs.filter(
    (n) => n.status === "open" && inScope(n.destinationTerritory.ubigeo),
  );

  return {
    events,
    activeNotices,
    openNeeds,
    noticeSourceCount: new Set(activeNotices.map((n) => n.sourceId)).size,
  };
}

/** Map point of an event: its public point, or the district centroid when only the district is known. */
export function eventPoint(
  event: PublicEvent,
  territories: Territory[],
): { lat: number; lng: number } | null {
  if (event.place.point) return event.place.point;
  return territories.find((t) => t.ubigeo === event.place.territory.ubigeo)?.centroid ?? null;
}
