import { formatDemoClock } from "@/lib/demo-clock";

/** Thin bar that keeps the prototype status and the frozen demo clock always visible. */
export function PrototypeBar() {
  return (
    <div className="border-b border-warning/20 bg-warning-bg text-warning">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 px-4 py-1 text-[13px] font-medium">
        <span>Prototipo · datos de demostración</span>
        <span className="tabular">Reloj de demostración: {formatDemoClock()} (hora de Lima)</span>
      </div>
    </div>
  );
}
