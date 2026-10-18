import type { SituationStatus } from "@emergency-map/domain/constants";
import { Clock3, Flag, RefreshCw } from "lucide-react";
import { SITUATION_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STYLES = {
  recent_update: { icon: RefreshCw, className: "bg-accent-primary-quiet text-accent-primary" },
  no_recent_update: { icon: Clock3, className: "bg-status-neutral-quiet text-text-secondary" },
  closure_reported: { icon: Flag, className: "bg-status-neutral-quiet text-text-secondary" },
} as const;

/**
 * Situation dimension (is the information current?). Independent from review and publication;
 * a reported closure is a communicated fact, never "safe".
 */
export function SituationBadge({
  status,
  className,
}: {
  status: SituationStatus;
  className?: string;
}) {
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
      {SITUATION_LABELS[status]}
    </span>
  );
}
