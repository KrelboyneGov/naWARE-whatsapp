/**
 * Map layers (ADR 0008). Every source feeds exactly one layer and keeps its own level and
 * legend. Layers are shown side by side; there is no cross-layer aggregate score.
 */
export const LAYERS = [
  "official_notices", // issued warnings with area and validity (SENAMHI)
  "official_emergencies", // recorded emergencies (INDECI / SINPAD)
  "citizen_reports", // reports from people, with their review status
  "road_status", // road incidents and closures (Sutran, citizen road reports)
  "forecast", // forecast context (Open-Meteo); never an incident
  "historical_exposure", // historically exposed zones (SIGRID); never a current event
  "help_points", // collection points and organizations
  "communities", // groups people can join
] as const;
export type Layer = (typeof LAYERS)[number];

/** Layers that describe hazards or incidents, as opposed to help and communities. */
export const HAZARD_LAYERS = [
  "official_notices",
  "official_emergencies",
  "citizen_reports",
  "road_status",
  "forecast",
  "historical_exposure",
] as const satisfies readonly Layer[];

/** State of one layer in one district. "no_information" is never rendered as safe. */
export const CELL_STATUSES = ["has_data", "no_information", "source_unavailable"] as const;
export type CellStatus = (typeof CELL_STATUSES)[number];

/** Kinds of community. A community is a group to join, never an exposed population. */
export const COMMUNITY_KINDS = ["volunteer_group", "neighbourhood_group", "other"] as const;
export type CommunityKind = (typeof COMMUNITY_KINDS)[number];
