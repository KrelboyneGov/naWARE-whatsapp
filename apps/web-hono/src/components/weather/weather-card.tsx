import { Sun, Thermometer } from "lucide-react";
import type { GeoPoint } from "@emergency-map/domain/schemas";
import { Skeleton, cn } from "@emergency-map/web-ui";
import { DemoBadge } from "@/components/event";
import { formatDateTime } from "@/lib/labels";
import { useWeather } from "./use-weather";

const UV_TONE = {
  low: "border-[var(--border-subtle)]",
  moderate: "border-yellow-300",
  high: "border-orange-300",
  very_high: "border-red-300",
  extreme: "border-fuchsia-400",
} as const;

/**
 * "Hace mucho calor en tu zona": the number plus what it means and what to do. It is forecast
 * context, never an official warning, and the card says where it comes from.
 */
export function WeatherCard({
  point,
  placeName,
  className,
}: {
  point: GeoPoint | null;
  placeName: string;
  className?: string;
}) {
  const q = useWeather(point);
  if (!point) return null;
  if (q.isPending) return <Skeleton className={cn("h-40 rounded-xl", className)} />;
  if (!q.data) return null;
  const { explanation: e, reading: r, source } = q.data;
  const Icon = e.uvBand && e.headline.startsWith("Radiación") ? Sun : Thermometer;

  return (
    <section
      aria-label={`Clima en ${placeName}`}
      className={cn(
        "grid gap-2 rounded-xl border-2 bg-card p-4",
        UV_TONE[e.uvBand ?? "low"],
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-6 shrink-0 text-amber-600" aria-hidden />
        <div className="grid gap-1">
          <p className="text-[13px] text-[var(--text-secondary)]">Ahora en {placeName}</p>
          <h2 className="text-lg leading-tight font-semibold">{e.headline}</h2>
          <p className="text-sm">{e.meaning}</p>
        </div>
        <span className="ml-auto text-3xl font-semibold tabular-nums">
          {Math.round(r.temperatureC)}°
        </span>
      </div>
      {e.actions.length > 0 && (
        <ul className="ml-9 list-disc space-y-0.5 text-sm">
          {e.actions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
      <p className="ml-9 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
        {source === "live"
          ? `Pronóstico de Open-Meteo (modelo, no es un aviso oficial) · ${formatDateTime(r.observedAt)}`
          : "Lectura ilustrativa: no pudimos consultar el pronóstico."}
        {source === "demo" && <DemoBadge />}
      </p>
    </section>
  );
}
