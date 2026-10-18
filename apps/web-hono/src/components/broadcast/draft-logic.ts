import type { PublicEvent } from "@emergency-map/domain/schemas";

import { CATEGORY_LABELS, REVIEW_LABELS, formatDateTime } from "@/lib/labels";

export type Network = "X" | "Instagram";
export type DraftStatus = "ready" | "prepared" | "approved" | "retraction_pending";

export interface Draft {
  id: string;
  event: PublicEvent;
  /** Event version the text was generated from. */
  generatedVersion: number;
  /** Review status at generation time; a different current value makes the draft stale. */
  generatedReviewStatus: PublicEvent["reviewStatus"];
  network: Network;
  text: string;
}

/**
 * Public fields only. Never reads private coordinates (the public read model has none) and
 * names the district, not the point or the free-text reference.
 */
export function buildShareText(event: PublicEvent, reviewStatus = event.reviewStatus): string {
  const loc = event.place.territory.name;
  const dept = event.place.territory.departmentName;
  const place = dept && dept !== loc ? `${loc}, ${dept}` : loc;
  const parts = [
    `${CATEGORY_LABELS[event.category]}: ${event.title} (${place}, ${formatDateTime(event.occurredAt.start)}).`,
    `Estado: ${REVIEW_LABELS[reviewStatus].toLowerCase()}.`,
    `Detalle y fuentes: andes-alerta.ejemplo/eventos/${event.id}`,
  ];
  if (event.isDemo) parts.push("Demostración");
  return parts.join(" ");
}

/** An event no longer in the public view blocks its draft. */
export function isRetracted(event: PublicEvent): boolean {
  return event.publicationStatus !== "published";
}

export function isStale(draft: Draft, regenerated: boolean): boolean {
  return !regenerated && draft.event.reviewStatus !== draft.generatedReviewStatus;
}

export interface Check {
  label: string;
  ok: boolean;
}

export function runChecks(text: string): Check[] {
  return [
    { label: "Incluye localidad", ok: /,\s|\(.+\)/.test(text) },
    { label: "Incluye fecha", ok: /\d{1,2}\s\w{3,4}\.?\s\d{4}|\d{4}/.test(text) },
    { label: "Incluye estado de revisión", ok: /Estado:/.test(text) },
    { label: "Incluye URL del evento", ok: /eventos\//.test(text) },
  ];
}
