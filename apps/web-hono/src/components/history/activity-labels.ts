import type { ActivityType } from "@emergency-map/domain/constants";
import type { PublicAuthor } from "@emergency-map/domain/schemas";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  new_report: "Reporte nuevo",
  new_evidence: "Nuevo aporte",
  official_update: "Actualización oficial",
  correction: "Corrección",
  decision: "Decisión de revisión",
  closure: "Cierre comunicado",
};

export const ACTOR_ROLE_LABELS: Record<PublicAuthor["role"], string> = {
  citizen: "ciudadano",
  organization: "organización",
  moderator: "revisión",
  official: "fuente oficial",
};

/** Dot color per kind of change. Color is decoration; the label always carries the meaning. */
export const ACTIVITY_DOT_CLASS: Record<ActivityType, string> = {
  new_report: "bg-text-tertiary",
  new_evidence: "bg-text-tertiary",
  official_update: "bg-accent-primary",
  correction: "bg-status-warning",
  decision: "bg-status-positive",
  closure: "bg-status-neutral",
};
