/**
 * Client-only map canvas for /mapa. Imported lazily so MapLibre never runs on the server.
 * Layers: citizen events (markers), official notices (polygons), help points (own markers).
 */
import { useEffect, useRef, useState } from "react";
import { Home, Layers, Search, HandHelping } from "lucide-react";
import { Button } from "@emergency-map/web-ui";
import { PERU_BOUNDS } from "@emergency-map/domain/constants";
import type {
  Bounds,
  CollectionPoint,
  OfficialNotice,
  PublicEvent,
} from "@emergency-map/domain/schemas";
import {
  Map as MapCanvas,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MapPopup,
  MarkerContent,
  MarkerTooltip,
  useMap,
} from "@/components/ui/map";
import {
  CATEGORY_LABELS,
  NOTICE_VALIDITY_LABELS,
  PRECISION_LABELS,
  formatDateTime,
} from "@/lib/labels";
import { LAYER_LABELS, MAP_LAYERS, type MapLayer } from "@/lib/map-filters";
import { cn } from "@emergency-map/web-ui";
import { CATEGORY_ICONS } from "./category-icons";
import { MapOriginBadge, MapReviewBadge } from "./badges";

export interface MapFocus {
  lng: number;
  lat: number;
  zoom: number;
  /** Changes on every request so the same target can be flown to twice. */
  key: number;
}

export interface MapViewProps {
  events: PublicEvent[];
  notices: OfficialNotice[];
  collectionPoints: CollectionPoint[];
  layerOn: Record<MapLayer, boolean>;
  onToggleLayer: (layer: MapLayer) => void;
  selectedId: string | undefined;
  onSelect: (id: string | undefined) => void;
  boundsMode: boolean;
  onSearchArea: (bounds: Bounds) => void;
  focus: MapFocus | null;
  resetKey: number;
  onReset: () => void;
  onTilesFailed: () => void;
}

const NOTICE_COLORS: Record<string, string> = {
  red: "#dc2626",
  orange: "#ea580c",
  yellow: "#ca8a04",
};

function MapEffects({
  focus,
  resetKey,
  selected,
  onUserMoved,
  onTilesFailed,
}: {
  focus: MapFocus | null;
  resetKey: number;
  selected: PublicEvent | undefined;
  onUserMoved: (bounds: Bounds) => void;
  onTilesFailed: () => void;
}) {
  const { map } = useMap();
  const movedRef = useRef(onUserMoved);
  movedRef.current = onUserMoved;
  const failedRef = useRef(onTilesFailed);
  failedRef.current = onTilesFailed;

  useEffect(() => {
    if (!map) return;
    let errors = 0;
    const onMoveEnd = (e: { originalEvent?: unknown }) => {
      // Only user gestures (drag, wheel, buttons) have an originalEvent; programmatic flights do not.
      if (!e.originalEvent) return;
      const b = map.getBounds();
      movedRef.current([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };
    const onError = () => {
      errors += 1;
      if (errors >= 3 || !map.isStyleLoaded()) failedRef.current();
    };
    map.on("moveend", onMoveEnd);
    map.on("error", onError);
    return () => {
      map.off("moveend", onMoveEnd);
      map.off("error", onError);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !focus) return;
    map.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom, duration: 800 });
  }, [map, focus]);

  useEffect(() => {
    if (!map || resetKey === 0) return;
    map.fitBounds(PERU_BOUNDS as unknown as [number, number, number, number], {
      padding: 24,
      duration: 800,
    });
  }, [map, resetKey]);

  const point = selected?.place.point;
  useEffect(() => {
    if (!map || !point) return;
    if (!map.getBounds().contains([point.lng, point.lat])) {
      map.easeTo({ center: [point.lng, point.lat], duration: 500 });
    }
  }, [map, point]);

  return null;
}

