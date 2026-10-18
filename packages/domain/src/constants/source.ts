/** Technical health of a data source. Says nothing about whether the phenomenon ended. */
export const SOURCE_HEALTHS = ["up_to_date", "delayed", "stale", "error"] as const;
export type SourceHealth = (typeof SOURCE_HEALTHS)[number];

/** How a source is accessed. */
export const SOURCE_ACCESS_KINDS = ["api", "geoservice", "file", "html", "manual"] as const;
export type SourceAccessKind = (typeof SOURCE_ACCESS_KINDS)[number];

/** Outcome of one import run. */
export const IMPORT_RUN_STATUSES = ["success", "partial", "failed"] as const;
export type ImportRunStatus = (typeof IMPORT_RUN_STATUSES)[number];
