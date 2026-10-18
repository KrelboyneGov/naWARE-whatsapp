import { queryOptions, useQuery } from "@tanstack/react-query";
import { DEMO_EVENTS, DEMO_NOW } from "@emergency-map/domain/demo";
import type { ActivityEntry, PublicEvent } from "@emergency-map/domain/schemas";
import { DEMO_DECISIONS, DEMO_EVIDENCE } from "@/components/event-detail/demo-detail";
import { buildChanges } from "@/components/event-detail/use-event-detail";

export interface HistoryData {
  now: Date;
  /** Published events only, one row per event however many updates it has. */
  events: PublicEvent[];
  /** Every change of every published event, newest first. */
  activity: ActivityEntry[];
}

/**
 * Single data entry point of /eventos. Demo data today. To go live, call `client.events.list`
 * and `client.events.activity` (same filters and pagination) and map the pages into this shape.
 */
async function fetchHistory(): Promise<HistoryData> {
  const events = DEMO_EVENTS.filter((e) => e.publicationStatus === "published");
  const activity: ActivityEntry[] = events.flatMap((event) => {
    const evidence = DEMO_EVIDENCE.filter((e) => e.eventId === event.id);
    const decisions = DEMO_DECISIONS.filter((d) => d.eventId === event.id);
    return buildChanges(event, evidence, decisions).map<ActivityEntry>((c) => ({
      id: c.id,
      eventId: event.id,
      eventTitle: event.title,
      type: c.type,
      actorRole: c.type === "decision" || c.type === "closure" ? "moderator" : event.author.role,
      summary: c.text,
      at: c.at,
      isDemo: event.isDemo,
    }));
  });
  activity.sort((a, b) => b.at.getTime() - a.at.getTime());
  return { now: DEMO_NOW, events, activity };
}

export const historyQueryOptions = queryOptions({
  queryKey: ["history", "demo"],
  queryFn: fetchHistory,
  staleTime: Infinity,
});

export function useHistoryData() {
  return useQuery(historyQueryOptions);
}