function EventPin({
  event,
  selected,
  onSelect,
}: {
  event: PublicEvent;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const point = event.place.point;
  if (!point) return null; // district precision: never invent a point
  const Icon = CATEGORY_ICONS[event.category];
  const approximate = event.place.precision === "approximate";
  return (
    <MapMarker longitude={point.lng} latitude={point.lat} onClick={() => onSelect(event.id)}>
      <MarkerContent>
        <button
          type="button"
          aria-label={`${CATEGORY_LABELS[event.category]}: ${event.title} (${PRECISION_LABELS[event.place.precision]})`}
          className={cn(
            "flex size-8 items-center justify-center rounded-full border-2 shadow-md transition-transform",
            approximate
              ? "border-dashed border-primary bg-background text-primary"
              : "border-background bg-primary text-primary-foreground",
            selected && "scale-125 ring-4 ring-ring/60",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      </MarkerContent>
      <MarkerTooltip>
        <span className="text-xs">
          {event.title} · {PRECISION_LABELS[event.place.precision]}
        </span>
      </MarkerTooltip>
    </MapMarker>
  );
}

export default function MapView(props: MapViewProps) {
  const {
    events,
    notices,
    collectionPoints,
    layerOn,
    onToggleLayer,
    selectedId,
    onSelect,
    boundsMode,
    onSearchArea,
    focus,
    resetKey,
    onTilesFailed,
  } = props;
  const [moved, setMoved] = useState<Bounds | null>(null);
  const [noticePopup, setNoticePopup] = useState<{
    id: string;
    lng: number;
    lat: number;
  } | null>(null);
  const selected = events.find((e) => e.id === selectedId);
  const popupNotice = notices.find((n) => n.id === noticePopup?.id);

  return (
    <div className="relative h-full w-full">
      <MapCanvas
        theme="light"
        bounds={PERU_BOUNDS as unknown as [number, number, number, number]}
        fitBoundsOptions={{ padding: 24 }}
        className="h-full w-full"
      >
        <MapEffects
          focus={focus}
          resetKey={resetKey}
          selected={selected}
          onUserMoved={setMoved}
          onTilesFailed={onTilesFailed}
        />
        <MapControls position="bottom-right" showZoom showLocate />

        {layerOn.notices &&
          notices.map((n) => {
            if (!n.geometry) return null;
            const color = NOTICE_COLORS[n.severity?.level ?? ""] ?? "#2563eb";
            const expired = n.validity !== "active";
            return (
              <MapGeoJSON
                key={n.id}
                id={`notice-${n.id}`}
                data={{
                  type: "Feature",
                  properties: { id: n.id },
                  geometry: n.geometry as unknown as GeoJSON.Geometry,
                }}
                interactive
                fillPaint={{ "fill-color": color, "fill-opacity": expired ? 0.08 : 0.15 }}
                linePaint={{
                  "line-color": color,
                  "line-width": 2,
                  ...(expired ? { "line-dasharray": [2, 2] } : {}),
                }}
                onClick={(e) => setNoticePopup({ id: n.id, lng: e.longitude, lat: e.latitude })}
              />
            );
          })}

        {layerOn.events &&
          events.map((e) => (
            <EventPin key={e.id} event={e} selected={e.id === selectedId} onSelect={onSelect} />
          ))}

        {layerOn.help &&
          collectionPoints.map((p) => (
            <MapMarker key={p.id} longitude={p.location.lng} latitude={p.location.lat}>
              <MarkerContent>
                <div
                  role="img"
                  aria-label={`Punto de acopio: ${p.name}`}
                  className="flex size-7 items-center justify-center rounded-md border-2 border-background bg-emerald-600 text-white shadow-md"
                >
                  <HandHelping className="size-4" aria-hidden />
                </div>
              </MarkerContent>
              <MarkerTooltip>
                <span className="text-xs">Punto de acopio: {p.name} (no es una emergencia)</span>
              </MarkerTooltip>
            </MapMarker>
          ))}

        {selected?.place.point && layerOn.events && (
          <MapPopup
            longitude={selected.place.point.lng}
            latitude={selected.place.point.lat}
            offset={22}
            closeButton
            onClose={() => onSelect(undefined)}
          >
            <div className="flex w-56 flex-col gap-1.5 text-sm">
              <p className="font-medium leading-snug">{selected.title}</p>
              <p className="text-muted-foreground text-xs">
                {selected.place.territory.name}, {selected.place.territory.provinceName},{" "}
                {selected.place.territory.departmentName} ·{" "}
                {PRECISION_LABELS[selected.place.precision]}
              </p>
              <div className="flex flex-wrap gap-1">
                <MapOriginBadge origin={selected.origin} />
                <MapReviewBadge status={selected.reviewStatus} />
              </div>
              <a
                href={`/eventos/${selected.id}`}
                className="text-primary text-xs font-medium underline-offset-4 hover:underline"
              >
                Ver detalle
              </a>
            </div>
          </MapPopup>
        )}

        {popupNotice && noticePopup && (
          <MapPopup
            longitude={noticePopup.lng}
            latitude={noticePopup.lat}
            closeButton
            onClose={() => setNoticePopup(null)}
          >
            <div className="flex w-56 flex-col gap-1 text-sm">
              <p className="font-medium leading-snug">{popupNotice.title}</p>
              <p className="text-muted-foreground text-xs">
                {NOTICE_VALIDITY_LABELS[popupNotice.validity]} · {popupNotice.severity?.legend}
              </p>
              <p className="text-muted-foreground text-xs">
                Vigencia: {formatDateTime(popupNotice.validFrom)}
                {popupNotice.validTo ? ` a ${formatDateTime(popupNotice.validTo)}` : ""}
              </p>
              <p className="text-muted-foreground text-xs">Fuente: {popupNotice.institution}</p>
            </div>
          </MapPopup>
        )}
      </MapCanvas>

      <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
        {moved && (
          <div className="pointer-events-auto flex max-w-xs flex-col items-center gap-1">
            <Button
              size="sm"
              onClick={() => {
                onSearchArea(moved);
                setMoved(null);
              }}
            >
              <Search aria-hidden /> Buscar en esta área
            </Button>
            <p className="bg-background/90 text-muted-foreground rounded px-2 py-1 text-center text-xs">
              Reemplaza el filtro por localidad con el área visible. Los eventos solo de distrito no
              tienen punto y no entran en un área.
            </p>
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 flex max-w-[15rem] flex-col gap-2">
        <details className="bg-background rounded-md border text-xs shadow-sm" open>
          <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 font-medium">
            <Layers className="size-3.5" aria-hidden /> Capas
          </summary>
          <div className="flex flex-col gap-1 border-t px-2.5 py-2">
            {MAP_LAYERS.map((l) => (
              <label key={l} className="flex items-center gap-2">
                <input type="checkbox" checked={layerOn[l]} onChange={() => onToggleLayer(l)} />
                {LAYER_LABELS[l]}
              </label>
            ))}
            {MAP_LAYERS.some((l) => !layerOn[l]) && (
              <p className="text-muted-foreground pt-1">
                Capas apagadas:{" "}
                {MAP_LAYERS.filter((l) => !layerOn[l])
                  .map((l) => LAYER_LABELS[l])
                  .join(", ")}
                . Tus filtros se conservan.
              </p>
            )}
          </div>
        </details>
        <details className="bg-background rounded-md border text-xs shadow-sm">
          <summary className="cursor-pointer px-2.5 py-1.5 font-medium">Leyenda</summary>
          <ul className="flex flex-col gap-1.5 border-t px-2.5 py-2">
            <li className="flex items-center gap-2">
              <span className="bg-primary inline-block size-4 rounded-full border-2 border-background" />
              Punto indicado
            </li>
            <li className="flex items-center gap-2">
              <span className="border-primary inline-block size-4 rounded-full border-2 border-dashed" />
              Punto aproximado (no es el perímetro)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block size-4 rounded border-2 border-orange-600 bg-orange-600/15" />
              Aviso oficial (borde continuo = vigente, punteado = vencido)
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block size-4 rounded bg-emerald-600" />
              Punto de acopio (no es una emergencia)
            </li>
          </ul>
        </details>
      </div>

      <div className="absolute top-2 left-2 flex flex-col items-start">
        <Button size="sm" variant="outline" className="bg-background" onClick={props.onReset}>
          <Home aria-hidden /> Volver a Perú
        </Button>
        {boundsMode && (
          <p className="bg-background mt-1 rounded border px-2 py-1 text-xs shadow-sm">
            Mostrando el área visible
          </p>
        )}
      </div>
    </div>
  );
}
