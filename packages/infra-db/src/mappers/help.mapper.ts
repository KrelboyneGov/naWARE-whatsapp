import { getTableColumns } from "drizzle-orm";
import type { CollectionPoint, Need, Organization } from "@emergency-map/domain/schemas";
import { collectionPointTable, needTable, organizationTable } from "../schema";
import { geoJson, parsePoint } from "../utils/postgis";

export const collectionPointSelection = {
  ...getTableColumns(collectionPointTable),
  location: geoJson(collectionPointTable.location),
};

type CollectionPointRow = Omit<typeof collectionPointTable.$inferSelect, "location"> & {
  location: string | null;
};

export function mapOrganizationToDomain(row: typeof organizationTable.$inferSelect): Organization {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coverage: row.coverage,
    contacts: row.contacts,
    identityReview: row.identityReview,
    identityReviewedAt: row.identityReviewedAt,
    contactReview: row.contactReview,
    contactReviewedAt: row.contactReviewedAt,
    isDemo: row.isDemo,
    createdAt: row.createdAt,
  };
}

export const toOrganizationInsert = (o: Organization): typeof organizationTable.$inferInsert => ({
  id: o.id,
  name: o.name,
  description: o.description,
  coverage: o.coverage,
  contacts: o.contacts,
  identityReview: o.identityReview,
  identityReviewedAt: o.identityReviewedAt,
  contactReview: o.contactReview,
  contactReviewedAt: o.contactReviewedAt,
  isDemo: o.isDemo,
  createdAt: o.createdAt,
});

export function mapCollectionPointToDomain(row: CollectionPointRow): CollectionPoint {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    address: row.address,
    arrivalReference: row.arrivalReference,
    location: parsePoint(row.location)!,
    territory: {
      ubigeo: row.territoryUbigeo,
      name: row.territoryName,
      provinceName: row.territoryProvinceName,
      departmentName: row.territoryDepartmentName,
    },
    schedule: { text: row.scheduleText, confirmedAt: row.scheduleConfirmedAt },
    accepts: row.accepts,
    doesNotAccept: row.doesNotAccept,
    destinationTerritories: row.destinationTerritories,
    contacts: row.contacts,
    status: row.status,
    availabilityConfirmedAt: row.availabilityConfirmedAt,
    isDemo: row.isDemo,
    updatedAt: row.updatedAt,
  };
}

export const toCollectionPointInsert = (
  p: CollectionPoint,
): typeof collectionPointTable.$inferInsert => ({
  id: p.id,
  organizationId: p.organizationId,
  name: p.name,
  address: p.address,
  arrivalReference: p.arrivalReference,
  location: p.location,
  territoryUbigeo: p.territory.ubigeo,
  territoryName: p.territory.name,
  territoryProvinceName: p.territory.provinceName,
  territoryDepartmentName: p.territory.departmentName,
  scheduleText: p.schedule.text,
  scheduleConfirmedAt: p.schedule.confirmedAt,
  accepts: p.accepts,
  doesNotAccept: p.doesNotAccept,
  destinationTerritories: p.destinationTerritories,
  contacts: p.contacts,
  status: p.status,
  availabilityConfirmedAt: p.availabilityConfirmedAt,
  isDemo: p.isDemo,
  updatedAt: p.updatedAt,
});

export function mapNeedToDomain(row: typeof needTable.$inferSelect): Need {
  return {
    id: row.id,
    organizationId: row.organizationId,
    eventId: row.eventId,
    title: row.title,
    description: row.description,
    category: row.category,
    destinationTerritory: {
      ubigeo: row.destinationUbigeo,
      name: row.destinationName,
      provinceName: row.destinationProvinceName,
      departmentName: row.destinationDepartmentName,
    },
    collectionPointId: row.collectionPointId,
    quantity: row.quantity,
    deadline: row.deadline,
    status: row.status,
    statusNote: row.statusNote,
    isDemo: row.isDemo,
    updatedAt: row.updatedAt,
  };
}

export const toNeedInsert = (n: Need): typeof needTable.$inferInsert => ({
  id: n.id,
  organizationId: n.organizationId,
  eventId: n.eventId,
  title: n.title,
  description: n.description,
  category: n.category,
  destinationUbigeo: n.destinationTerritory.ubigeo,
  destinationName: n.destinationTerritory.name,
  destinationProvinceName: n.destinationTerritory.provinceName,
  destinationDepartmentName: n.destinationTerritory.departmentName,
  collectionPointId: n.collectionPointId,
  quantity: n.quantity,
  deadline: n.deadline,
  status: n.status,
  statusNote: n.statusNote,
  isDemo: n.isDemo,
  updatedAt: n.updatedAt,
});
