import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChipTone = "neutral" | "positive" | "warning" | "danger";

const TONES: Record<ChipTone, string> = {
  neutral: "bg-status-neutral-quiet text-status-neutral",
  positive: "bg-status-positive-quiet text-status-positive",
  warning: "bg-status-warning-quiet text-status-warning",
  danger: "bg-status-danger-quiet text-status-danger",
};

/** Small status pill. Always carries text; the dot is decoration, never the only signal. */
export function StatusChip({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: ChipTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[13px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
