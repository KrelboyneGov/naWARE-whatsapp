import type { EventCategory } from "./event";

/**
 * What people actually say they saw ("hay un huaico", "se desbordó el río"). Finer than
 * `EVENT_CATEGORIES`: each hazard type belongs to exactly one category, so filters, layers and
 * official notices keep working on the category while the quick report speaks the user's words.
 */
export const HAZARD_TYPES = [
  "debris_flow", // huaico
  "river_overflow", // desborde de río
  "rockfall", // derrumbe / caída de rocas
  "urban_flooding", // aniego
  "fire", // incendio
  "road_blocked", // vía bloqueada
  "fallen_tree", // árbol caído
  "power_line_down", // poste o cable caído
  "other",
] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

export const HAZARD_CATEGORY: Record<HazardType, EventCategory> = {
  debris_flow: "landslide",
  river_overflow: "flood",
  rockfall: "landslide",
  urban_flooding: "flood",
  fire: "fire",
  road_blocked: "road_incident",
  fallen_tree: "road_incident",
  power_line_down: "other",
  other: "other",
};

/** Community feedback on an event, Waze style. One current signal per person and event. */
export const SIGNAL_KINDS = ["still_there", "not_there", "worse"] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

/** Only signals this recent count towards the community state shown on the event. */
export const SIGNAL_WINDOW_HOURS = 2;
/** Distinct people saying "ya no está" (and outnumbering "sigue ahí") to show "possibly resolved". */
export const POSSIBLY_RESOLVED_MIN_NOT_THERE = 3;
/** Distinct people saying "sigue ahí" to show "confirmed by neighbours". */
export const CONFIRMED_MIN_STILL_THERE = 2;

/**
 * Community state derived from recent signals. It describes what neighbours say now; it is never
 * a review status (spec failure 3) and never closes an event by itself.
 */
export const COMMUNITY_STATES = [
  "confirmed_by_neighbours",
  "getting_worse",
  "possibly_resolved",
  "mixed",
  "no_recent_signals",
] as const;
export type CommunityState = (typeof COMMUNITY_STATES)[number];

/**
 * Anonymous quick reports stay hidden until this many distinct anonymous people report the same
 * hazard type close together in place and time. Signed-in reports are shown at once, unverified.
 */
export const ANONYMOUS_MIN_REPORTERS = 3;
export const ANONYMOUS_CLUSTER_RADIUS_KM = 1;
export const ANONYMOUS_CLUSTER_HOURS = 6;
