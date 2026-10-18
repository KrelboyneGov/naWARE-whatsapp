import {
  ANONYMOUS_CLUSTER_HOURS,
  ANONYMOUS_CLUSTER_RADIUS_KM,
  ANONYMOUS_MIN_REPORTERS,
} from "../constants";
import type { GeoPoint } from "../schemas/common";
import type { QuickReport } from "../schemas/signal";

/** Great-circle distance in km. Good enough for "is it the same corner" at city scale. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Anonymous reports close to `report` (same hazard type, within the radius and time window),
 * counted by distinct reporter. The report itself is included.
 */
export function anonymousCorroborators(
  report: QuickReport,
  all: readonly QuickReport[],
): Set<string> {
  const windowMs = ANONYMOUS_CLUSTER_HOURS * 3_600_000;
  const keys = new Set<string>();
  for (const r of all) {
    if (!r.isAnonymous || r.hazardType !== report.hazardType) continue;
    if (Math.abs(r.createdAt.getTime() - report.createdAt.getTime()) > windowMs) continue;
    if (haversineKm(r.point, report.point) > ANONYMOUS_CLUSTER_RADIUS_KM) continue;
    keys.add(r.reporterKey);
  }
  return keys;
}

/**
 * Signed-in reports are public at once (still unverified). An anonymous report becomes public
 * only when ANONYMOUS_MIN_REPORTERS distinct anonymous people reported the same thing nearby;
 * even then it stays unverified: agreement is not review.
 */
export function isQuickReportVisible(report: QuickReport, all: readonly QuickReport[]): boolean {
  if (!report.isAnonymous) return true;
  return anonymousCorroborators(report, all).size >= ANONYMOUS_MIN_REPORTERS;
}
