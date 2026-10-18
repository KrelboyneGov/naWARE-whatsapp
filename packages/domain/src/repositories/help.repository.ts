import type {
  CollectionPoint,
  ListCollectionPointsInput,
  ListNeedsInput,
  Need,
  Organization,
} from "../schemas/help";
import type { NeedStatus, OrganizationMemberRole } from "../constants";

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  listCoveringTerritory(ubigeo: string): Promise<Organization[]>;
  create(org: Organization): Promise<Organization>;
  addMember(input: {
    organizationId: string;
    userId: string;
    role: OrganizationMemberRole;
  }): Promise<void>;
  listOrganizationIdsForUser(userId: string): Promise<string[]>;
}

export interface INeedRepository {
  findById(id: string): Promise<Need | null>;
  list(input: ListNeedsInput, now: Date): Promise<Need[]>;
  create(need: Need): Promise<Need>;
  /** Scoped by organization (security-hardening: authorization in the query). */
  updateStatus(
    id: string,
    organizationId: string,
    status: NeedStatus,
    note: string,
    at: Date,
  ): Promise<boolean>;
}

export interface ICollectionPointRepository {
  findById(id: string): Promise<CollectionPoint | null>;
  /** Never returns withdrawn points. Distance filter uses PostGIS when `near` is set. */
  list(
    input: ListCollectionPointsInput,
  ): Promise<{ point: CollectionPoint; distanceKm: number | null }[]>;
  create(point: CollectionPoint): Promise<CollectionPoint>;
}
