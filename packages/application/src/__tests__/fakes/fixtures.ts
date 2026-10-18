import type {
  Actor,
  CollectionPoint,
  Event,
  Evidence,
  Need,
  OfficialNotice,
  Organization,
  Place,
  Territory,
} from "@emergency-map/domain/schemas";
import type { TerritoryRef } from "@emergency-map/domain/schemas";
import {
  FakeCollectionPointRepository,
  FakeDataSourceRepository,
  FakeEventRepository,
  FakeEvidenceRepository,
  FakeFileStorage,
  FakeNeedRepository,
  FakeNoticeRepository,
  FakeOrganizationRepository,
  FakeReviewRepository,
  FakeTerritoryRepository,
  FixedClock,
  SeqIds,
} from "./repositories";

export const NOW = new Date("2026-10-17T15:00:00.000Z");
export const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

export const luriganchoRef: TerritoryRef = {
  ubigeo: "150118",
  name: "Lurigancho",
  provinceName: "Lima",
  departmentName: "Lima",
};
export const limaRef: TerritoryRef = {
  ubigeo: "150101",
  name: "Lima",
  provinceName: "Lima",
  departmentName: "Lima",
};

export const citizen = (id = "user-1"): Actor => ({
  userId: id,
  role: "user",
  organizationIds: [],
  publicName: `Citizen ${id}`,
});
export const moderator = (id = "mod-1"): Actor => ({
  userId: id,
  role: "moderator",
  organizationIds: [],
  publicName: "Moderator",
});
export const admin = (): Actor => ({
  userId: "admin-1",
  role: "admin",
  organizationIds: [],
  publicName: "Admin",
});
export const orgMember = (orgId: string, id = "member-1"): Actor => ({
  userId: id,
  role: "user",
  organizationIds: [orgId],
  publicName: "Member",
});

export const exactPlace = (
  point = { lat: -11.94, lng: -76.7 },
  territory = luriganchoRef,
): Place => ({ precision: "exact", point, territory, reference: null });
export const districtPlace = (territory = luriganchoRef): Place => ({
  precision: "district",
  point: null,
  territory,
  reference: null,
});

export function makeEvent(
  id: string,
  over: Partial<Event> & { place?: Place; occurred?: Date } = {},
): Event {
  const { place, occurred, ...rest } = over;
  return {
    id,
    origin: "citizen",
    reviewStatus: "unverified",
    publicationStatus: "published",
    situationStatus: "recent_update",
    severity: null,
    currentVersion: {
      eventId: id,
      seq: 1,
      category: "landslide",
      title: `Event ${id}`,
      description: "",
      place: place ?? exactPlace(),
      occurredAt: { precision: "exact", start: occurred ?? hoursFromNow(-2), end: null },
      createdBy: "author-1",
      createdAt: hoursFromNow(-2),
      publicationStatus: "published",
    },
    authorId: "author-1",
    author: { displayName: "Author", role: "citizen" },
    privateLocation: { lat: -11.9401, lng: -76.7001 },
    mergedIntoEventId: null,
    contributionCount: 0,
    hasOpenNeeds: false,
    isDemo: false,
    publishedAt: hoursFromNow(-1),
    lastUpdatedAt: hoursFromNow(-1),
    createdAt: hoursFromNow(-2),
    ...rest,
  };
}

export function makeEvidence(id: string, eventId: string, over: Partial<Evidence> = {}): Evidence {
  return {
    id,
    eventId,
    type: "testimony",
    authorId: "author-1",
    author: { displayName: "Author", role: "citizen" },
    description: "saw it",
    storageKey: null,
    url: null,
    observedPersonally: true,
    ownsImage: null,
    declaredCapturedAt: null,
    receivedAt: hoursFromNow(-1),
    reviewStatus: "unverified",
    visibility: "public",
    duplicateOfEvidenceId: null,
    isDemo: false,
    ...over,
  };
}

export function makeNotice(id: string, over: Partial<OfficialNotice> = {}): OfficialNotice {
  return {
    id,
    sourceId: "src-1",
    externalId: `ext-${id}`,
    institution: "SENAMHI",
    title: `Notice ${id}`,
    category: "heavy_rain",
    severity: { level: "orange", issuer: "SENAMHI", legend: "Orange level" },
    url: null,
    issuedAt: hoursFromNow(-5),
    validFrom: hoursFromNow(-5),
    validTo: hoursFromNow(10),
    validity: "active",
    geometry: null,
    territories: [luriganchoRef],
    fetchedAt: hoursFromNow(-1),
    isDemo: false,
    ...over,
  };
}

export function makeOrganization(id: string, over: Partial<Organization> = {}): Organization {
  return {
    id,
    name: `Org ${id}`,
    description: "",
    coverage: [luriganchoRef],
    contacts: [],
    identityReview: "reviewed",
    identityReviewedAt: NOW,
    contactReview: "reviewed",
    contactReviewedAt: NOW,
    isDemo: false,
    createdAt: NOW,
    ...over,
  };
}

export function makeNeed(id: string, organizationId: string, over: Partial<Need> = {}): Need {
  return {
    id,
    organizationId,
    eventId: null,
    title: `Need ${id}`,
    description: "",
    category: "water",
    destinationTerritory: luriganchoRef,
    collectionPointId: null,
    quantity: null,
    deadline: null,
    status: "open",
    statusNote: null,
    isDemo: false,
    updatedAt: NOW,
    ...over,
  };
}

export function makeCollectionPoint(
  id: string,
  organizationId: string,
  over: Partial<CollectionPoint> = {},
): CollectionPoint {
  return {
    id,
    organizationId,
    name: `Point ${id}`,
    address: "Av. Test 123",
    arrivalReference: null,
    location: { lat: -11.94, lng: -76.7 },
    territory: luriganchoRef,
    schedule: { text: "Mon-Fri", confirmedAt: null },
    accepts: ["water"],
    doesNotAccept: null,
    destinationTerritories: [],
    contacts: [],
    status: "active",
    availabilityConfirmedAt: null,
    isDemo: false,
    updatedAt: NOW,
    ...over,
  };
}

export function makeTerritory(ref: TerritoryRef, lat: number, lng: number): Territory {
  return {
    ...ref,
    level: "district",
    parentUbigeo: ref.ubigeo.slice(0, 4),
    centroid: { lat, lng },
    geometry: null,
  };
}

/** One world with every fake wired; each test builds its own deps from it. */
export function makeWorld() {
  const w = {
    clock: new FixedClock(NOW),
    ids: new SeqIds(),
    storage: new FakeFileStorage(),
    events: new FakeEventRepository(),
    evidence: new FakeEvidenceRepository(),
    review: new FakeReviewRepository(),
    territories: new FakeTerritoryRepository(),
    notices: new FakeNoticeRepository(),
    organizations: new FakeOrganizationRepository(),
    needs: new FakeNeedRepository(),
    collectionPoints: new FakeCollectionPointRepository(),
    dataSources: new FakeDataSourceRepository(),
  };
  return w;
}
export type World = ReturnType<typeof makeWorld>;
