import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crosshair, HandHelping, Locate, MapPin } from "lucide-react";
import { Button, Skeleton, cn } from "@emergency-map/web-ui";
import { NEARBY_RADII_KM, DEFAULT_NEARBY_RADIUS_KM } from "@emergency-map/domain/constants";
import type { GeoPoint } from "@emergency-map/domain/schemas";
import { CATEGORY_ICONS, DemoBadge, EmptyState, ReviewBadge } from "@/components/event";
import { CATEGORY_LABELS, formatDateTime, formatRelative } from "@/lib/labels";
import { GPS_PROBLEM_COPY, useGeolocation, type GpsReading } from "./use-geolocation";
import {
  computeNearby,
  useNearbyDataset,
  type CenterSource,
  type NearbyRow,
  type NearbyTab,
} from "./use-nearby";

const NearbyMap = lazy(() => import("./nearby-map"));

const TABS: Array<{ value: NearbyTab; label: string }> = [
  { value: "events", label: "Eventos" },
  { value: "road_incidents", label: "Incidentes viales" },
  { value: "help", label: "Ayuda" },
];

const LIMA_FOCUS = { lat: -12.05, lng: -77.03, zoom: 10 };
const time = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface Origin {
  point: GeoPoint;
  source: CenterSource;
  at: Date;
  accuracyM?: number;
}

