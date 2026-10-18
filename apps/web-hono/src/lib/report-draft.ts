/**
 * Report draft persistence (design doc 06). Text fields only, in localStorage of this device.
 * Files are never persisted: an image preview cannot honestly survive closing the browser.
 * Every storage access is wrapped because private windows and blocked storage throw.
 */
import type { EventCategory } from "@emergency-map/domain/constants";

export type Observed = "yes" | "no" | "prefer_not_to_say";
export type PlacePrecisionChoice = "approximate" | "district";
export type TimeMode = "exact" | "day" | "interval";

export interface ReportDraft {
  step: 1 | 2 | 3 | 4;
  category: EventCategory | null;
  title: string;
  description: string;
  observed: Observed | null;
  sourceUrl: string;
  /** District ubigeo chosen in the territory search. */
  ubigeo: string | null;
  precision: PlacePrecisionChoice;
  /** Point picked by the user; kept private, the public one is rounded. */
  point: { lat: number; lng: number } | null;
  /** True when the point came from the device GPS (never written to storage). */
  pointFromGps: boolean;
  reference: string;
  timeMode: TimeMode;
  /** YYYY-MM-DD in Lima time. */
  date: string;
  /** HH:mm in Lima time (exact time, or interval start). */
  time: string;
  /** HH:mm in Lima time (interval end). */
  timeEnd: string;
  dismissedDuplicateIds: string[];
  confirmed: boolean;
}

export const EMPTY_DRAFT: ReportDraft = {
  step: 1,
  category: null,
  title: "",
  description: "",
  observed: null,
  sourceUrl: "",
  ubigeo: null,
  precision: "approximate",
  point: null,
  pointFromGps: false,
  reference: "",
  timeMode: "exact",
  date: "",
  time: "",
  timeEnd: "",
  dismissedDuplicateIds: [],
  confirmed: false,
};

const KEY = "emergency-map:report-draft:v1";

export function loadDraft(): ReportDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReportDraft>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return { ...EMPTY_DRAFT, ...parsed, confirmed: false, pointFromGps: false };
  } catch {
    return null;
  }
}

export function saveDraft(draft: ReportDraft): boolean {
  try {
    const toStore: ReportDraft = {
      ...draft,
      // Device GPS is never written to storage.
      point: draft.pointFromGps ? null : draft.point,
      pointFromGps: false,
      confirmed: false,
    };
    window.localStorage.setItem(KEY, JSON.stringify(toStore));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

export function isDraftEmpty(d: ReportDraft): boolean {
  return !d.category && !d.title && !d.description && !d.ubigeo && !d.date && !d.sourceUrl;
}
