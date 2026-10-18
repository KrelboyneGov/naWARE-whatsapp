import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { List, Map as MapIcon, Plus } from "lucide-react";
import { Button, Skeleton, buttonVariants, cn } from "@emergency-map/web-ui";
import type { Bounds, Territory } from "@emergency-map/domain/schemas";
import { useMapData } from "@/components/map/use-map-data";
import { MapPanel } from "@/components/map/map-panel";
import type { MapFocus } from "@/components/map/map-view";
import {
  LAYER_LABELS,
  MAP_LAYERS,
  applyEventFilters,
  applyNoticeFilters,
  formatBbox,
  mapSearchSchema,
  searchToFilters,
  type MapLayer,
  type MapSearch,
} from "@/lib/map-filters";

// MapLibre touches `window`: load it only in the browser.
const MapView = lazy(() => import("@/components/map/map-view"));

export const Route = createFileRoute("/mapa")({
  validateSearch: (search: Record<string, unknown>): MapSearch => mapSearchSchema.parse(search),
  head: () => ({ meta: [{ title: "Mapa del Perú" }] }),
  component: MapaPage,
});

function MapSkeleton() {
  return <Skeleton className="h-full w-full rounded-none" aria-label="Cargando el mapa" />;
}

function MapaPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isPending } = useMapData();
  const [mounted, setMounted] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const view = search.view ?? "map";

  useEffect(() => setMounted(true), []);

  const patch = useCallback(
    (p: Partial<MapSearch>) =>
      navigate({
        search: (prev) => ({ ...prev, ...p }),
        replace: true,
        resetScroll: false,
      }),
    [navigate],
  );

  const filters = useMemo(() => searchToFilters(search), [search]);
  const now = data?.now ?? new Date();
  const events = useMemo(
    () => (data ? applyEventFilters(data.events, filters, data.now) : []),
    [data, filters],
  );
  const notices = useMemo(
    () => (data ? applyNoticeFilters(data.notices, filters) : []),
    [data, filters],
  );
  const offLayers = search.off ?? [];
  const layerOn = {
    events: !offLayers.includes("events"),
    notices: !offLayers.includes("notices"),
    help: !offLayers.includes("help"),
  } satisfies Record<MapLayer, boolean>;
  const shownEvents = layerOn.events ? events : [];
  const scopeTerritory: Territory | undefined = data?.territories.find((t) =>
    search.ter ? t.ubigeo.startsWith(search.ter) : false,
  );
  const boundsMode = !!search.bbox;

  const pickTerritory = (t: Territory) => {
    patch({ ter: t.ubigeo, bbox: undefined, sel: undefined });
    setFocus({ lng: t.centroid.lng, lat: t.centroid.lat, zoom: 10, key: Date.now() });
  };

  const toggleLayer = (l: MapLayer) => {
    const next = layerOn[l] ? [...offLayers, l] : offLayers.filter((x) => x !== l);
    patch({ off: next.length ? next : undefined });
  };

  const showMap = !tilesFailed;
  const mapNode = !showMap ? (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-medium">No pudimos cargar el mapa</p>
      <p className="text-muted-foreground max-w-xs text-sm">
        Los filtros y las fichas siguen disponibles en la lista.
      </p>
      <Button onClick={() => patch({ view: "list" })}>Ver lista</Button>
      <Button variant="ghost" size="sm" onClick={() => setTilesFailed(false)}>
        Reintentar
      </Button>
    </div>
  ) : mounted ? (
    <Suspense fallback={<MapSkeleton />}>
      <MapView
        events={shownEvents}
        notices={notices}
        collectionPoints={data?.collectionPoints ?? []}
        layerOn={layerOn}
        onToggleLayer={toggleLayer}
        selectedId={search.sel}
        onSelect={(id) => patch({ sel: id })}
        boundsMode={boundsMode}
        onSearchArea={(b: Bounds) => patch({ bbox: formatBbox(b), sel: undefined })}
        focus={focus}
        resetKey={resetKey}
        onReset={() => {
          setResetKey((k) => k + 1);
          patch({ ter: undefined, bbox: undefined });
        }}
        onTilesFailed={() => setTilesFailed(true)}
      />
    </Suspense>
  ) : (
    <MapSkeleton />
  );

  const panel = (
    <MapPanel
      now={now}
      filters={filters}
      territories={data?.territories ?? []}
      scopeTerritory={scopeTerritory}
      boundsMode={boundsMode}
      events={shownEvents}
      noticeCount={layerOn.notices ? notices.length : 0}
      helpCount={layerOn.help ? (data?.collectionPoints.length ?? 0) : 0}
      offLayers={MAP_LAYERS.filter((l) => !layerOn[l]).map((l) => LAYER_LABELS[l])}
      selectedId={search.sel}
      loading={isPending}
      onSelect={(id) => {
        patch({ sel: id });
        const e = events.find((x) => x.id === id);
        if (e?.place.point && view === "map") {
          /* camera follows through MapEffects */
        }
      }}
      onPatch={patch}
      onPickTerritory={pickTerritory}
      onClearScope={() => patch({ ter: undefined, bbox: undefined })}
      onBackToLocality={() => patch({ bbox: undefined })}
      onClearFilters={() =>
        patch({
          cat: undefined,
          org: undefined,
          rev: undefined,
          per: undefined,
          needs: undefined,
        })
      }
    />
  );

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-[32rem] flex-col md:flex-row">
      <h1 className="sr-only">Mapa del Perú</h1>

      {/* Mobile Mapa/Lista toggle */}
      <div className="bg-background flex border-b md:hidden" role="group" aria-label="Vista">
        {(["map", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => patch({ view: v === "map" ? undefined : v })}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2 text-sm",
              view === v ? "border-primary border-b-2 font-medium" : "text-muted-foreground",
            )}
          >
            {v === "map" ? (
              <MapIcon className="size-4" aria-hidden />
            ) : (
              <List className="size-4" aria-hidden />
            )}
            {v === "map" ? "Mapa" : "Lista"}
          </button>
        ))}
      </div>

      {/* Desktop: left panel. Mobile: bottom area, or full height in list view. */}
      <aside
        aria-label="Búsqueda, filtros y resultados"
        className={cn(
          "bg-background order-2 min-h-0 border-t md:order-1 md:block md:w-[360px] md:shrink-0 md:border-t-0 md:border-r",
          view === "list" ? "flex-1" : "h-[42%] md:h-auto",
        )}
      >
        {panel}
      </aside>

      <section
        aria-label="Mapa"
        className={cn(
          "relative order-1 min-h-0 flex-1 md:order-2 md:block",
          view === "list" && "hidden md:block",
        )}
      >
        {mapNode}
        <Link
          to="/reportar"
          className={cn(buttonVariants({ size: "sm" }), "absolute bottom-3 left-3 z-10 shadow-md")}
        >
          <Plus aria-hidden /> Reportar
        </Link>
      </section>
    </div>
  );
}
