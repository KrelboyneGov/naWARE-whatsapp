import type { Origin } from "@emergency-map/domain/constants";
import { Building2, Landmark, User } from "lucide-react";

import { ORIGIN_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const ICONS = { citizen: User, organization: Building2, official: Landmark } as const;

/** Who published the information. Separate from review status (design doc 01). */
export function OriginBadge({ origin, className }: { origin: Origin; className?: string }) {
  const Icon = ICONS[origin];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[13px] text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {ORIGIN_LABELS[origin]}
    </span>
  );
}
