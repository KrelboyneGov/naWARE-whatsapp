import type { ReactNode } from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Explains why nothing is shown. Callers must pass copy that never implies safety
 * (use NO_RESULTS_COPY for filtered lists).
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border border-dashed border-border bg-card p-5",
        className,
      )}
    >
      <Info className="size-5 text-muted-foreground" aria-hidden />
      {title && <p className="font-heading text-base font-semibold">{title}</p>}
      <p className="text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
