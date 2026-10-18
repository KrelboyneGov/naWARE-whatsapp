/**
 * The single demo dataset (design doc 09). Seed, fixtures and screens all derive from it, so
 * counts agree everywhere. Every record is fictitious, flagged `isDemo`, and dated relative to
 * DEMO_NOW so relative times never drift. Coordinates are district centroids (illustrative).
 */
import type { PublicEvent } from "../schemas/event";
import type { TerritoryRef } from "../schemas/common";
import type { Territory } from "../schemas/territory";
import type { CollectionPoint, Need, Organization } from "../schemas/help";
import type { DataSource, OfficialNotice } from "../schemas/source";

export const DEMO_NOW = new Date("2026-10-17T15:00:00.000Z"); // 10:00 in Lima

const hoursAgo = (h: number) => new Date(DEMO_NOW.getTime() - h * 3_600_000);
const hoursAhead = (h: number) => new Date(DEMO_NOW.getTime() + h * 3_600_000);

const t = (
  ubigeo: string,
  name: string,
  provinceName: string,
  departmentName: string,
): TerritoryRef => ({ ubigeo, name, provinceName, departmentName });

export const DEMO_PLACES = {
  lurigancho: t("150118", "Lurigancho", "Lima", "Lima"),
  limaCercado: t("150101", "Lima", "Lima", "Lima"),
  piura: t("200101", "Piura", "Piura", "Piura"),
  cusco: t("080101", "Cusco", "Cusco", "Cusco"),
  huancayo: t("120101", "Huancayo", "Huancayo", "Junín"),
  huaraz: t("020101", "Huaraz", "Huaraz", "Áncash"),
  arequipa: t("040101", "Arequipa", "Arequipa", "Arequipa"),
  puno: t("210101", "Puno", "Puno", "Puno"),
} as const;

const centroids: Record<string, { lat: number; lng: number }> = {
  "150118": { lat: -11.9367, lng: -76.6975 },
  "150101": { lat: -12.0464, lng: -77.0428 },
  "200101": { lat: -5.1945, lng: -80.6328 },
  "080101": { lat: -13.5226, lng: -71.9673 },
  "120101": { lat: -12.0651, lng: -75.2049 },
  "020101": { lat: -9.5278, lng: -77.5278 },
  "040101": { lat: -16.409, lng: -71.5375 },
  "210101": { lat: -15.8402, lng: -70.0219 },
};

export const DEMO_TERRITORIES: Territory[] = Object.values(DEMO_PLACES).map((ref) => ({
  ...ref,
  level: "district",
  parentUbigeo: ref.ubigeo.slice(0, 4),
  centroid: centroids[ref.ubigeo]!,
  geometry: null,
}));

const citizen = (displayName: string) => ({ displayName, role: "citizen" as const });

const base = {
  severity: null,
  mergedIntoEventId: null,
  hasOpenNeeds: false,
  isDemo: true,
  versionSeq: 1,
};

