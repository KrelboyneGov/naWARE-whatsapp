/**
 * Pure filtering and sorting for /eventos. Semantics follow the shared filters: OR inside one
 * filter, AND across filters. No React and no demo imports, so it can run on API results too.
 */
import { z } from "zod";
import {
  EVENT_CATEGORIES,
  ORIGINS,
  REVIEW_STATUSES,
  SITUATION_STATUSES,
} from "@emergency-map/domain/constants";
import type { ActivityEntry, PublicEvent } from "@emergency-map/domain/schemas";
import { formatLocality } from "@/components/event-detail/format";
import { normalize } from "@/lib/map-filters";

export const HISTORY_PERIODS = ["24h", "7d", "30d", "all"] as const;
export type HistoryPeriod = (typeof HISTORY_PERIODS)[number];
export const HISTORY_PERIOD_LABELS: Record<HistoryPeriod, string> = {
  "24h": "24 h",
  "7d": "7 días",
  "30d": "30 días",
  all: "Todo",
};
const PERIOD_HOURS = { "24h": 24, "7d": 168, "30d": 720 } as const;

/** Invalid values fall back to "unset" so a stale shared link still opens the page. */
export const historySearchSchema = z.object({
  tab: z.enum(["eventos", "actividad"]).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  per: z.enum(HISTORY_PERIODS).optional().catch(undefined),
  /** Which date the period applies to. */
  date: z.enum(["occ", "upd"]).optional().catch(undefined),
  sort: z.enum(["occ", "upd"]).optional().catch(undefined),
  cat: z.array(z.enum(EVENT_CATEGORIES)).optional().catch(undefined),
  org: z.array(z.enum(ORIGINS)).optional().catch(undefined),
  rev: z.array(z.enum(REVIEW_STATUSES)).optional().catch(undefined),
  sit: z.array(z.enum(SITUATION_STATUSES)).optional().catch(undefined),
});
export type HistorySearch = z.infer<typeof historySearchSchema>;

export function filterEvents(events: readonly PublicEvent[], s: HistorySearch, now: Date) {
  const q = s.q ? normalize(s.q) : "";
  const period = s.per ?? "all";
  const dateMode = s.date ?? "occ";
  const since = period === "all" ? null : now.getTime() - PERIOD_HOURS[period] * 3_600_000;

  const list = events.filter((e) => {
    if (e.publicationStatus !== "published") return false;
    if (q && !normalize(`${e.title} ${formatLocality(e.place)}`).includes(q)) return false;
    if (s.cat?.length && !s.cat.includes(e.category)) return false;
    if (s.org?.length && !s.org.includes(e.origin)) return false;
    if (s.rev?.length && !s.rev.includes(e.reviewStatus)) return false;
    if (s.sit?.length && !s.sit.includes(e.situationStatus)) return false;
    if (since !== null) {
      const ref = dateMode === "occ" ? e.occurredAt.start : e.lastUpdatedAt;
      if (new Date(ref).getTime() < since) return false;
    }
    return true;
  });

  const key = (e: PublicEvent) =>
    s.sort === "occ" ? new Date(e.occurredAt.start).getTime() : e.lastUpdatedAt.getTime();
  return list.sort((a, b) => key(b) - key(a));
}

/** The activity feed answers to the same search, category and period filters as the list. */
export function filterActivity(
  activity: readonly ActivityEntry[],
  events: readonly PublicEvent[],
  s: HistorySearch,
  now: Date,
) {
  const allowed = new Set(filterEvents(events, s, now).map((e) => e.id));
  return activity.filter((a) => allowed.has(a.eventId));
}

export function activeFilterCount(s: HistorySearch) {
  return (s.cat?.length ?? 0) + (s.org?.length ?? 0) + (s.rev?.length ?? 0) + (s.sit?.length ?? 0);
}
