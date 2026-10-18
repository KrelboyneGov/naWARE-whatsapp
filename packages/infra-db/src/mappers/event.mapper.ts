import { getTableColumns } from "drizzle-orm";
import type {
  Event,
  EventVersion,
  OccurredAt,
  Place,
  PublicEvent,
} from "@emergency-map/domain/schemas";
import { eventTable, eventVersionTable } from "../schema";
import { geoJson, parsePoint } from "../utils/postgis";
import { severityFromRow, severityToColumns } from "./shared.mapper";

/**
 * Public columns of an event. `privateLocation` is deliberately absent: only `findById` adds it
 * through `privateLocationColumn`, and public reads never do.
 */
const { privateLocation: _private, ...publicEventColumns } = getTableColumns(eventTable);

export const eventSelection = {
  event: publicEventColumns,
  version: {
    ...getTableColumns(eventVersionTable),
    placePoint: geoJson(eventVersionTable.placePoint),
  },
};

export const versionSelection = eventSelection.version;

export const privateLocationColumn = geoJson(eventTable.privateLocation);

type EventRow = typeof eventTable.$inferSelect;
type VersionRow = Omit<typeof eventVersionTable.$inferSelect, "placePoint"> & {
  placePoint: string | null;
};

export interface EventJoinedRow {
  event: Omit<EventRow, "privateLocation">;
  version: VersionRow;
  privateLocation?: string | null;
}

export function mapVersionToDomain(row: VersionRow): EventVersion {
  const place: Place = {
    precision: row.placePrecision,
    point: parsePoint(row.placePoint),
    territory: {
      ubigeo: row.territoryUbigeo,
      name: row.territoryName,
      provinceName: row.territoryProvinceName,
      departmentName: row.territoryDepartmentName,
    },
    reference: row.placeReference,
  };
  return {
    eventId: row.eventId,
    seq: row.seq,
    category: row.category,
    title: row.title,
    description: row.description,
    place,
    occurredAt: {
      precision: row.occurredPrecision,
      start: row.occurredStart,
      end: row.occurredEnd,
    },
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    publicationStatus: row.publicationStatus,
  };
}

export function mapEventToDomain(row: EventJoinedRow): Event {
  const e = row.event;
  return {
    id: e.id,
    origin: e.origin,
    reviewStatus: e.reviewStatus,
    publicationStatus: e.publicationStatus,
    situationStatus: e.situationStatus,
    severity: severityFromRow(e),
    currentVersion: mapVersionToDomain(row.version),
    authorId: e.authorId,
    author: { displayName: e.authorDisplayName, role: e.authorRole },
    privateLocation: parsePoint(row.privateLocation ?? null),
    mergedIntoEventId: e.mergedIntoEventId,
    contributionCount: e.contributionCount,
    hasOpenNeeds: e.hasOpenNeeds,
    isDemo: e.isDemo,
    publishedAt: e.publishedAt,
    lastUpdatedAt: e.lastUpdatedAt,
    createdAt: e.createdAt,
  };
}

/** Strips private fields and flattens the current version, as exposed on the public wire. */
export function toPublicEvent(event: Event): PublicEvent {
  const { privateLocation: _p, authorId: _a, currentVersion, ...rest } = event;
  return {
    ...rest,
    versionSeq: currentVersion.seq,
    category: currentVersion.category,
    title: currentVersion.title,
    description: currentVersion.description,
    place: currentVersion.place,
    occurredAt: currentVersion.occurredAt,
  };
}

export function toEventInsert(event: Event): typeof eventTable.$inferInsert {
  return {
    id: event.id,
    origin: event.origin,
    reviewStatus: event.reviewStatus,
    publicationStatus: event.publicationStatus,
    situationStatus: event.situationStatus,
    ...severityToColumns(event.severity),
    currentVersionSeq: event.currentVersion.seq,
    authorId: event.authorId,
    authorDisplayName: event.author.displayName,
    authorRole: event.author.role,
    privateLocation: event.privateLocation ?? null,
    mergedIntoEventId: event.mergedIntoEventId,
    contributionCount: event.contributionCount,
    hasOpenNeeds: event.hasOpenNeeds,
    isDemo: event.isDemo,
    publishedAt: event.publishedAt,
    lastUpdatedAt: event.lastUpdatedAt,
    createdAt: event.createdAt,
  };
}

export function toVersionInsert(version: EventVersion): typeof eventVersionTable.$inferInsert {
  const occurred: OccurredAt = version.occurredAt;
  return {
    eventId: version.eventId,
    seq: version.seq,
    category: version.category,
    title: version.title,
    description: version.description,
    placePrecision: version.place.precision,
    placePoint: version.place.point,
    territoryUbigeo: version.place.territory.ubigeo,
    territoryName: version.place.territory.name,
    territoryProvinceName: version.place.territory.provinceName,
    territoryDepartmentName: version.place.territory.departmentName,
    placeReference: version.place.reference,
    occurredPrecision: occurred.precision,
    occurredStart: occurred.start,
    occurredEnd: occurred.end,
    createdBy: version.createdBy,
    createdAt: version.createdAt,
    publicationStatus: version.publicationStatus,
  };
}