export const DEMO_EVENTS: PublicEvent[] = [
  {
    ...base,
    id: "DEMO-01",
    origin: "citizen",
    reviewStatus: "unverified",
    publicationStatus: "published",
    situationStatus: "recent_update",
    category: "fire",
    title: "Reporte de humo en una zona de ladera",
    description:
      "Una persona reportó humo. Aún no se corroboraron la causa ni el alcance. (Demostración)",
    place: {
      precision: "approximate",
      point: { lat: -11.9302, lng: -76.6881 },
      territory: DEMO_PLACES.lurigancho,
      reference: "Ladera al norte de la carretera Central",
    },
    occurredAt: { precision: "hour", start: hoursAgo(3), end: null },
    author: citizen("Vecina de Chosica"),
    contributionCount: 1,
    hasOpenNeeds: true,
    publishedAt: hoursAgo(2),
    lastUpdatedAt: hoursAgo(1),
    createdAt: hoursAgo(3),
  },
  {
    ...base,
    id: "DEMO-02",
    origin: "citizen",
    reviewStatus: "with_contributions",
    publicationStatus: "published",
    situationStatus: "recent_update",
    category: "flood",
    title: "Acumulación de agua en una vía",
    description:
      "Agua acumulada que dificulta el paso en una avenida. Hay dos aportes adicionales sin revisión independiente. (Demostración)",
    place: {
      precision: "exact",
      point: { lat: -5.1963, lng: -80.6262 },
      territory: DEMO_PLACES.piura,
      reference: "Cruce de avenida principal",
    },
    occurredAt: { precision: "exact", start: hoursAgo(20), end: null },
    author: citizen("Conductor piurano"),
    contributionCount: 3,
    publishedAt: hoursAgo(19),
    lastUpdatedAt: hoursAgo(6),
    createdAt: hoursAgo(20),
  },
  {
    ...base,
    id: "DEMO-03",
    origin: "citizen",
    reviewStatus: "unverified",
    publicationStatus: "published",
    situationStatus: "recent_update",
    category: "road_incident",
    title: "Incidente vial reportado",
    description: "Vehículo detenido que ocupa un carril. Ubicación ilustrativa. (Demostración)",
    place: {
      precision: "exact",
      point: { lat: -13.5178, lng: -71.9781 },
      territory: DEMO_PLACES.cusco,
      reference: null,
    },
    occurredAt: { precision: "exact", start: hoursAgo(5), end: null },
    author: citizen("Usuario de Cusco"),
    contributionCount: 1,
    publishedAt: hoursAgo(4),
    lastUpdatedAt: hoursAgo(4),
    createdAt: hoursAgo(5),
  },
  {
    ...base,
    id: "DEMO-05",
    origin: "citizen",
    reviewStatus: "corroborated_by_review",
    publicationStatus: "published",
    situationStatus: "no_recent_update",
    category: "landslide",
    title: "Reporte histórico de deslizamiento",
    description:
      "Deslizamiento que afectó un camino rural. La hora exacta no se conoce. (Demostración)",
    place: { precision: "district", point: null, territory: DEMO_PLACES.huaraz, reference: null },
    occurredAt: {
      precision: "interval",
      start: hoursAgo(24 * 40),
      end: hoursAgo(24 * 39),
    },
    author: citizen("Comunero de Huaraz"),
    contributionCount: 2,
    publishedAt: hoursAgo(24 * 39),
    lastUpdatedAt: hoursAgo(24 * 30),
    createdAt: hoursAgo(24 * 39),
  },
  {
    ...base,
    id: "DEMO-07",
    origin: "citizen",
    reviewStatus: "disputed",
    publicationStatus: "published",
    situationStatus: "recent_update",
    category: "other",
    title: "Reporte con información contradictoria",
    description:
      "Dos aportes describen hechos incompatibles. Información en revisión. (Demostración)",
    place: {
      precision: "approximate",
      point: { lat: -16.3988, lng: -71.535 },
      territory: DEMO_PLACES.arequipa,
      reference: null,
    },
    occurredAt: { precision: "day", start: hoursAgo(30), end: null },
    author: citizen("Vecino arequipeño"),
    contributionCount: 2,
    publishedAt: hoursAgo(28),
    lastUpdatedAt: hoursAgo(8),
    createdAt: hoursAgo(30),
  },
];

/** DEMO-06 is a pending variant of DEMO-01; it is never listed publicly as another event. */
export const DEMO_PENDING_EVENTS: PublicEvent[] = [
  {
    ...base,
    id: "DEMO-06",
    origin: "citizen",
    reviewStatus: "unverified",
    publicationStatus: "pending_review",
    situationStatus: "recent_update",
    category: "fire",
    title: "Reporte de incendio en revisión",
    description: "Posible relación con DEMO-01. Pendiente de controles. (Demostración)",
    place: {
      precision: "approximate",
      point: { lat: -11.9321, lng: -76.6902 },
      territory: DEMO_PLACES.lurigancho,
      reference: null,
    },
    occurredAt: { precision: "hour", start: hoursAgo(2), end: null },
    author: citizen("Usuario nuevo"),
    contributionCount: 0,
    publishedAt: null,
    lastUpdatedAt: hoursAgo(1),
    createdAt: hoursAgo(1),
  },
];

