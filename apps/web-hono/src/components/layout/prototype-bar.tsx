import { formatDemoClock } from "@/lib/demo-clock";

/** Black 32px mono strip that keeps the prototype status and the frozen demo clock always visible. */
export function PrototypeBar() {
  return (
    <div className="bg-[#111] text-white">
      <div className="flex h-8 items-center gap-5 overflow-hidden px-5 font-mono text-xs whitespace-nowrap">
        <span className="uppercase tracking-[0.06em]">Barra de prototipo</span>
        <span className="hidden sm:inline">Datos de demostración</span>
        <span className="tabular ml-auto">Reloj demo: {formatDemoClock()} (Lima)</span>
      </div>
    </div>
  );
}
