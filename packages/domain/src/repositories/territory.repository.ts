import type { GeoPoint } from "../schemas/common";
import type { Territory } from "../schemas/territory";

export interface ITerritoryRepository {
  findByUbigeo(ubigeo: string): Promise<Territory | null>;
  search(query: string, level: Territory["level"] | undefined, limit: number): Promise<Territory[]>;
  /** District containing the point (PostGIS when geometry exists, nearest centroid otherwise). */
  findDistrictAt(point: GeoPoint): Promise<Territory | null>;
  /** Neighbouring districts, for the "En localidades cercanas" section. */
  findNeighbours(ubigeo: string, limit: number): Promise<Territory[]>;
}
