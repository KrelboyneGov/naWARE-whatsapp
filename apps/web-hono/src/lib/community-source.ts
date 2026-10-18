/**
 * Community data (signals and quick reports) behind one adapter, so screens never care who serves
 * it. Today the demo adapter merges the shared demo dataset with what this browser added; when
 * the API exposes signals, add an `api` adapter with the same shape and switch it here.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ANONYMOUS_MIN_REPORTERS,
  HAZARD_CATEGORY,
  type HazardType,
  type SignalKind,
} from "@emergency-map/domain/constants";
import {
  DEMO_EVENTS,
  DEMO_NOW,
  DEMO_QUICK_REPORTS,
  DEMO_SIGNALS,
} from "@emergency-map/domain/demo";
import {
  anonymousCorroborators,
  isQuickReportVisible,
  summarizeSignals,
} from "@emergency-map/domain/rules";
import type {
  EventSignal,
  GeoPoint,
  PublicEvent,
  QuickReport,
  SignalSummary,
} from "@emergency-map/domain/schemas";
import { useSession } from "@/hooks/use-session";
import { HAZARD_LABELS } from "@/lib/hazard-labels";

const SIGNALS_KEY = "community:signals";
const REPORTS_KEY = "community:quick-reports";
const DEVICE_KEY = "community:device";

/** Every storage access is wrapped: private windows and blocked storage throw. */
function readList<T>(key: string, revive: (raw: T) => T): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]).map(revive) : [];
  } catch {
    return [];
  }
}
function writeList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage unavailable: the answer still shows in this session through the query cache.
  }
}
const reviveDate = <T extends { createdAt: Date }>(x: T): T => ({
  ...x,
  createdAt: new Date(x.createdAt),
});

/** Stable anonymous key for this browser. Never sent anywhere but as the reporter key. */
function deviceKey(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const created = `anon-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return "anon-session";
  }
}

export interface Reporter {
  key: string;
  isAnonymous: boolean;
}

export function useReporter(): Reporter {
  const { session } = useSession();
  const userId = session?.user?.id;
  return userId ? { key: userId, isAnonymous: false } : { key: deviceKey(), isAnonymous: true };
}

export interface CommunitySnapshot {
  now: Date;
  signals: EventSignal[];
  quickReports: QuickReport[];
  /** Quick reports that are public, turned into events so every list and map can show them. */
  quickReportEvents: PublicEvent[];
}

function quickReportToEvent(r: QuickReport): PublicEvent {
  const nearest = DEMO_EVENTS.reduce<{ e: PublicEvent; d: number } | null>((acc, e) => {
    if (!e.place.point) return acc;
    const d = Math.hypot(e.place.point.lat - r.point.lat, e.place.point.lng - r.point.lng);
    return !acc || d < acc.d ? { e, d } : acc;
  }, null);
  const label = HAZARD_LABELS[r.hazardType];
  return {
    id: r.id,
    origin: "citizen",
    reviewStatus: "unverified",
    publicationStatus: "published",
    situationStatus: "recent_update",
    severity: null,
    category: HAZARD_CATEGORY[r.hazardType],
    hazardType: r.hazardType,
    title: r.note ? `${label}: ${r.note}` : `${label} reportado`,
    description: r.isAnonymous
      ? "Reporte rápido de varias personas sin cuenta, cerca del mismo punto. Sin revisión."
      : "Reporte rápido. Sin revisión.",
    place: {
      precision: "approximate",
      point: r.point,
      // District lookup is the API's job; the demo borrows the nearest demo event's district.
      territory: nearest?.e.place.territory ?? DEMO_EVENTS[0]!.place.territory,
      reference: null,
    },
    occurredAt: { precision: "exact", start: r.createdAt, end: null },
    author: { displayName: r.isAnonymous ? "Vecinos sin cuenta" : "Tú", role: "citizen" },
    contributionCount: 0,
    hasOpenNeeds: false,
    mergedIntoEventId: null,
    versionSeq: 1,
    publishedAt: r.createdAt,
    lastUpdatedAt: r.createdAt,
    createdAt: r.createdAt,
    isDemo: true,
  };
}

export async function loadCommunitySnapshot(): Promise<CommunitySnapshot> {
  const signals = [...DEMO_SIGNALS, ...readList<EventSignal>(SIGNALS_KEY, reviveDate)];
  const quickReports = [...DEMO_QUICK_REPORTS, ...readList<QuickReport>(REPORTS_KEY, reviveDate)];
  // One event per visible cluster: show the newest report of each visible group once.
  const visible = quickReports.filter((r) => isQuickReportVisible(r, quickReports));
  const shown: QuickReport[] = [];
  for (const r of [...visible].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    const sameCluster = shown.some(
      (s) =>
        s.hazardType === r.hazardType &&
        Math.hypot(s.point.lat - r.point.lat, s.point.lng - r.point.lng) < 0.01,
    );
    if (!sameCluster) shown.push(r);
  }
  return { now: DEMO_NOW, signals, quickReports, quickReportEvents: shown.map(quickReportToEvent) };
}

const communityKey = ["community", "demo"] as const;

export function useCommunity() {
  return useQuery({ queryKey: communityKey, queryFn: loadCommunitySnapshot, staleTime: Infinity });
}

export function useSignalSummary(eventId: string): SignalSummary | null {
  const { data } = useCommunity();
  if (!data) return null;
  return summarizeSignals(
    data.signals.filter((s) => s.eventId === eventId),
    data.now,
  );
}

/** The current answer of this person for this event, if any. */
export function useMySignal(eventId: string): SignalKind | null {
  const { data } = useCommunity();
  const me = useReporter();
  const mine = data?.signals
    .filter((s) => s.eventId === eventId && s.reporterKey === me.key)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  return mine?.kind ?? null;
}

export function useSubmitSignal() {
  const qc = useQueryClient();
  const me = useReporter();
  return useMutation({
    mutationFn: async (input: { eventId: string; kind: SignalKind }) => {
      const stored = readList<EventSignal>(SIGNALS_KEY, reviveDate).filter(
        (s) => !(s.eventId === input.eventId && s.reporterKey === me.key),
      );
      stored.push({
        id: `SIG-${crypto.randomUUID().slice(0, 8)}`,
        eventId: input.eventId,
        reporterKey: me.key,
        isAnonymous: me.isAnonymous,
        kind: input.kind,
        createdAt: DEMO_NOW,
        isDemo: true,
      });
      writeList(SIGNALS_KEY, stored);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: communityKey }),
  });
}

export type QuickReportOutcome =
  | { status: "published"; eventId: string }
  | { status: "waiting"; missing: number };

export function useSubmitQuickReport() {
  const qc = useQueryClient();
  const me = useReporter();
  return useMutation({
    mutationFn: async (input: {
      hazardType: HazardType;
      point: GeoPoint;
      note: string;
    }): Promise<QuickReportOutcome> => {
      const report: QuickReport = {
        id: `QR-${crypto.randomUUID().slice(0, 8)}`,
        ...input,
        reporterKey: me.key,
        isAnonymous: me.isAnonymous,
        createdAt: DEMO_NOW,
        isDemo: true,
      };
      const stored = readList<QuickReport>(REPORTS_KEY, reviveDate);
      stored.push(report);
      writeList(REPORTS_KEY, stored);
      const all = [...DEMO_QUICK_REPORTS, ...stored];
      if (isQuickReportVisible(report, all)) return { status: "published", eventId: report.id };
      return {
        status: "waiting",
        missing: ANONYMOUS_MIN_REPORTERS - anonymousCorroborators(report, all).size,
      };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: communityKey }),
  });
}