/** /cerca: nearby events, road incidents and help. Location is read only after an explicit tap. */
export function NearbyPage() {
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radius, setRadius] = useState<number>(DEFAULT_NEARBY_RADIUS_KM);
  const [tab, setTab] = useState<NearbyTab>("events");
  const [pending, setPending] = useState<GeoPoint | null>(null);
  const [focus, setFocus] = useState<{
    lat: number;
    lng: number;
    zoom: number;
    key: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = useNearbyDataset();

  const applyReading = useCallback((r: GpsReading) => {
    setOrigin({ point: r.point, source: "gps", at: r.at, accuracyM: r.accuracyM });
    setPending(null);
  }, []);
  const gps = useGeolocation(applyReading);

  const pickPoint = useCallback(
    (p: GeoPoint) => {
      if (!origin) setOrigin({ point: p, source: "manual", at: new Date() });
      else setPending(p);
      gps.clear();
    },
    [origin, gps],
  );

  const rows = useMemo(
    () => (data.data && origin ? computeNearby(data.data, origin.point, radius, tab) : []),
    [data.data, origin, radius, tab],
  );

  const asking = !origin;

  const mapNode = tilesFailed ? (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-medium">No pudimos cargar el mapa</p>
      <p className="max-w-xs text-sm text-[var(--text-secondary)]">
        La lista de resultados sigue disponible.
      </p>
      <Button variant="ghost" size="sm" onClick={() => setTilesFailed(false)}>
        Reintentar
      </Button>
    </div>
  ) : mounted ? (
    <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
      <NearbyMap
        center={origin?.point ?? null}
        radiusKm={radius}
        rows={rows}
        pending={pending}
        focus={focus}
        onPick={pickPoint}
        onTilesFailed={() => setTilesFailed(true)}
      />
    </Suspense>
  ) : (
    <Skeleton className="h-full w-full rounded-none" aria-label="Cargando el mapa" />
  );

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col md:h-[calc(100dvh-4rem)] md:flex-row">
      <aside className="order-2 flex min-h-0 flex-col border-t border-[var(--border-subtle)] md:order-1 md:w-[440px] md:shrink-0 md:border-t-0 md:border-r">
        {asking ? (
          <div className="grid gap-4 p-5 md:p-6">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Cerca de mí</h1>
            <p className="text-sm text-balance text-[var(--text-secondary)]">
              Usaremos tu ubicación para buscar reportes y lugares de ayuda cercanos. Solo se lee
              una vez, cuando tú lo pidas; no te rastreamos ni la incluimos en enlaces compartidos.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={gps.request} disabled={gps.pending}>
                <Locate aria-hidden /> {gps.pending ? "Buscando ubicación…" : "Usar mi ubicación"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setFocus({ ...LIMA_FOCUS, key: Date.now() });
                  gps.clear();
                }}
              >
                <MapPin aria-hidden /> Elegir un punto
              </Button>
            </div>
            {gps.problem && (
              <div
                role="alert"
                className="grid gap-1 rounded-lg bg-warning-bg p-3 text-sm text-warning"
              >
                <strong className="font-medium">{GPS_PROBLEM_COPY[gps.problem].title}</strong>
                <span>{GPS_PROBLEM_COPY[gps.problem].text}</span>
                {gps.problem === "stale" && gps.staleReading && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 justify-self-start"
                    onClick={() => applyReading(gps.staleReading!)}
                  >
                    Usar igual
                  </Button>
                )}
              </div>
            )}
            <p className="text-xs text-[var(--text-secondary)]">
              También puedes tocar el mapa para elegir un punto manualmente.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2.5 border-b border-[var(--border-subtle)] px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium">
                    {origin.source === "gps" ? "Ubicación por GPS" : "Punto elegido manualmente"}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {origin.source === "gps"
                      ? `Leída a las ${time.format(origin.at)}${
                          origin.accuracyM
                            ? ` · precisión aproximada ±${Math.round(origin.accuracyM)} m`
                            : ""
                        } · no se rastrea`
                      : `Elegido a las ${time.format(origin.at)} · ${origin.point.lat.toFixed(3)}, ${origin.point.lng.toFixed(3)}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOrigin(null);
                    setPending(null);
                  }}
                >
                  Cambiar
                </Button>
              </div>
              <div className="flex items-center gap-2.5">
                <span id="radius-label" className="text-[13px] text-[var(--text-secondary)]">
                  Radio
                </span>
                <div role="group" aria-labelledby="radius-label" className="flex gap-1">
                  {NEARBY_RADII_KM.map((km) => (
                    <button
                      key={km}
                      type="button"
                      aria-pressed={radius === km}
                      onClick={() => setRadius(km)}
                      className={cn(
                        "h-7 rounded-md border px-2.5 text-[13px]",
                        radius === km
                          ? "border-primary bg-brand-soft font-medium text-primary"
                          : "border-border text-[var(--text-secondary)]",
                      )}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
              </div>
              {origin.source === "gps" && (
                <span className="text-xs text-warning">
                  Tu ubicación es aproximada; las distancias también lo son.
                </span>
              )}
              {pending && (
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-self-start"
                  onClick={() => {
                    setOrigin({ point: pending, source: "manual", at: new Date() });
                    setPending(null);
                  }}
                >
                  <Crosshair aria-hidden /> Buscar desde este punto
                </Button>
              )}
            </div>
            <div role="tablist" aria-label="Tipo de resultado" className="flex gap-1 border-b px-5">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.value}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    "-mb-px h-10 border-b-2 px-3 text-sm",
                    tab === t.value
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-[var(--text-secondary)]",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid flex-1 content-start gap-2 overflow-auto px-5 pt-3 pb-5">
              {data.isPending && <Skeleton className="h-24" aria-label="Cargando resultados" />}
              {data.isError && (
                <div role="alert" className="grid justify-items-start gap-2 text-sm">
                  <p>No pudimos cargar los resultados. Esto no significa que no haya peligro.</p>
                  <Button size="sm" variant="outline" onClick={() => data.refetch()}>
                    Reintentar
                  </Button>
                </div>
              )}
              {data.data && rows.length === 0 && (
                <EmptyState
                  title="Nada en este radio"
                  description="Amplía el radio o busca desde otro punto. No significa que no haya peligro."
                />
              )}
              {data.data &&
                rows.map((r) => (
                  <ResultRow
                    key={r.kind === "event" ? r.event.id : r.point.id}
                    row={r}
                    now={data.data.now}
                  />
                ))}
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Distancias en línea recta, aproximadas. No indican tiempo de viaje, accesibilidad ni
                ruta segura. Los incidentes viales son reportes ciudadanos recientes, no datos
                completos de tráfico.
              </p>
            </div>
          </>
        )}
      </aside>

      <section
        aria-label="Mapa"
        className="relative order-1 h-[45dvh] min-h-0 bg-muted md:order-2 md:h-auto md:flex-1"
      >
        {mapNode}
        <div className="pointer-events-none absolute top-3 left-3 max-w-[calc(100%-5rem)] rounded-lg border border-[var(--border-subtle)] bg-background px-3 py-2 text-xs shadow-[var(--shadow-xs)]">
          {origin
            ? `Círculo: área de búsqueda de ${radius} km. No es una zona de peligro ni de seguridad.`
            : "Toca el mapa para elegir un punto manualmente."}
        </div>
      </section>
    </div>
  );
}

function ResultRow({ row, now }: { row: NearbyRow; now: Date }) {
  if (row.kind === "help") {
    const p = row.point;
    return (
      <Link
        to={"/ayudar" as "/"}
        className="grid grid-cols-[32px_1fr_auto] gap-2.5 rounded-xl border border-[var(--border-subtle)] p-3 hover:border-[var(--border-strong)] hover:no-underline"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <HandHelping className="size-4" aria-hidden />
        </span>
        <span className="grid min-w-0 gap-1">
          <span className="text-sm font-medium leading-snug">{p.name}</span>
          <span className="text-xs text-[var(--text-secondary)]">
            {p.schedule.text} · recibe para{" "}
            {p.destinationTerritories.map((t) => t.name).join(", ") || "destino no indicado"}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            {p.status === "temporarily_closed" && <strong>Cerrado temporalmente</strong>}
            {p.availabilityConfirmedAt
              ? `Contacto revisado ${formatDateTime(p.availabilityConfirmedAt)}`
              : "Disponibilidad sin confirmar"}
            {p.isDemo && <DemoBadge />}
          </span>
        </span>
        <Distance text={`~${row.distanceKm.toFixed(1)} km`} />
      </Link>
    );
  }
  const e = row.event;
  const Icon = CATEGORY_ICONS[e.category];
  const place = [e.place.territory.name, e.place.territory.departmentName]
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");
  return (
    <Link
      to={`/eventos/${e.id}` as "/"}
      className="grid grid-cols-[32px_1fr_auto] gap-2.5 rounded-xl border border-[var(--border-subtle)] p-3 hover:border-[var(--border-strong)] hover:no-underline"
    >
      <span className="bg-muted flex size-8 items-center justify-center rounded-lg">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="grid min-w-0 gap-1">
        <span className="text-sm font-medium leading-snug">{e.title}</span>
        <span className="text-xs text-[var(--text-secondary)]">
          {CATEGORY_LABELS[e.category]} · {place} · {formatRelative(e.lastUpdatedAt, now)}
          {e.place.precision !== "exact" ? " · ubicación aproximada" : ""}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <ReviewBadge status={e.reviewStatus} />
          {e.isDemo && <DemoBadge />}
        </span>
      </span>
      <Distance
        text={
          row.distanceKm === null ? "coincidencia territorial" : `~${row.distanceKm.toFixed(1)} km`
        }
      />
    </Link>
  );
}

function Distance({ text }: { text: string }) {
  return (
    <span
      className="max-w-24 text-right font-mono text-[13px] whitespace-normal text-[var(--text-secondary)]"
      title="Distancia aproximada en línea recta"
    >
      {text}
    </span>
  );
}
