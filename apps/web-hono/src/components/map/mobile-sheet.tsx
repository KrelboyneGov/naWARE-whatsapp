import { useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@emergency-map/web-ui";

export type SheetSnap = "peek" | "half" | "full";

const ORDER: SheetSnap[] = ["peek", "half", "full"];

/** Mobile heights. The map shrinks to the space above the sheet, so it never hides pins. */
const HEIGHTS: Record<SheetSnap, string> = {
  peek: "h-[4.5rem]",
  half: "h-[48%]",
  full: "h-full",
};

/** A vertical drag shorter than this counts as a tap on the handle. */
const DRAG_THRESHOLD_PX = 32;

/**
 * Bottom sheet of /mapa below the `md` breakpoint (design "Andes Alerta Móvil"). Three snaps:
 * peek (summary line), half (list next to the map) and full (list view, `?view=list`).
 * From `md` up it renders its children as a plain column so the desktop side panel is unchanged.
 */
export function MobileSheet({
  snap,
  onSnap,
  summary,
  children,
  className,
}: {
  snap: SheetSnap;
  onSnap: (snap: SheetSnap) => void;
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const startY = useRef<number | null>(null);
  const index = ORDER.indexOf(snap);

  const step = (delta: number) => {
    const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, index + delta))];
    if (next) onSnap(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    startY.current = null;
    if (dy < -DRAG_THRESHOLD_PX) step(1);
    else if (dy > DRAG_THRESHOLD_PX) step(-1);
    else onSnap(snap === "peek" ? "half" : snap === "half" ? "full" : "half");
  };

  const expanded = snap !== "peek";

  return (
    <div
      className={cn(
        "bg-background relative z-10 flex min-h-0 flex-col overflow-hidden rounded-t-2xl shadow-[0_-4px_16px_rgba(17,17,17,0.08)] transition-[height] duration-300 ease-[cubic-bezier(.16,1,.3,1)]",
        HEIGHTS[snap],
        "md:h-auto md:rounded-none md:shadow-none md:transition-none",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={snap === "full" ? "Mostrar el mapa" : "Mostrar más resultados"}
        onPointerDown={(e) => {
          startY.current = e.clientY;
          // Keep receiving the pointer when the finger leaves the handle mid-drag.
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startY.current = null;
        }}
        className="flex w-full shrink-0 touch-none flex-col items-center gap-1.5 px-4 pt-2 pb-2.5 md:hidden"
      >
        <span className="bg-muted-foreground/30 h-1 w-9 rounded-full" aria-hidden />
        <span className="flex w-full items-center justify-between gap-2 text-[13px]">
          <span className="min-w-0 truncate text-left">{summary}</span>
          <span className="text-primary inline-flex shrink-0 items-center gap-1 font-medium">
            {snap === "full" ? (
              <>
                Ver mapa <ChevronDown className="size-4" aria-hidden />
              </>
            ) : (
              <>
                Ver lista <ChevronUp className="size-4" aria-hidden />
              </>
            )}
          </span>
        </span>
      </button>
      {/* `invisible` also hides the collapsed content from assistive tech, on mobile only. */}
      <div className={cn("flex min-h-0 flex-1 flex-col", !expanded && "invisible md:visible")}>
        {children}
      </div>
    </div>
  );
}