const demoSquare = (lng: number, lat: number, d: number) => ({
  type: "Polygon" as const,
  coordinates: [
    [
      [lng - d, lat - d],
      [lng + d, lat - d],
      [lng + d, lat + d],
      [lng - d, lat + d],
      [lng - d, lat - d],
    ],
  ],
});

export const DEMO_SOURCES: DataSource[] = [
  {
    id: "SRC-DEMO-SENAMHI",
    name: "Avisos meteorológicos (simulado)",
    institution: "Fuente simulada para demostración",
    infoType: "Avisos con área, vigencia y nivel",
    accessKind: "manual",
    coverage: "Perú (muestra)",
    originalUrl: null,
    lastPublishedAt: hoursAgo(10),
    lastSuccessfulFetchAt: hoursAgo(1),
    health: "up_to_date",
    isDemo: true,
  },
];

export const DEMO_NOTICES: OfficialNotice[] = [
  {
    id: "DEMO-04",
    sourceId: "SRC-DEMO-SENAMHI",
    externalId: "DEMO-AVISO-LLUVIAS",
    institution: "Fuente simulada para demostración",
    title: "Aviso de lluvias de demostración",
    category: "heavy_rain",
    severity: { level: "orange", issuer: "Fuente simulada", legend: "Nivel naranja (simulado)" },
    url: null,
    issuedAt: hoursAgo(10),
    validFrom: hoursAgo(6),
    validTo: hoursAhead(30),
    validity: "active",
    geometry: demoSquare(-75.2049, -12.0651, 0.35),
    territories: [DEMO_PLACES.huancayo],
    fetchedAt: hoursAgo(1),
    isDemo: true,
  },
  {
    id: "DEMO-08",
    sourceId: "SRC-DEMO-SENAMHI",
    externalId: "DEMO-AVISO-FRIO",
    institution: "Fuente simulada para demostración",
    title: "Aviso de frío de demostración",
    category: "frost",
    severity: { level: "yellow", issuer: "Fuente simulada", legend: "Nivel amarillo (simulado)" },
    url: null,
    issuedAt: hoursAgo(24 * 12),
    validFrom: hoursAgo(24 * 12),
    validTo: hoursAgo(24 * 9),
    validity: "expired",
    geometry: demoSquare(-70.0219, -15.8402, 0.5),
    territories: [DEMO_PLACES.puno],
    fetchedAt: hoursAgo(1),
    isDemo: true,
  },
];

export const DEMO_ORGANIZATIONS: Organization[] = [
  {
    id: "ORG-DEMO-01",
    name: "Organización de ejemplo A",
    description: "Organización ficticia para la demostración. Sin contacto operativo.",
    coverage: [DEMO_PLACES.lurigancho, DEMO_PLACES.huancayo],
    contacts: [{ kind: "email", value: "contacto@ejemplo.invalid", isDemo: true }],
    identityReview: "reviewed",
    identityReviewedAt: hoursAgo(24 * 5),
    contactReview: "reviewed",
    contactReviewedAt: hoursAgo(24 * 2),
    isDemo: true,
    createdAt: hoursAgo(24 * 30),
  },
];

export const DEMO_COLLECTION_POINTS: CollectionPoint[] = [
  {
    id: "ACOPIO-DEMO-01",
    organizationId: "ORG-DEMO-01",
    name: "Punto de recepción de ejemplo",
    address: "Dirección de ejemplo, Cercado de Lima",
    arrivalReference: "Referencia ilustrativa",
    location: { lat: -12.0508, lng: -77.0365 },
    territory: DEMO_PLACES.limaCercado,
    schedule: {
      text: "Lunes a sábado, 9:00 a 17:00 (horario declarado)",
      confirmedAt: hoursAgo(48),
    },
    accepts: ["water", "shelter"],
    doesNotAccept: "Ropa usada sin clasificar",
    destinationTerritories: [DEMO_PLACES.lurigancho],
    contacts: [{ kind: "email", value: "acopio@ejemplo.invalid", isDemo: true }],
    status: "active",
    availabilityConfirmedAt: hoursAgo(48),
    isDemo: true,
    updatedAt: hoursAgo(48),
  },
];

