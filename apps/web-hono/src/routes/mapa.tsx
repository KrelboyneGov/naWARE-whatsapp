import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPinOff, Plus } from "lucide-react";
import { Button, Skeleton, buttonVariants, cn } from "@emergency-map/web-ui";
import type { Bounds, Territory } from "@emergency-map/domain/schemas";
import { useMapData } from "@/components/map/use-map-data";
import { MapPanel } from "@/components/map/map-panel";
import { EventDetailContent, EventDetailPanel } from "@/components/map/event-detail-panel";
import { MobileSheet, type SheetSnap } from "@/components/map/mobile-sheet";
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

/**
 * MapLibre throws while mounting when the device has no WebGL2 (older phones, some in-app
 * browsers). Catch it so the page falls back to the list instead of the router error screen.
 */
class MapErrorBoundary extends Component<
  { onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

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
  const [snap, setSnap] = useState<SheetSnap>(view === "list" ? "full" : "peek");

  useEffect(() => setMounted(true), []);
  // Keep the mobile sheet in step with `?view=list`, which links and the fallback can set.
  useEffect(() => {
    if (view === "list") setSnap("full");
  }, [view]);

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
  const selectedEvent = shownEvents.find((e) => e.id === search.sel);

  const changeSnap = (next: SheetSnap) => {
    setSnap(next);
    const nextView = next === "full" ? "list" : undefined;
    if ((search.view ?? undefined) !== nextView) patch({ view: nextView });
  };

  // On mobile, opening a card from the map raises the sheet so it is readable.
  useEffect(() => {
    if (search.sel) setSnap((s) => (s === "peek" ? "half" : s));
  }, [search.sel]);

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
    <div className="bg-muted flex h-full items-center justify-center p-4">
      <div
        role="alert"
        className="bg-background grid max-w-[360px] justify-items-center gap-3 rounded-2xl border p-7 text-center"
      >
        <MapPinOff className="size-6" aria-hidden />
        <strong className="text-[17px]">No pudimos cargar el mapa</strong>
        <p className="text-muted-foreground text-sm">
          El proveedor de teselas no respondió o este dispositivo no puede dibujar el mapa. Los
          filtros y las fichas siguen operativos en la lista.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => patch({ view: "list" })}>Ver lista</Button>
          <Button
            variant="outline"
            onClick={() => {
              setTilesFailed(false);
              setResetKey((k) => k + 1);
            }}
          >
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  ) : mounted ? (
    <MapErrorBoundary key={resetKey} onError={() => setTilesFailed(true)}>
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
    </MapErrorBoundary>
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
          sit: undefined,
          per: undefined,
          needs: undefined,
        })
      }
    />
  );

  const summary = isPending ? (
    "Cargando..."
  ) : (
    <>
      <strong className="font-mono font-medium">{shownEvents.length}</strong>{" "}
      {shownEvents.length === 1 ? "evento" : "eventos"} ·{" "}
      {boundsMode ? "área visible" : scopeTerritory ? scopeTerritory.name : "todo el Perú"}
    </>
  );

  return (
    // Mobile: the header is hidden on this route and the page fills the space between the
    // prototype bar and the bottom nav. Desktop keeps the 64px header.
    <div className="relative flex h-[calc(100dvh-2rem-3.5rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-4rem)] md:min-h-[32rem] md:flex-row">
      <h1 className="sr-only">Mapa del Perú</h1>

      {/* Desktop: left panel. Mobile: bottom sheet over the lower part of the screen. */}
      <MobileSheet
        snap={snap}
        onSnap={changeSnap}
        summary={summary}
        className="order-2 md:order-1 md:w-[360px] md:shrink-0 md:border-r"
      >
        <aside aria-label="Búsqueda, filtros y resultados" className="flex min-h-0 flex-1 flex-col">
          {/* Below md the selected event replaces the list inside the sheet. */}
          <div className={cn("flex min-h-0 flex-1 flex-col", selectedEvent && "hidden md:flex")}>
            {panel}
          </div>
          {selectedEvent && (
            <div className="flex min-h-0 flex-1 flex-col md:hidden">
              <EventDetailContent
                event={selectedEvent}
                now={now}
                onClose={() => patch({ sel: undefined })}
              />
            </div>
          )}
        </aside>
      </MobileSheet>

      <section
        aria-label="Mapa"
        className="relative order-1 min-h-0 flex-1 overflow-hidden md:order-2"
      >
        {mapNode}
        <Link
          to="/reportar"
          className={cn(
            buttonVariants({ size: "sm" }),
            "absolute bottom-3 left-3 z-10 shadow-md max-md:h-11 max-md:rounded-full max-md:px-4",
          )}
        >
          <Plus aria-hidden /> Reportar
        </Link>
      </section>

      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          now={now}
          onClose={() => patch({ sel: undefined })}
        />
      )}
    </div>
  );
}
