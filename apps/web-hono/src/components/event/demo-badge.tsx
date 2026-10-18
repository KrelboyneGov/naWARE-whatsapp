import { DEMO_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Mandatory marker on every fictitious record (design doc 01). */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-dashed border-warning/50 bg-warning-bg px-2 py-0.5 text-[13px] font-medium text-warning",
        className,
      )}
    >
      {DEMO_LABEL}
    </span>
  );
}