export const DEMO_NEEDS: Need[] = [
  {
    id: "NEC-DEMO-01",
    organizationId: "ORG-DEMO-01",
    eventId: "DEMO-01",
    title: "Agua embotellada (ilustrativo)",
    description: "Necesidad ilustrativa para la demostración.",
    category: "water",
    destinationTerritory: DEMO_PLACES.lurigancho,
    collectionPointId: "ACOPIO-DEMO-01",
    quantity: "Según actualización de la organización",
    deadline: hoursAhead(72),
    status: "open",
    statusNote: null,
    isDemo: true,
    updatedAt: hoursAgo(5),
  },
  {
    id: "NEC-DEMO-02",
    organizationId: "ORG-DEMO-01",
    eventId: null,
    title: "Abrigo (ilustrativo)",
    description: "Necesidad vencida, excluida del filtro de vigentes.",
    category: "shelter",
    destinationTerritory: DEMO_PLACES.huancayo,
    collectionPointId: "ACOPIO-DEMO-01",
    quantity: null,
    deadline: hoursAgo(24 * 3),
    status: "expired",
    statusNote: "Venció la fecha indicada",
    isDemo: true,
    updatedAt: hoursAgo(24 * 3),
  },
];

// ---------------------------------------------------------------------------
// Layered map contracts (ADR 0008): communities, per-layer district cells, ingest runs.
// ---------------------------------------------------------------------------

import type { Community } from "../schemas/community";
import type { DistrictLayers, SemaforoCell } from "../schemas/layer";
import type { IngestBatch } from "../schemas/ingest";
import type { ImportRun } from "../schemas/source";

export const DEMO_COMMUNITIES: Community[] = [
  {
    id: "COM-DEMO-01",
    name: "Brigada vecinal de ejemplo (Chosica)",
    description: "Grupo ficticio de vecinos que coordina limpieza de quebradas. Demostración.",
    kind: "neighbourhood_group",
    coverage: [DEMO_PLACES.lurigancho],
    joinUrl: "https://grupo.ejemplo.invalid/brigada-chosica",
    contacts: [{ kind: "email", value: "brigada@ejemplo.invalid", isDemo: true }],
    organizationId: null,
    linkReview: "reviewed",
    linkReviewedAt: hoursAgo(24),
    isDemo: true,
    createdAt: hoursAgo(24 * 20),
    updatedAt: hoursAgo(24),
  },
  {
    id: "COM-DEMO-02",
    name: "Voluntariado de ejemplo A",
    description: "Voluntariado ficticio vinculado a la Organización de ejemplo A. Demostración.",
    kind: "volunteer_group",
    coverage: [DEMO_PLACES.lurigancho, DEMO_PLACES.huancayo],
    joinUrl: null,
    contacts: [{ kind: "email", value: "voluntariado@ejemplo.invalid", isDemo: true }],
    organizationId: "ORG-DEMO-01",
    linkReview: "pending",
    linkReviewedAt: null,
    isDemo: true,
    createdAt: hoursAgo(24 * 10),
    updatedAt: hoursAgo(24 * 10),
  },
];

const cell = (
  c: Partial<SemaforoCell> & Pick<SemaforoCell, "territory" | "layer" | "sourceId" | "status">,
): SemaforoCell => ({
  level: null,
  legend: null,
  colorToken: null,
  recordIds: [],
  sourcePublishedAt: null,
  fetchedAt: hoursAgo(1),
  validFrom: null,
  validTo: null,
  isDemo: true,
  ...c,
});

