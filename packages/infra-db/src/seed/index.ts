/**
 * Loads the DEMO dataset (`@emergency-map/domain/demo`) into the database.
 * Idempotent: every table is upserted by primary key, so running it twice changes nothing.
 *
 *   pnpm run db:seed        (from the repo root; reads apps/server-hono/.env via dotenvx)
 */
import { getTableColumns, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  DEMO_COLLECTION_POINTS,
  DEMO_EVENTS,
  DEMO_NEEDS,
  DEMO_NOTICES,
  DEMO_NOW,
  DEMO_ORGANIZATIONS,
  DEMO_PENDING_EVENTS,
  DEMO_SOURCES,
  DEMO_TERRITORIES,
} from "@emergency-map/domain/demo";
import type { Event, PublicEvent } from "@emergency-map/domain/schemas";
import { createDatabaseClient } from "../client";
import {
  activityTable,
  collectionPointTable,
  dataSourceTable,
  eventTable,
  eventVersionTable,
  evidenceTable,
  needTable,
  officialNoticeTable,
  organizationMemberTable,
  organizationTable,
  reviewQueueTable,
  territoryTable,
  userTable,
} from "../schema";
import {
  toCollectionPointInsert,
  toEventInsert,
  toNeedInsert,
  toNoticeInsert,
  toOrganizationInsert,
  toTerritoryInsert,
  toVersionInsert,
} from "../mappers";

const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL (or DATABASE_URL_DIRECT) is not set");
const db = createDatabaseClient(url);

const DEMO_AUTHOR = "demo-author";
const DEMO_CONTRIBUTORS = ["demo-contributor-1", "demo-contributor-2"];
const DEMO_MODERATOR = "demo-moderator";
const DEMO_ORG_OWNER = "demo-org-owner";

/** `SET col = excluded.col` for every column except the conflict target. */
function excluded(table: PgTable, skip: string[] = []): Record<string, SQL> {
  const set: Record<string, SQL> = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    if (skip.includes(key)) continue;
    set[key] = sql.raw(`excluded."${column.name}"`);
  }
  return set;
}

function toEvent(p: PublicEvent): Event {
  const createdBy = DEMO_AUTHOR;
  return {
    id: p.id,
    origin: p.origin,
    reviewStatus: p.reviewStatus,
    publicationStatus: p.publicationStatus,
    situationStatus: p.situationStatus,
    severity: p.severity,
    currentVersion: {
      eventId: p.id,
      seq: p.versionSeq,
      category: p.category,
      title: p.title,
      description: p.description,
      place: p.place,
      occurredAt: p.occurredAt,
      createdBy,
      createdAt: p.createdAt,
      publicationStatus: p.publicationStatus,
    },
    authorId: DEMO_AUTHOR,
    author: p.author,
    privateLocation: null,
    mergedIntoEventId: p.mergedIntoEventId,
    contributionCount: p.contributionCount,
    hasOpenNeeds: p.hasOpenNeeds,
    isDemo: true,
    publishedAt: p.publishedAt,
    lastUpdatedAt: p.lastUpdatedAt,
    createdAt: p.createdAt,
  };
}

