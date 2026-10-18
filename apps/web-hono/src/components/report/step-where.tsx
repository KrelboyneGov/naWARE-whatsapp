import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button, Input, Label } from "@emergency-map/web-ui";
import type { Territory } from "@emergency-map/domain/schemas";
import { CATEGORY_LABELS, formatDateTime } from "@/lib/labels";
import { searchTerritories, territoryLabel } from "@/lib/map-filters";
import type { ReportDraft } from "@/lib/report-draft";
import { FieldError } from "./step-what";
import { limaToday, type DuplicateSuggestion, type FieldErrors, haversineKm } from "./report-logic";

const PlacePicker = lazy(() => import("./place-picker"));

export function StepWhere({
  draft,
  errors,
  territories,
  territory,
  duplicates,
  onChange,
  onPickDuplicate,
}: {
  draft: ReportDraft;
  errors: FieldErrors;
  territories: Territory[];
  territory: Territory | undefined;
  duplicates: DuplicateSuggestion[];
  onChange: (patch: Partial<ReportDraft>) => void;
  onPickDuplicate: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const suggestions = useMemo(() => searchTerritories(territories, query), [territories, query]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const locate = () => {
    setGpsMessage(null);
    if (!("geolocation" in navigator)) {
      setGpsMessage(
        "Tu navegador no ofrece ubicación. Busca el distrito o marca un punto en el mapa.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setGpsMessage(
          "No pudimos obtener tu ubicación (sin permiso o sin señal). Busca el distrito o marca un punto en el mapa.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  const confirmGps = () => {
    if (!gps) return;
    let nearest: Territory | undefined;
    let best = Infinity;
    for (const t of territories) {
      const km = haversineKm(gps, t.centroid);
      if (km < best) {
        best = km;
        nearest = t;
      }
    }
    // Only adopt the nearest demo district when it is plausibly the same place.
    const patch: Partial<ReportDraft> = {
      point: gps,
      pointFromGps: true,
      precision: "approximate",
    };
    if (nearest && best <= 60 && !draft.ubigeo) patch.ubigeo = nearest.ubigeo;
    onChange(patch);
    setGps(null);
  };

  const today = limaToday();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3" aria-labelledby="where-title">
        <h3 id="where-title" className="text-sm font-medium">
          ¿Dónde ocurrió?
        </h3>

        {territory ? (
          <div className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <span>
              <strong>{territory.name}</strong>
              <br />
              <span className="text-muted-foreground text-xs">{territoryLabel(territory)}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange({ ubigeo: null, point: null, pointFromGps: false })}
            >
              Cambiar
            </Button>
          </div>
        ) : (
          <div className="relative" id="field-place">
            <Label htmlFor="report-search" className="sr-only">
              Buscar distrito, provincia o departamento
            </Label>
            <Search
              className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4"
              aria-hidden
            />
            <Input
              id="report-search"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar distrito, provincia o departamento"
              autoComplete="off"
              aria-invalid={!!errors.place}
              aria-describedby="err-place"
            />
            {query.trim().length >= 2 && (
              <ul className="bg-popover absolute z-20 mt-1 w-full rounded-md border shadow-md">
                {suggestions.length === 0 && (
                  <li className="text-muted-foreground px-3 py-2 text-xs">
                    No encontramos esa localidad en los datos de demostración.
                  </li>
                )}
                {suggestions.map((t) => (
                  <li key={t.ubigeo}>
                    <button
                      type="button"
                      className="hover:bg-muted flex w-full flex-col px-3 py-2 text-left text-sm"
                      onClick={() => {
                        onChange({ ubigeo: t.ubigeo, point: null, pointFromGps: false });
                        setQuery("");
                      }}
                    >
                      <span className="font-medium">{t.name}</span>
                      <span className="text-muted-foreground text-xs">{territoryLabel(t)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <FieldError id="err-place" message={errors.place} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={locate} disabled={locating}>
            <LocateFixed aria-hidden /> {locating ? "Buscando..." : "Usar mi ubicación"}
          </Button>
          <span className="text-muted-foreground text-xs">
            Solo se usa si lo pides. Tu ubicación no es necesariamente el lugar del evento.
          </span>
        </div>
        {gpsMessage && (
          <Alert variant="destructive">
            <AlertDescription>{gpsMessage}</AlertDescription>
          </Alert>
        )}
        {gps && (
          <Alert>
            <AlertTitle>¿El evento ocurrió aquí?</AlertTitle>
            <AlertDescription>
              <p>
                Obtuvimos tu ubicación actual. Si el evento ocurrió en otro lugar, elige «No» y
                busca el distrito o marca el punto.
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={confirmGps}>
                  Sí, ocurrió aquí
                </Button>
                <Button size="sm" variant="outline" onClick={() => setGps(null)}>
                  No
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">¿Qué precisión quieres compartir?</legend>
          {(
            [
              {
                v: "approximate",
                t: "Punto aproximado",
                d: "Se mostrará un punto redondeado (alrededor de 1 km) en el mapa. Tu punto exacto no se publica.",
              },
              {
                v: "district",
                t: "Solo distrito",
                d: "No se mostrará ningún punto en el mapa; el reporte aparecerá solo en listas, con «Solo distrito».",
              },
            ] as const
          ).map((o) => (
            <label
              key={o.v}
              className="has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-ring/50 flex cursor-pointer flex-col rounded-md border p-3 text-sm has-[:focus-visible]:ring-2"
            >
              <input
                type="radio"
                name="precision"
                value={o.v}
                checked={draft.precision === o.v}
                onChange={() => onChange({ precision: o.v })}
                className="sr-only"
              />
              <span className="font-medium">{o.t}</span>
              <span className="text-muted-foreground text-xs">{o.d}</span>
            </label>
          ))}
        </fieldset>

        {draft.precision === "approximate" && (
          <div id="field-point" className="flex flex-col gap-1.5">
            <p className="text-sm">Haz clic en el mapa para marcar el punto. Puedes arrastrarlo.</p>
            <div className="h-60 overflow-hidden rounded-md border">
              {mounted ? (
                <Suspense fallback={<div className="bg-muted h-full w-full" />}>
                  <PlacePicker
                    point={draft.point}
                    center={territory ? territory.centroid : null}
                    onPick={(p) => onChange({ point: p, pointFromGps: false })}
                  />
                </Suspense>
              ) : (
                <div className="bg-muted h-full w-full" />
              )}
            </div>
            {draft.point && (
              <p className="text-muted-foreground text-xs">
                Punto marcado{draft.pointFromGps ? " con tu ubicación" : " en el mapa"}.
              </p>
            )}
            <FieldError id="err-point" message={errors.point} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="field-reference">Referencia pública (opcional)</Label>
          <Input
            id="field-reference"
            maxLength={200}
            value={draft.reference}
            onChange={(e) => onChange({ reference: e.target.value })}
            placeholder="Ej.: ladera norte, cruce de la avenida"
          />
          <p className="text-muted-foreground text-xs">
            Se muestra públicamente. No escribas direcciones particulares.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="when-title">
        <h3 id="when-title" className="text-sm font-medium">
          ¿Cuándo ocurrió? (hora de Lima)
        </h3>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="field-date">Fecha</Label>
          <Input
            id="field-date"
            type="date"
            max={today}
            value={draft.date}
            onChange={(e) => onChange({ date: e.target.value })}
            aria-invalid={!!errors.date}
            aria-describedby="err-date"
            className="max-w-48"
          />
          <FieldError id="err-date" message={errors.date} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.timeMode !== "exact"}
            onChange={(e) => onChange({ timeMode: e.target.checked ? "day" : "exact" })}
          />
          No sé la hora exacta
        </label>

        {draft.timeMode !== "exact" && (
          <div className="flex gap-2 text-sm" role="radiogroup" aria-label="Precisión de la hora">
            {(
              [
                ["day", "Solo sé el día"],
                ["interval", "Sé un intervalo"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="timeMode"
                  checked={draft.timeMode === v}
                  onChange={() => onChange({ timeMode: v })}
                />
                {l}
              </label>
            ))}
          </div>
        )}

        {draft.timeMode !== "day" && (
          <div id="field-time" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-time-start">
                {draft.timeMode === "interval" ? "Desde" : "Hora"}
              </Label>
              <Input
                id="field-time-start"
                type="time"
                value={draft.time}
                onChange={(e) => onChange({ time: e.target.value })}
                aria-invalid={!!errors.time}
                aria-describedby="err-time"
                className="w-32"
              />
            </div>
            {draft.timeMode === "interval" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="field-time-end">Hasta</Label>
                <Input
                  id="field-time-end"
                  type="time"
                  value={draft.timeEnd}
                  onChange={(e) => onChange({ timeEnd: e.target.value })}
                  aria-invalid={!!errors.time}
                  aria-describedby="err-time"
                  className="w-32"
                />
              </div>
            )}
          </div>
        )}
        <FieldError id="err-time" message={errors.time} />
      </section>

      {draft.category &&
        draft.ubigeo &&
        (duplicates.length > 0 || draft.dismissedDuplicateIds.length > 0) && (
          <section className="flex flex-col gap-3" aria-labelledby="dup-title">
            <h3 id="dup-title" className="text-sm font-medium">
              ¿Es alguno de estos eventos?
            </h3>
            {duplicates.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Marcaste los eventos cercanos como diferentes. Puedes seguir con tu reporte.
              </p>
            ) : (
              <>
                <p className="text-muted-foreground text-xs">
                  Encontramos eventos parecidos ({CATEGORY_LABELS[draft.category]}) cerca en lugar y
                  fecha. Si es el mismo, tu aporte ayuda más como evidencia que como reporte nuevo.
                </p>
                <ul className="flex flex-col gap-2">
                  {duplicates.map((d) => (
                    <li
                      key={d.event.id}
                      className="flex flex-col gap-2 rounded-md border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{d.event.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {d.event.place.territory.name} ·{" "}
                          {formatDateTime(d.event.occurredAt.start)} ·{" "}
                          {d.approxDistanceKm === null
                            ? "mismo distrito"
                            : `a unos ${d.approxDistanceKm.toFixed(1)} km`}
                          , {Math.round(d.hoursApart)} h de diferencia
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => onPickDuplicate(d.event.id)}>
                          Es este evento: aportar evidencia
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onChange({
                              dismissedDuplicateIds: [...draft.dismissedDuplicateIds, d.event.id],
                            })
                          }
                        >
                          Es un evento diferente
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
    </div>
  );
}
