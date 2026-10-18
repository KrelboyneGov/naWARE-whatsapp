import { formatDemoClock } from "@/lib/demo-clock";

/** Cacao 32px mono strip that keeps the prototype status and the frozen demo clock always visible. */
export function PrototypeBar() {
  return (
    <div className="bg-cacao text-[#f6e7c8]">
      <div className="flex h-8 items-center gap-3 overflow-hidden px-3 font-mono text-[11px] whitespace-nowrap sm:gap-5 sm:px-5 sm:text-xs">
        <span className="uppercase tracking-[0.06em]">
          <span className="sm:hidden">Prototipo</span>
          <span className="hidden sm:inline">Barra de prototipo</span>
        </span>
        <span className="hidden sm:inline">Datos de demostración</span>
        <span className="tabular ml-auto truncate">
          <span className="hidden sm:inline">Reloj demo: </span>
          {formatDemoClock()} (Lima)
        </span>
      </div>
    </div>
  );
}