async function main() {
  const events = [...DEMO_EVENTS, ...DEMO_PENDING_EVENTS].map(toEvent);

  // Users referenced by foreign keys. Fixed ids; no credentials, so nobody can sign in as them.
  const demoUsers = [
    { id: DEMO_AUTHOR, name: "Demo author", role: "user" },
    { id: DEMO_CONTRIBUTORS[0]!, name: "Demo contributor 1", role: "user" },
    { id: DEMO_CONTRIBUTORS[1]!, name: "Demo contributor 2", role: "user" },
    { id: DEMO_MODERATOR, name: "Demo moderator", role: "moderator" },
    { id: DEMO_ORG_OWNER, name: "Demo organization owner", role: "user" },
  ].map((u) => ({
    ...u,
    email: `${u.id}@demo.invalid`,
    emailVerified: true,
    createdAt: DEMO_NOW,
    updatedAt: DEMO_NOW,
  }));
  await db
    .insert(userTable)
    .values(demoUsers)
    .onConflictDoUpdate({ target: userTable.id, set: excluded(userTable, ["id", "createdAt"]) });

  await db
    .insert(dataSourceTable)
    .values(DEMO_SOURCES.map((s) => ({ ...s })))
    .onConflictDoUpdate({ target: dataSourceTable.id, set: excluded(dataSourceTable, ["id"]) });

  await db
    .insert(territoryTable)
    .values(DEMO_TERRITORIES.map((t) => toTerritoryInsert(t, true)))
    .onConflictDoUpdate({
      target: territoryTable.ubigeo,
      set: excluded(territoryTable, ["ubigeo", "createdAt"]),
    });

  await db
    .insert(eventTable)
    .values(events.map(toEventInsert))
    .onConflictDoUpdate({ target: eventTable.id, set: excluded(eventTable, ["id", "createdAt"]) });

  // Versions are immutable: never overwritten.
  await db
    .insert(eventVersionTable)
    .values(events.map((e) => toVersionInsert(e.currentVersion)))
    .onConflictDoNothing();

  // One evidence row per counted contribution, from distinct authors.
  const authors = [DEMO_AUTHOR, ...DEMO_CONTRIBUTORS];
  const evidence = events.flatMap((e) =>
    Array.from({ length: e.contributionCount }, (_, i) => {
      const authorId = authors[i % authors.length]!;
      return {
        id: `EVD-${e.id}-${i + 1}`,
        eventId: e.id,
        type: "testimony" as const,
        authorId,
        authorDisplayName: i === 0 ? e.author.displayName : `Aporte ${i + 1} (demostración)`,
        authorRole: "citizen" as const,
        description: "Aporte ilustrativo para la demostración.",
        observedPersonally: i === 0 ? true : null,
        ownsImage: null,
        receivedAt: new Date(e.createdAt.getTime() + i * 1_800_000),
        reviewStatus: "unverified" as const,
        visibility: "public" as const,
        isDemo: true,
      };
    }),
  );
  if (evidence.length > 0) {
    await db
      .insert(evidenceTable)
      .values(evidence)
      .onConflictDoUpdate({
        target: evidenceTable.id,
        set: excluded(evidenceTable, ["id", "fileSha256", "storageKey"]),
      });
  }

  // Pending demo events wait in the review queue.
  const queued = events.filter((e) => e.publicationStatus === "pending_review");
  if (queued.length > 0) {
    await db
      .insert(reviewQueueTable)
      .values(
        queued.map((e) => ({
          eventId: e.id,
          reason: "possible_duplicate" as const,
          versionSeq: e.currentVersion.seq,
          enteredAt: e.createdAt,
          isDemo: true,
        })),
      )
      .onConflictDoUpdate({
        target: reviewQueueTable.eventId,
        set: excluded(reviewQueueTable, ["eventId", "assignedTo"]),
      });
  }

  // Activity feed: one "new report" entry per published event.
  const activity = events
    .filter((e) => e.publicationStatus === "published")
    .map((e) => ({
      id: `ACT-${e.id}-new`,
      eventId: e.id,
      eventTitle: e.currentVersion.title,
      type: "new_report" as const,
      actorRole: e.author.role,
      summary: "Nuevo reporte publicado (demostración)",
      at: e.publishedAt ?? e.createdAt,
      isDemo: true,
    }));
  await db
    .insert(activityTable)
    .values(activity)
    .onConflictDoUpdate({ target: activityTable.id, set: excluded(activityTable, ["id"]) });

  await db
    .insert(officialNoticeTable)
    .values(DEMO_NOTICES.map(toNoticeInsert))
    .onConflictDoUpdate({
      target: officialNoticeTable.id,
      set: excluded(officialNoticeTable, ["id"]),
    });

  await db
    .insert(organizationTable)
    .values(DEMO_ORGANIZATIONS.map(toOrganizationInsert))
    .onConflictDoUpdate({
      target: organizationTable.id,
      set: excluded(organizationTable, ["id", "createdAt"]),
    });

  await db
    .insert(organizationMemberTable)
    .values(
      DEMO_ORGANIZATIONS.map((o) => ({
        organizationId: o.id,
        userId: DEMO_ORG_OWNER,
        role: "owner" as const,
        isDemo: true,
      })),
    )
    .onConflictDoUpdate({
      target: [organizationMemberTable.organizationId, organizationMemberTable.userId],
      set: { role: sql.raw(`excluded."role"`) },
    });

  await db
    .insert(collectionPointTable)
    .values(DEMO_COLLECTION_POINTS.map(toCollectionPointInsert))
    .onConflictDoUpdate({
      target: collectionPointTable.id,
      set: excluded(collectionPointTable, ["id"]),
    });

  await db
    .insert(needTable)
    .values(DEMO_NEEDS.map(toNeedInsert))
    .onConflictDoUpdate({ target: needTable.id, set: excluded(needTable, ["id"]) });

  console.log(
    `Seeded: ${events.length} events, ${evidence.length} evidence, ${DEMO_TERRITORIES.length} territories, ` +
      `${DEMO_NOTICES.length} notices, ${DEMO_SOURCES.length} sources, ${DEMO_ORGANIZATIONS.length} organizations, ` +
      `${DEMO_COLLECTION_POINTS.length} collection points, ${DEMO_NEEDS.length} needs.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
