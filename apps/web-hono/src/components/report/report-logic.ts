/** Pure report-form logic: validation, payload building and duplicate suggestions. */
import {
  DUPLICATE_MAX_SUGGESTIONS,
  DUPLICATE_SEARCH_HOURS,
  DUPLICATE_SEARCH_RADIUS_KM,
  REPORT_DESCRIPTION_MAX,
  REPORT_TITLE_MAX,
} from "@emergency-map/domain/constants";
import {
  submitReportInputSchema,
  type OccurredAt,
  type Place,
  type PublicEvent,
  type SubmitReportInput,
  type Territory,
} from "@emergency-map/domain/schemas";
import type { ReportDraft } from "@/lib/report-draft";

export type FieldErrors = Partial<Record<string, string>>;

/** Peru has no daylight saving: Lima is always UTC-5. */
export function limaToDate(date: string, time: string): Date {
  return new Date(`${date}T${time || "00:00"}:00-05:00`);
}

export function limaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(now);
}

export function buildOccurredAt(d: ReportDraft): OccurredAt | null {
  if (!d.date) return null;
  if (d.timeMode === "exact") {
    if (!d.time) return null;
    return { precision: "exact", start: limaToDate(d.date, d.time), end: null };
  }
  if (d.timeMode === "day") {
    return { precision: "day", start: limaToDate(d.date, "00:00"), end: null };
  }
  if (!d.time || !d.timeEnd) return null;
  return {
    precision: "interval",
    start: limaToDate(d.date, d.time),
    end: limaToDate(d.date, d.timeEnd),
  };
}

export function validateStep1(d: ReportDraft): FieldErrors {
  const e: FieldErrors = {};
  if (!d.category) e.category = "Elige qué tipo de situación observaste.";
  if (!d.title.trim()) e.title = "Escribe un título corto.";
  else if (d.title.length > REPORT_TITLE_MAX) e.title = `Máximo ${REPORT_TITLE_MAX} caracteres.`;
  if (d.description.length > REPORT_DESCRIPTION_MAX) {
    e.description = `Máximo ${REPORT_DESCRIPTION_MAX} caracteres.`;
  }
  if (!d.observed)
    e.observed = "Indica si lo observaste personalmente, o elige «Prefiero no indicar».";
  if (d.sourceUrl.trim()) {
    try {
      const u = new URL(d.sourceUrl.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    } catch {
      e.sourceUrl = "Escribe un enlace completo que empiece con https://";
    }
  }
  return e;
}

export function validateStep2(d: ReportDraft, now = new Date()): FieldErrors {
  const e: FieldErrors = {};
  if (!d.ubigeo) e.place = "Busca y elige el distrito donde ocurrió.";
  if (d.ubigeo && d.precision === "approximate" && !d.point) {
    e.point = "Marca un punto aproximado en el mapa, o elige «Solo distrito».";
  }
  if (!d.date) e.date = "Elige la fecha en que ocurrió.";
  else if (limaToDate(d.date, "00:00").getTime() > now.getTime()) {
    e.date = "La fecha no puede ser futura: un reporte describe algo que ya pasó.";
  }
  if (d.date && !e.date) {
    if (d.timeMode === "exact") {
      if (!d.time) e.time = "Indica la hora, o elige «No sé la hora exacta».";
      else if (limaToDate(d.date, d.time).getTime() > now.getTime()) {
        e.time = "La hora no puede ser futura.";
      }
    } else if (d.timeMode === "interval") {
      if (!d.time || !d.timeEnd) e.time = "Indica desde y hasta qué hora, o elige solo el día.";
      else if (limaToDate(d.date, d.timeEnd) <= limaToDate(d.date, d.time)) {
        e.time = "La hora final debe ser posterior a la inicial.";
      } else if (limaToDate(d.date, d.timeEnd).getTime() > now.getTime()) {
        e.time = "El intervalo no puede terminar en el futuro.";
      }
    }
  }
  return e;
}

/** Public point is rounded to 0.01 degrees (about 1 km); the exact one stays private. */
export function roundPublic(p: { lat: number; lng: number }) {
  return { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 };
}

export function buildPlace(d: ReportDraft, territory: Territory): Place {
  return {
    precision: d.precision,
    point: d.precision === "district" || !d.point ? null : roundPublic(d.point),
    territory: {
      ubigeo: territory.ubigeo,
      name: territory.name,
      provinceName: territory.provinceName,
      departmentName: territory.departmentName,
    },
    reference: d.reference.trim() ? d.reference.trim() : null,
  };
}

export function buildSubmitInput(d: ReportDraft, territory: Territory | undefined) {
  const occurredAt = buildOccurredAt(d);
  if (!territory || !occurredAt || !d.category || !d.observed) {
    return { success: false as const, error: "Faltan datos obligatorios." };
  }
  const parsed = submitReportInputSchema.safeParse({
    category: d.category,
    title: d.title,
    description: d.description,
    observedPersonally: d.observed,
    sourceUrl: d.sourceUrl.trim() ? d.sourceUrl.trim() : null,
    place: buildPlace(d, territory),
    privateLocation: d.precision === "district" ? null : d.point,
    occurredAt,
    dismissedDuplicateIds: d.dismissedDuplicateIds,
  });
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  return { success: true as const, data: parsed.data satisfies SubmitReportInput };
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface DuplicateSuggestion {
  event: PublicEvent;
  /** null when a district-precision side makes a distance meaningless. */
  approxDistanceKm: number | null;
  hoursApart: number;
}

/** Same category, close in time, and close in space (or same district for district precision). */
export function findDuplicates(
  d: ReportDraft,
  events: readonly PublicEvent[],
): DuplicateSuggestion[] {
  const occurred = buildOccurredAt(d);
  if (!d.category || !d.ubigeo || !occurred) return [];
  const ts = occurred.start.getTime();
  const out: DuplicateSuggestion[] = [];
  for (const e of events) {
    if (e.publicationStatus !== "published" || e.category !== d.category) continue;
    if (d.dismissedDuplicateIds.includes(e.id)) continue;
    const hoursApart = Math.abs(new Date(e.occurredAt.start).getTime() - ts) / 3_600_000;
    if (hoursApart > DUPLICATE_SEARCH_HOURS) continue;
    const districtMode = d.precision === "district" || !d.point || !e.place.point;
    if (districtMode) {
      if (e.place.territory.ubigeo !== d.ubigeo) continue;
      out.push({ event: e, approxDistanceKm: null, hoursApart });
    } else {
      const km = haversineKm(d.point!, e.place.point!);
      if (km > DUPLICATE_SEARCH_RADIUS_KM) continue;
      out.push({ event: e, approxDistanceKm: km, hoursApart });
    }
  }
  return out
    .sort(
      (a, b) =>
        (a.approxDistanceKm ?? 0) - (b.approxDistanceKm ?? 0) || a.hoursApart - b.hoursApart,
    )
    .slice(0, DUPLICATE_MAX_SUGGESTIONS);
}
