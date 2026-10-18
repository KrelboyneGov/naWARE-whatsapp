/**
 * Pure filtering logic for the public map and list (design doc 03). Nothing here touches React
 * or the demo dataset directly, so the same functions can run against API results later.
 * Semantics: OR inside one filter, AND across different filters.
 */
import { z } from "zod";
import {
  EVENT_CATEGORIES,
  ORIGINS,
  REVIEW_STATUSES,
  type EventCategory,
  type Origin,
  type ReviewStatus,
} from "@emergency-map/domain/constants";
import type { Bounds, OfficialNotice, PublicEvent, Territory } from "@emergency-map/domain/schemas";
import type { EventFilters } from "@emergency-map/domain/schemas";

export const PERIODS = ["24h", "7d", "30d"] as const;
export type Period = (typeof PERIODS)[number];
export const PERIOD_LABELS: Record<Period, string> = {
  "24h": "Últimas 24 horas",
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
};
const PERIOD_HOURS: Record<Period, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

export const MAP_LAYERS = ["events", "notices", "help"] as const;
export type MapLayer = (typeof MAP_LAYERS)[number];
export const LAYER_LABELS: Record<MapLayer, string> = {
  events: "Eventos ciudadanos",
  notices: "Avisos oficiales",
  help: "Ayuda (puntos de acopio)",
};

/** Filters that matter to the result set. */
export interface MapEventFilters {
  categories?: EventCategory[];
  origins?: Origin[];
  reviewStatuses?: ReviewStatus[];
  period?: Period;
  withNeeds?: boolean;
  /** Territory scope by ubigeo prefix (2 = department, 4 = province, 6 = district). */
  ubigeo?: string;
  /** Visible-area scope [west, south, east, north]. Replaces `ubigeo` when set. */
  bounds?: Bounds;
}

const bboxString = z
  .string()
  .regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/)
  .optional()
  .catch(undefined);

/**
 * URL search params of /mapa. Never holds user GPS. Invalid values fall back to "unset" instead
 * of throwing, so a stale shared link still opens the map.
 */
export const mapSearchSchema = z.object({
  cat: z.array(z.enum(EVENT_CATEGORIES)).optional().catch(undefined),
  org: z.array(z.enum(ORIGINS)).optional().catch(undefined),
  rev: z.array(z.enum(REVIEW_STATUSES)).optional().catch(undefined),
  per: z.enum(PERIODS).optional().catch(undefined),
  needs: z.literal(true).optional().catch(undefined),
  /** Layers switched OFF. */
  off: z.array(z.enum(MAP_LAYERS)).optional().catch(undefined),
  sel: z.string().max(64).optional().catch(undefined),
  /** Territory scope (ubigeo). */
  ter: z
    .string()
    .regex(/^\d{2}(\d{2}(\d{2})?)?$/)
    .optional()
    .catch(undefined),
  /** Visible-area scope: "west,south,east,north". */
  bbox: bboxString,
  /** Mobile only: which view is shown. */
  view: z.enum(["map", "list"]).optional().catch(undefined),
});
export type MapSearch = z.infer<typeof mapSearchSchema>;

export function parseBbox(value: string | undefined): Bounds | undefined {
  if (!value) return undefined;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return undefined;
  return parts as Bounds;
}

export function formatBbox(b: readonly number[]): string {
  return b.map((n) => Number(n.toFixed(4))).join(",");
}

export function searchToFilters(search: MapSearch): MapEventFilters {
  return {
    categories: search.cat,
    origins: search.org,
    reviewStatuses: search.rev,
    period: search.per,
    withNeeds: search.needs,
    ubigeo: search.ter,
    bounds: parseBbox(search.bbox),
  };
}

export function periodStart(period: Period, now: Date): Date {
  return new Date(now.getTime() - PERIOD_HOURS[period] * 3_600_000);
}

/** Maps the UI filters to the shared API filter shape, ready for a future server call. */
export function toEventFilters(filters: MapEventFilters, now: Date): Partial<EventFilters> {
  return {
    categories: filters.categories,
    origins: filters.origins,
    reviewStatuses: filters.reviewStatuses,
    from: filters.period ? periodStart(filters.period, now) : undefined,
    to: filters.period ? now : undefined,
    ubigeo: filters.bounds ? undefined : filters.ubigeo,
    bounds: filters.bounds,
    withNeeds: filters.withNeeds,
  };
}

export function insideBounds(point: { lat: number; lng: number }, b: Bounds): boolean {
  return point.lng >= b[0] && point.lng <= b[2] && point.lat >= b[1] && point.lat <= b[3];
}

export function hasActiveFilters(f: MapEventFilters): boolean {
  return Boolean(
    f.categories?.length ||
    f.origins?.length ||
    f.reviewStatuses?.length ||
    f.period ||
    f.withNeeds,
  );
}

/** Applies every filter. Only published events are considered. */
export function applyEventFilters(
  events: readonly PublicEvent[],
  filters: MapEventFilters,
  now: Date,
): PublicEvent[] {
  const from = filters.period ? periodStart(filters.period, now).getTime() : null;
  return events.filter((e) => {
    if (e.publicationStatus !== "published") return false;
    if (filters.categories?.length && !filters.categories.includes(e.category)) return false;
    if (filters.origins?.length && !filters.origins.includes(e.origin)) return false;
    if (filters.reviewStatuses?.length && !filters.reviewStatuses.includes(e.reviewStatus)) {
      return false;
    }
    if (filters.withNeeds && !e.hasOpenNeeds) return false;
    if (from !== null) {
      const t = new Date(e.occurredAt.start).getTime();
      if (t < from || t > now.getTime()) return false;
    }
    if (filters.bounds) {
      // District-precision events have no public point: they cannot be placed in an area.
      if (!e.place.point || !insideBounds(e.place.point, filters.bounds)) return false;
    } else if (filters.ubigeo && !e.place.territory.ubigeo.startsWith(filters.ubigeo)) {
      return false;
    }
    return true;
  });
}

/** Official notices follow category, origin ("official") and area filters, not review state. */
export function applyNoticeFilters(
  notices: readonly OfficialNotice[],
  filters: MapEventFilters,
): OfficialNotice[] {
  return notices.filter((n) => {
    if (filters.categories?.length && !filters.categories.includes(n.category)) return false;
    if (filters.origins?.length && !filters.origins.includes("official")) return false;
    if (filters.reviewStatuses?.length || filters.withNeeds) return false;
    if (filters.ubigeo && !filters.bounds) {
      if (!n.territories.some((t) => t.ubigeo.startsWith(filters.ubigeo!))) return false;
    }
    return true;
  });
}

/** Accent- and case-insensitive text normalisation for searches. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function territoryLabel(t: {
  name: string;
  provinceName: string | null;
  departmentName: string;
}): string {
  return [t.name, t.provinceName, t.departmentName].filter(Boolean).join(", ");
}

/** Searches district, province and department names; returns the full hierarchy to show. */
export function searchTerritories(
  territories: readonly Territory[],
  query: string,
  limit = 8,
): Territory[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  return territories
    .filter((t) => normalize(`${t.name} ${t.provinceName ?? ""} ${t.departmentName}`).includes(q))
    .slice(0, limit);
}
