/**
 * Illustrative evidence and review decisions for the demo events. The shared demo dataset in
 * `@emergency-map/domain/demo` has events but no evidence or decisions yet, so the detail page and
 * the activity feed read these local fixtures, shaped by the domain schemas. Everything here is
 * fictitious and flagged `isDemo`. Remove this file when `events.get` / `events.activity` serve
 * the same data from the API.
 */
import { DEMO_NOW } from "@emergency-map/domain/demo";
import type { PublicEvidence, PublicReviewDecision } from "@emergency-map/domain/schemas";

const hoursAgo = (h: number) => new Date(DEMO_NOW.getTime() - h * 3_600_000);

const citizen = (displayName: string) => ({ displayName, role: "citizen" as const });

function evidence(
  p: Partial<PublicEvidence> & Pick<PublicEvidence, "id" | "eventId" | "description" | "author">,
): PublicEvidence {
  return {
    type: "testimony",
    storageKey: null,
    url: null,
    observedPersonally: null,
    ownsImage: null,
    declaredCapturedAt: null,
    receivedAt: hoursAgo(1),
    reviewStatus: "unverified",
    visibility: "public",
    duplicateOfEvidenceId: null,
    isDemo: true,
    ...p,
  };
}

export const DEMO_EVIDENCE: PublicEvidence[] = [
  evidence({
    id: "EVD-DEMO-01",
    eventId: "DEMO-01",
    description:
      "Se ve una columna de humo desde la carretera. No se distingue el origen. (Demostración)",
    author: citizen("Vecina de Chosica"),
    observedPersonally: true,
    receivedAt: hoursAgo(2.5),
  }),
  evidence({
    id: "EVD-DEMO-02",
    eventId: "DEMO-02",
    type: "photo",
    description: "Foto del agua acumulada en el cruce. (Demostración)",
    author: citizen("Conductor piurano"),
    observedPersonally: true,
    ownsImage: true,
    declaredCapturedAt: { precision: "exact", start: hoursAgo(20), end: null },
    receivedAt: hoursAgo(19.5),
  }),
  evidence({
    id: "EVD-DEMO-03",
    eventId: "DEMO-02",
    description: "El agua llega a media rueda de un auto pequeño. (Demostración)",
    author: citizen("Vecino de Piura"),
    observedPersonally: true,
    receivedAt: hoursAgo(8),
  }),
  evidence({
    id: "EVD-DEMO-04",
    eventId: "DEMO-03",
    description: "Un vehículo ocupa el carril derecho. (Demostración)",
    author: citizen("Usuario de Cusco"),
    observedPersonally: true,
    receivedAt: hoursAgo(4.5),
  }),
  evidence({
    id: "EVD-DEMO-05",
    eventId: "DEMO-05",
    description: "El camino rural quedó cubierto de tierra y piedras. (Demostración)",
    author: citizen("Comunero de Huaraz"),
    observedPersonally: true,
    reviewStatus: "corroborated_by_review",
    receivedAt: hoursAgo(24 * 39),
  }),
  evidence({
    id: "EVD-DEMO-06",
    eventId: "DEMO-07",
    description: "Describe una inundación leve en la avenida. (Demostración)",
    author: citizen("Vecino arequipeño"),
    receivedAt: hoursAgo(29),
  }),
  evidence({
    id: "EVD-DEMO-07",
    eventId: "DEMO-07",
    description: "Afirma que la avenida estaba seca a la misma hora. (Demostración)",
    author: citizen("Usuario de Arequipa"),
    reviewStatus: "disputed",
    receivedAt: hoursAgo(9),
  }),
  evidence({
    id: "EVD-DEMO-10",
    eventId: "DEMO-10",
    type: "photo",
    description: "Foto de las piedras sobre el carril, tomada desde la vereda. (Demostración)",
    author: citizen("Vecino de Chorrillos"),
    observedPersonally: true,
    ownsImage: true,
    declaredCapturedAt: { precision: "exact", start: hoursAgo(0.7), end: null },
    receivedAt: hoursAgo(0.6),
  }),
  evidence({
    id: "EVD-DEMO-11",
    eventId: "DEMO-10",
    description: "Serenazgo llegó y puso conos; sigue un solo carril. (Demostración)",
    author: citizen("Ciclista de la Costa Verde"),
    observedPersonally: true,
    receivedAt: hoursAgo(0.25),
  }),
  evidence({
    id: "EVD-DEMO-12",
    eventId: "DEMO-12",
    type: "photo",
    description: "Humo saliendo de los pisos altos, visto desde la avenida. (Demostración)",
    author: citizen("Vecina de Miraflores"),
    observedPersonally: true,
    ownsImage: true,
    declaredCapturedAt: { precision: "exact", start: hoursAgo(49.8), end: null },
    receivedAt: hoursAgo(49.6),
  }),
  evidence({
    id: "EVD-DEMO-13",
    eventId: "DEMO-13",
    description: "El lodo ya llega a la berma de la carretera. (Demostración)",
    author: citizen("Mototaxista de Chosica"),
    observedPersonally: true,
    receivedAt: hoursAgo(0.4),
  }),
];

function decision(
  p: Pick<
    PublicReviewDecision,
    "id" | "eventId" | "kind" | "decision" | "publicReason" | "decidedAt"
  > &
    Partial<PublicReviewDecision>,
): PublicReviewDecision {
  return { versionSeq: 1, details: {}, ...p };
}

export const DEMO_DECISIONS: PublicReviewDecision[] = [
  decision({
    id: "DEC-DEMO-01",
    eventId: "DEMO-05",
    kind: "publication",
    decision: "publish",
    publicReason: "Pasó los controles básicos de publicación.",
    decidedAt: hoursAgo(24 * 39),
  }),
  decision({
    id: "DEC-DEMO-02",
    eventId: "DEMO-05",
    kind: "corroboration",
    decision: "corroborate_aspects",
    publicReason: "Dos aportes independientes coinciden en el distrito y el tipo de daño.",
    decidedAt: hoursAgo(24 * 35),
    details: {
      aspectsChecked: ["Coincidencia territorial de dos aportes", "Tipo de daño en el camino"],
      limits: "No se conoce la hora exacta ni si el camino sigue cerrado.",
    },
  }),
  decision({
    id: "DEC-DEMO-03",
    eventId: "DEMO-07",
    kind: "corroboration",
    decision: "mark_disputed",
    publicReason: "Dos aportes describen hechos incompatibles sobre el mismo lugar y hora.",
    decidedAt: hoursAgo(8),
    details: {
      aspectsChecked: ["Comparación de las dos descripciones"],
      limits: "No hay una fuente independiente que permita decidir cuál es correcta.",
    },
  }),
];
