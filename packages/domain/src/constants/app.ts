/** Display name. The technical scope stays @emergency-map (spec decision 9). */
export const APP_DISPLAY_NAME = "KlAimate";

/** All times are stored in UTC and rendered in this zone. */
export const APP_TIME_ZONE = "America/Lima";

/** Peru bounding box [west, south, east, north] used to frame the map and validate coordinates. */
export const PERU_BOUNDS = [-81.35, -18.35, -68.65, -0.04] as const;

/** Radii offered by "Cerca de mí", in kilometres. */
export const NEARBY_RADII_KM = [1, 5, 10, 25] as const;
export type NearbyRadiusKm = (typeof NEARBY_RADII_KM)[number];
export const DEFAULT_NEARBY_RADIUS_KM: NearbyRadiusKm = 5;

/** Report form limits from the design package. */
export const REPORT_TITLE_MAX = 100;
export const REPORT_DESCRIPTION_MAX = 2000;
export const EVIDENCE_MAX_FILES = 5;
export const EVIDENCE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const EVIDENCE_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Duplicate detection window used by submitReport. */
export const DUPLICATE_SEARCH_RADIUS_KM = 3;
export const DUPLICATE_SEARCH_HOURS = 48;
export const DUPLICATE_MAX_SUGGESTIONS = 3;
