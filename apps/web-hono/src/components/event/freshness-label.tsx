import type { SituationStatus } from "@emergency-map/domain/constants";
import { Clock3, RefreshCw, Flag } from "lucide-react";

import { SITUATION_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const ICONS = {
  recent_update: RefreshCw,
  no_recent_update: Clock3,
  closure_reported: Flag,
} as const;

/** How recent the information is. Never implies the danger has passed. */
export function FreshnessLabel({
  status,
  className,
}: {
  status: SituationStatus;
  className?: string;
}) {
  const Icon = ICONS[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[13px] text-muted-foreground", className)}
    >
      <Icon className="size-3.5" aria-hidden />
      {SITUATION_LABELS[status]}
    </span>
  );
}
