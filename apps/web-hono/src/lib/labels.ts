/**
 * Spanish (Peru) labels for every domain value shown in the UI. One place so the four
 * dimensions read the same on every screen (design doc 01). Product copy is Spanish by design;
 * code stays English.
 */
import type {
  EventCategory,
  LocationPrecision,
  NeedCategory,
  NeedStatus,
  NoticeValidity,
  Origin,
  PublicationStatus,
  ReviewStatus,
  SituationStatus,
  SourceHealth,
} from "@emergency-map/domain/constants";

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  fire: "Incendio",
  flood: "Inundación",
  landslide: "Huaico / deslizamiento",
  road_incident: "Incidente vial",
  heavy_rain: "Lluvias intensas",
  frost: "Helada / friaje",
  other: "Otro",
};

export const ORIGIN_LABELS: Record<Origin, string> = {
  citizen: "Ciudadano",
  organization: "Organización",
  official: "Fuente oficial",
};

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  unverified: "Sin corroborar",
  with_contributions: "Con aportes adicionales",
  corroborated_by_review: "Corroborado por revisión",
  officially_backed: "Con respaldo oficial",
  disputed: "En disputa",
};

export const PUBLICATION_LABELS: Record<PublicationStatus, string> = {
  draft: "Borrador",
  pending_review: "Pendiente de controles",
  published: "Publicado",
  hidden: "Oculto",
  rejected: "No publicado",
  merged: "Fusionado con otro evento",
};

export const SITUATION_LABELS: Record<SituationStatus, string> = {
  recent_update: "Con actualización reciente",
  no_recent_update: "Sin información reciente",
  closure_reported: "Cierre comunicado",
};

export const NOTICE_VALIDITY_LABELS: Record<NoticeValidity, string> = {
  active: "Aviso vigente",
  expired: "Aviso vencido",
  cancelled: "Aviso cancelado",
};

export const PRECISION_LABELS: Record<LocationPrecision, string> = {
  exact: "Ubicación puntual",
  approximate: "Ubicación aproximada",
  district: "Solo distrito",
};

export const NEED_CATEGORY_LABELS: Record<NeedCategory, string> = {
  water: "Agua",
  food: "Alimentos no perecibles",
  shelter: "Abrigo",
  hygiene: "Higiene",
  tools: "Herramientas",
  other: "Otro",
};

export const NEED_STATUS_LABELS: Record<NeedStatus, string> = {
  open: "Abierta",
  paused: "Pausada",
  covered: "Cubierta",
  expired: "Vencida",
};

export const SOURCE_HEALTH_LABELS: Record<SourceHealth, string> = {
  up_to_date: "Actualizada",
  delayed: "Con retraso",
  stale: "Sin consulta reciente",
  error: "Error de consulta",
};

/** Mandatory marker for every fictitious record (design doc 01). */
export const DEMO_LABEL = "Demostración";

/** Never "no hay peligro" (design doc 01). */
export const NO_RESULTS_COPY =
  "No encontramos reportes con estos filtros. Esto no significa que no haya peligro.";

const dateTime = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  dateStyle: "medium",
  timeStyle: "short",
});
const relative = new Intl.RelativeTimeFormat("es-PE", { numeric: "auto" });

/** Absolute date in Lima time, for accessible pairing with relative time. */
export function formatDateTime(d: Date | string): string {
  return dateTime.format(new Date(d));
}

/** "hace 3 horas", relative to `now` (pass DEMO_NOW for demo data). */
export function formatRelative(d: Date | string, now: Date): string {
  const diffMin = Math.round((new Date(d).getTime() - now.getTime()) / 60_000);
  if (Math.abs(diffMin) < 60) return relative.format(diffMin, "minute");
  const diffH = Math.round(diffMin / 60);
  if (Math.abs(diffH) < 48) return relative.format(diffH, "hour");
  return relative.format(Math.round(diffH / 24), "day");
}