/**
 * Two districts, several layers each. Huancayo shows why layers are not merged: an active
 * orange rain notice and a district with no citizen reports are two independent facts.
 */
export const DEMO_DISTRICT_LAYERS: DistrictLayers[] = [
  {
    territory: DEMO_PLACES.huancayo,
    cells: [
      cell({
        territory: DEMO_PLACES.huancayo,
        layer: "official_notices",
        sourceId: "SRC-DEMO-SENAMHI",
        status: "has_data",
        level: "orange",
        legend: "Nivel naranja (simulado)",
        colorToken: "severity-orange",
        recordIds: ["DEMO-04"],
        sourcePublishedAt: hoursAgo(10),
        validFrom: hoursAgo(6),
        validTo: new Date(DEMO_NOW.getTime() + 30 * 3_600_000),
      }),
      cell({
        territory: DEMO_PLACES.huancayo,
        layer: "citizen_reports",
        sourceId: "SRC-CITIZEN",
        status: "no_information",
      }),
      cell({
        territory: DEMO_PLACES.huancayo,
        layer: "official_emergencies",
        sourceId: "SRC-DEMO-INDECI",
        status: "source_unavailable",
        fetchedAt: hoursAgo(26),
      }),
    ],
  },
  {
    territory: DEMO_PLACES.lurigancho,
    cells: [
      cell({
        territory: DEMO_PLACES.lurigancho,
        layer: "citizen_reports",
        sourceId: "SRC-CITIZEN",
        status: "has_data",
        level: "unverified",
        legend: "Sin corroborar",
        colorToken: "review-unverified",
        recordIds: ["DEMO-01"],
        sourcePublishedAt: hoursAgo(2),
      }),
      cell({
        territory: DEMO_PLACES.lurigancho,
        layer: "official_notices",
        sourceId: "SRC-DEMO-SENAMHI",
        status: "no_information",
      }),
      cell({
        territory: DEMO_PLACES.lurigancho,
        layer: "help_points",
        sourceId: "SRC-DIRECTORY",
        status: "has_data",
        recordIds: ["ACOPIO-DEMO-01"],
      }),
      cell({
        territory: DEMO_PLACES.lurigancho,
        layer: "communities",
        sourceId: "SRC-DIRECTORY",
        status: "has_data",
        recordIds: ["COM-DEMO-01", "COM-DEMO-02"],
      }),
    ],
  },
];

/** What a notice ingestor returns for one fetch: one normalized item and one rejected row. */
export const DEMO_INGEST_BATCH: IngestBatch<Omit<OfficialNotice, "id" | "fetchedAt" | "validity">> =
  {
    sourceId: "SRC-DEMO-SENAMHI",
    layer: "official_notices",
    items: [
      {
        externalId: "DEMO-AVISO-LLUVIAS",
        payload: (({ id: _id, fetchedAt: _f, validity: _v, ...rest }) => rest)(DEMO_NOTICES[0]!),
        sourceUrl: null,
        sourcePublishedAt: hoursAgo(10),
      },
    ],
    rejected: [{ externalId: "DEMO-AVISO-SIN-AREA", reason: "Notice has no area or district" }],
    rawRef: null,
    fetchedAt: hoursAgo(1),
  };

/** IngestRun history: one success and one failure that kept the previous data. */
export const DEMO_INGEST_RUNS: ImportRun[] = [
  {
    id: "RUN-DEMO-01",
    sourceId: "SRC-DEMO-SENAMHI",
    startedAt: hoursAgo(1),
    finishedAt: hoursAgo(1),
    status: "partial",
    processed: 1,
    duplicatesAvoided: 1,
    errorSummary: "1 record rejected: no area or district",
  },
  {
    id: "RUN-DEMO-02",
    sourceId: "SRC-DEMO-INDECI",
    startedAt: hoursAgo(26),
    finishedAt: hoursAgo(26),
    status: "failed",
    processed: 0,
    duplicatesAvoided: 0,
    errorSummary: "Source timed out; previous records kept",
  },
];
