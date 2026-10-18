import type { Event, OfficialNotice } from "@emergency-map/domain/schemas";
import type { SemaphoreLevel } from "@emergency-map/domain/rules";
import { foldText, normalizeSemaphoreLevel, semaphoreRank } from "@emergency-map/domain/rules";
import type { MessagingDeps } from "./deps";

export interface ResolvedPlace {
  found: boolean;
  name: string;
  ubigeo: string | null;
  lat: number | null;
  lng: number | null;
}

export interface AlertReading {
  level: SemaphoreLevel;
  source: string | null;
  updatedAt: string | null;
  noticeId: string | null;
  cause: string | null;
  mentionsSutran: boolean;
  factual: string;
}

export interface HistoryReading {
  estimate: string | null;
  mentionsSutran: boolean;
}

export interface CommunityReading {
  summary: string;
  mentionsSutran: boolean;
}

export function formatTimeLima(value: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export function formatDayLima(value: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "short",
  }).format(value);
}

export async function resolvePlace(
  deps: Pick<MessagingDeps, "territories">,
  query: string,
  home: { name: string; ubigeo: string | null },
): Promise<ResolvedPlace> {
  if (query === "hogar") {
    if (home.ubigeo) {
      const territory = await deps.territories.findByUbigeo(home.ubigeo);
      return {
        found: true,
        name: territory?.name ?? home.name,
        ubigeo: home.ubigeo,
        lat: territory?.centroid.lat ?? null,
        lng: territory?.centroid.lng ?? null,
      };
    }
    return { found: true, name: home.name, ubigeo: null, lat: null, lng: null };
  }

  const matches = await deps.territories.search(query, undefined, 5);
  const chosen = matches.find((item) => item.level === "district") ?? matches[0];
  if (!chosen) return { found: false, name: query, ubigeo: null, lat: null, lng: null };
  return {
    found: true,
    name: chosen.name,
    ubigeo: chosen.ubigeo,
    lat: chosen.centroid.lat,
    lng: chosen.centroid.lng,
  };
}

export function readAlerts(
  notices: { notice: OfficialNotice; partialOverlap: boolean }[],
): AlertReading {
  if (notices.length === 0) {
    return {
      level: "sin_informacion",
      source: null,
      updatedAt: null,
      noticeId: null,
      cause: null,
      mentionsSutran: false,
      factual: "No hay un aviso vigente registrado para esa zona.",
    };
  }

  const ranked = [...notices].sort(
    (left, right) =>
      semaphoreRank(normalizeSemaphoreLevel(right.notice.severity?.level)) -
      semaphoreRank(normalizeSemaphoreLevel(left.notice.severity?.level)),
  );
  const top = ranked[0];
  if (!top) {
    return {
      level: "sin_informacion",
      source: null,
      updatedAt: null,
      noticeId: null,
      cause: null,
      mentionsSutran: false,
      factual: "No hay un aviso vigente registrado para esa zona.",
    };
  }

  const level = normalizeSemaphoreLevel(top.notice.severity?.level);
  const mentionsSutran = notices.some((item) =>
    foldText(item.notice.institution).includes("sutran"),
  );
  const factual = notices
    .map((item) => {
      const itemLevel = normalizeSemaphoreLevel(item.notice.severity?.level);
      const overlap = item.partialOverlap ? "abarca parte del distrito" : "abarca el distrito";
      return `${item.notice.institution} publicó «${item.notice.title}» en nivel ${itemLevel} (${overlap}), actualizado ${formatTimeLima(item.notice.fetchedAt)}.`;
    })
    .join(" ");

  return {
    level,
    source: top.notice.institution,
    updatedAt: top.notice.fetchedAt.toISOString(),
    noticeId: top.notice.id,
    cause: top.notice.title,
    mentionsSutran,
    factual,
  };
}

export function readHistory(events: Event[]): HistoryReading {
  if (events.length === 0) return { estimate: null, mentionsSutran: false };
  const byDay = new Map<string, number>();
  for (const event of events) {
    const day = formatDayLima(event.currentVersion.occurredAt.start);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const series = [...byDay.entries()].map(([day, count]) => `${day}: ${count}`).join(", ");
  const mentionsSutran = events.some((event) =>
    foldText(`${event.severity?.issuer ?? ""} ${event.currentVersion.title}`).includes("sutran"),
  );
  return {
    estimate: `${events.length} eventos registrados (${series}).`,
    mentionsSutran,
  };
}

export function readCommunity(events: Event[], organizationNames: string[]): CommunityReading {
  const citizen = events.filter((event) => event.origin === "citizen");
  const mentionsSutran = organizationNames.some((name) => foldText(name).includes("sutran"));
  if (citizen.length === 0 && organizationNames.length === 0) {
    return {
      summary: "No hay reportes de comunidades registrados para esa zona.",
      mentionsSutran: false,
    };
  }
  const titles = citizen.map((event) => event.currentVersion.title).slice(0, 3);
  const orgs = organizationNames.slice(0, 3);
  return {
    summary: `Reportes ciudadanos: ${titles.length === 0 ? "ninguno" : titles.join(", ")}. Organizaciones: ${orgs.length === 0 ? "ninguna" : orgs.join(", ")}.`,
    mentionsSutran,
  };
}

export async function loadAlerts(
  deps: Pick<MessagingDeps, "notices">,
  ubigeo: string | null,
): Promise<AlertReading> {
  if (!ubigeo) return readAlerts([]);
  return readAlerts(
    await deps.notices.findIntersectingTerritory(ubigeo, { includeExpired: false }),
  );
}

export async function loadHistory(
  deps: Pick<MessagingDeps, "events">,
  ubigeo: string | null,
): Promise<HistoryReading> {
  if (!ubigeo) return { estimate: null, mentionsSutran: false };
  const page = await deps.events.listPublic(
    { ubigeo, includeDemo: true, dateField: "occurred" },
    { limit: 50, offset: 0 },
    "occurred",
  );
  return readHistory(page.data);
}

export async function loadCommunity(
  deps: Pick<MessagingDeps, "events" | "organizations">,
  ubigeo: string | null,
): Promise<CommunityReading> {
  if (!ubigeo)
    return {
      summary: "No hay reportes de comunidades registrados para esa zona.",
      mentionsSutran: false,
    };
  const [page, organizations] = await Promise.all([
    deps.events.listPublic(
      { ubigeo, includeDemo: true, dateField: "occurred" },
      { limit: 50, offset: 0 },
      "occurred",
    ),
    deps.organizations.listCoveringTerritory(ubigeo),
  ]);
  return readCommunity(
    page.data,
    organizations.map((organization) => organization.name),
  );
}
