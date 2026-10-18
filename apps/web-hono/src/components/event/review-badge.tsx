import type { ReviewStatus } from "@emergency-map/domain/constants";
import { AlertTriangle, CircleDashed, FileCheck2, ShieldCheck, Layers } from "lucide-react";

import { REVIEW_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STYLES: Record<ReviewStatus, { icon: typeof CircleDashed; className: string }> = {
  unverified: { icon: CircleDashed, className: "bg-muted text-muted-foreground" },
  with_contributions: { icon: Layers, className: "bg-brand-soft text-primary" },
  corroborated_by_review: { icon: FileCheck2, className: "bg-brand-soft text-primary" },
  officially_backed: { icon: ShieldCheck, className: "bg-brand-soft text-primary" },
  disputed: { icon: AlertTriangle, className: "bg-warning-bg text-warning" },
};

/** Review state of the content. Text + icon always accompany the color. */
export function ReviewBadge({ status, className }: { status: ReviewStatus; className?: string }) {
  const { icon: Icon, className: tone } = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px] font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {REVIEW_LABELS[status]}
    </span>
  );
}
