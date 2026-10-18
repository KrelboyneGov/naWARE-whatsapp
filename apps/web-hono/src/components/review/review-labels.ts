import type {
  CorroborationDecision,
  PublicationDecision,
  QueueReason,
  RelationDecision,
} from "@emergency-map/domain/constants";

export const QUEUE_REASON_LABELS: Record<QueueReason, string> = {
  new_report: "Reporte nuevo",
  new_evidence: "Evidencia nueva",
  possible_duplicate: "Posible duplicado",
  issue_reported: "Problema reportado",
  disputed: "En disputa",
  edit_pending: "Edición pendiente",
};

export const QUEUE_REASON_TONE: Record<QueueReason, "warning" | "neutral"> = {
  new_report: "neutral",
  new_evidence: "neutral",
  possible_duplicate: "warning",
  issue_reported: "warning",
  disputed: "warning",
  edit_pending: "neutral",
};

/** Local editorial order for "Prioridad editorial" (lower first). Not an API field. */
export const QUEUE_REASON_PRIORITY: Record<QueueReason, number> = {
  possible_duplicate: 1,
  disputed: 2,
  issue_reported: 3,
  new_report: 4,
  edit_pending: 5,
  new_evidence: 6,
};

export type Dimension = "publication" | "corroboration" | "relation" | "closure";

export const DIMENSION_LABELS: Record<Dimension, string> = {
  publication: "Publicación",
  corroboration: "Corroboración",
  relation: "Relación",
  closure: "Situación",
};

export const PUBLICATION_ACTION_LABELS: Record<PublicationDecision, string> = {
  publish: "Publicar como reporte ciudadano",
  request_info: "Pedir información al autor",
  reject: "Rechazar",
  withdraw: "Retirar de la vista pública",
};

export const CORROBORATION_ACTION_LABELS: Record<CorroborationDecision, string> = {
  keep_unverified: "Mantener sin corroborar",
  record_contributions: "Registrar aportes adicionales",
  corroborate_aspects: "Corroborar aspectos específicos por revisión",
  link_official_backing: "Vincular respaldo oficial",
  mark_disputed: "Marcar en disputa",
};

export const RELATION_ACTION_LABELS: Record<RelationDecision, string> = {
  link: "Vincular con otro evento",
  merge: "Fusionar como duplicado",
  split: "Separar un aporte mal relacionado",
};

export const CLOSURE_ACTION_LABEL = "Registrar cierre comunicado con fuente";

export const PUBLICATION_SUMMARIES: Record<PublicationDecision, string> = {
  publish:
    "El reporte pasa a Publicado y aparece en mapa y lista como evento distinto. Su revisión no cambia: sigue como está. El autor recibe el motivo público.",
  request_info:
    "El caso queda con información solicitada. El autor ve tu motivo público en Mis reportes y puede responder. Nada cambia en público.",
  reject:
    "No se publica. El autor recibe «No se publicó: [motivo]». El registro se conserva en el historial interno.",
  withdraw:
    "Acción destructiva para la vista pública: la ficha mostrará «retirado»; popups y borradores de difusión quedan pendientes.",
};

export const CORROBORATION_SUMMARIES: Record<CorroborationDecision, string> = {
  keep_unverified: "Sin cambios en el estado de revisión.",
  record_contributions: "La ficha mostrará «Con aportes adicionales». No implica verificación.",
  corroborate_aspects:
    "Se mostrará «Corroborado por revisión» junto a qué se comprobó y qué sigue incierto.",
  link_official_backing:
    "Se enlaza la publicación oficial y se explica qué aspecto respalda. No confirma todas las fotos.",
  mark_disputed: "La ficha mostrará «En disputa» hasta una nueva decisión de corroboración.",
};

export const RELATION_SUMMARIES: Record<RelationDecision, string> = {
  link: "Ambos eventos quedan relacionados y visibles por separado.",
  merge:
    "Este evento deja de existir como evento público; su evidencia y su historial pasan al registro principal.",
  split: "La evidencia elegida vuelve a la cola como caso independiente.",
};

export const CLOSURE_SUMMARY =
  "La ficha muestra «Cierre comunicado» con la fuente citada. No se infiere por el paso del tiempo.";

export const EVIDENCE_TYPE_LABELS = {
  photo: "Foto",
  document_link: "Enlace a documento",
  testimony: "Testimonio",
} as const;

export const EVIDENCE_VISIBILITY_LABELS = {
  pending: "Oculta hasta decisión",
  public: "Pública",
  restricted: "Restringida",
  removed: "Retirada",
} as const;

export const DECISION_KIND_LABELS = {
  publication: "Publicación",
  corroboration: "Corroboración",
  relation: "Relación",
  closure: "Cierre",
} as const;
