import { Badge } from "@emergency-map/web-ui";
import type { Origin, ReviewStatus } from "@emergency-map/domain/constants";
import { ORIGIN_LABELS, REVIEW_LABELS } from "@/lib/labels";

/** Small local badges; the shared event components may replace them later. */
export function MapOriginBadge({ origin }: { origin: Origin }) {
  return <Badge variant="outline">{ORIGIN_LABELS[origin]}</Badge>;
}

export function MapReviewBadge({ status }: { status: ReviewStatus }) {
  return (
    <Badge variant={status === "disputed" ? "destructive" : "secondary"}>
      {REVIEW_LABELS[status]}
    </Badge>
  );
}
