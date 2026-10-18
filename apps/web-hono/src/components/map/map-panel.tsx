import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge, Button, Input, cn } from "@emergency-map/web-ui";
import {
  EVENT_CATEGORIES,
  ORIGINS,
  REVIEW_STATUSES,
  SITUATION_STATUSES,
  type EventCategory,
  type Origin,
  type ReviewStatus,
  type SituationStatus,
} from "@emergency-map/domain/constants";
import type { PublicEvent, Territory } from "@emergency-map/domain/schemas";
import {
  CATEGORY_LABELS,
  NO_RESULTS_COPY,
  ORIGIN_LABELS,
  PRECISION_LABELS,
  REVIEW_LABELS,
  SITUATION_LABELS,
  formatDateTime,
  formatRelative,
} from "@/lib/labels";
import {
  PERIODS,
  PERIOD_LABELS,
  hasActiveFilters,
  searchTerritories,
  territoryLabel,
  type MapEventFilters,
  type MapSearch,
  type Period,
} from "@/lib/map-filters";
import { CATEGORY_ICONS } from "./category-icons";
import { MapOriginBadge, MapReviewBadge } from "./badges";
import { DemoBadge } from "../event/demo-badge";

export interface MapPanelProps {
  now: Date;
  filters: MapEventFilters;
  territories: Territory[];
  scopeTerritory: Territory | undefined;
  boundsMode: boolean;
  events: PublicEvent[];
  noticeCount: number;
  helpCount: number;
  offLayers: string[];
  selectedId: string | undefined;
  loading: boolean;
  onSelect: (id: string | undefined) => void;
  onPatch: (patch: Partial<MapSearch>) => void;
  onPickTerritory: (t: Territory) => void;
  onClearScope: () => void;
  onBackToLocality: () => void;
  onClearFilters: () => void;
}

function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];
  return next.length ? next : undefined;
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-muted-foreground mb-1 text-xs font-medium">{title}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

export function MapPanel(props: MapPanelProps) {
  const {
    now,
    filters,
    territories,
    scopeTerritory,
    boundsMode,
    events,
    selectedId,
    onSelect,
    onPatch,
  } = props;
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const suggestions = useMemo(() => searchTerritories(territories, query), [territories, query]);

  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`ev-${selectedId}`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const chips: { key: string; label: string; remove: () => void }[] = [];
  filters.categories?.forEach((c) =>
    chips.push({
      key: `c-${c}`,
      label: CATEGORY_LABELS[c],
      remove: () => onPatch({ cat: toggle(filters.categories, c) }),
    }),
  );
  filters.origins?.forEach((o) =>
    chips.push({
      key: `o-${o}`,
      label: ORIGIN_LABELS[o],
      remove: () => onPatch({ org: toggle(filters.origins, o) }),
    }),
  );
  filters.reviewStatuses?.forEach((r) =>
    chips.push({
      key: `r-${r}`,
      label: REVIEW_LABELS[r],
      remove: () => onPatch({ rev: toggle(filters.reviewStatuses, r) }),
    }),
  );
  filters.situations?.forEach((st) =>
    chips.push({
      key: `s-${st}`,
      label: SITUATION_LABELS[st],
      remove: () => onPatch({ sit: toggle(filters.situations, st) }),
    }),
  );
  if (filters.period)
    chips.push({
      key: "per",
      label: PERIOD_LABELS[filters.period],
      remove: () => onPatch({ per: undefined }),
    });
  if (filters.withNeeds)
    chips.push({
      key: "needs",
      label: "Con necesidades de ayuda",
      remove: () => onPatch({ needs: undefined }),
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b p-3">
        <div className="relative">
          <label htmlFor="map-search" className="sr-only">
            Buscar distrito, provincia o departamento
          </label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4"
            aria-hidden
          />
          <Input
            id="map-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar distrito, provincia o departamento"
            className="pl-8"
            autoComplete="off"
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
                      props.onPickTerritory(t);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground text-xs">
                      Distrito de {t.name}, provincia de {t.provinceName}, departamento de{" "}
                      {t.departmentName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs" aria-live="polite">
          <span className="text-muted-foreground">Ámbito: </span>
          {boundsMode ? (
            <>
              <strong>área visible del mapa</strong>.{" "}
              {scopeTerritory && (
                <button
                  type="button"
                  className="text-primary underline underline-offset-2"
                  onClick={props.onBackToLocality}
                >
                  Volver a mi localidad ({scopeTerritory.name})
                </button>
              )}{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={props.onClearScope}
              >
                Quitar
              </button>
            </>
          ) : scopeTerritory ? (
            <>
              <strong>{territoryLabel(scopeTerritory)}</strong>{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={props.onClearScope}
              >
                Quitar
              </button>
            </>
          ) : (
            <strong>todo el Perú</strong>
          )}
        </p>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            <SlidersHorizontal aria-hidden /> Filtros
            {chips.length > 0 && <Badge variant="secondary">{chips.length}</Badge>}
          </Button>
          {hasActiveFilters(filters) && (
            <Button variant="ghost" size="sm" onClick={props.onClearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {filtersOpen && (
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-md border p-2.5">
            <FilterGroup title="Fenómeno">
              {EVENT_CATEGORIES.map((c: EventCategory) => (
                <Chip
                  key={c}
                  pressed={!!filters.categories?.includes(c)}
                  onClick={() => onPatch({ cat: toggle(filters.categories, c) })}
                >
                  {CATEGORY_LABELS[c]}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup title="Origen">
              {ORIGINS.map((o: Origin) => (
                <Chip
                  key={o}
                  pressed={!!filters.origins?.includes(o)}
                  onClick={() => onPatch({ org: toggle(filters.origins, o) })}
                >
                  {ORIGIN_LABELS[o]}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup title="Revisión">
              {REVIEW_STATUSES.map((r: ReviewStatus) => (
                <Chip
                  key={r}
                  pressed={!!filters.reviewStatuses?.includes(r)}
                  onClick={() => onPatch({ rev: toggle(filters.reviewStatuses, r) })}
                >
                  {REVIEW_LABELS[r]}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup title="Estado temporal">
              {SITUATION_STATUSES.map((st: SituationStatus) => (
                <Chip
                  key={st}
                  pressed={!!filters.situations?.includes(st)}
                  onClick={() => onPatch({ sit: toggle(filters.situations, st) })}
                >
                  {SITUATION_LABELS[st]}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup title="Periodo (fecha del evento)">
              {PERIODS.map((p: Period) => (
                <Chip
                  key={p}
                  pressed={filters.period === p}
                  onClick={() => onPatch({ per: filters.period === p ? undefined : p })}
                >
                  {PERIOD_LABELS[p]}
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup title="Necesidades">
              <Chip
                pressed={!!filters.withNeeds}
                onClick={() => onPatch({ needs: filters.withNeeds ? undefined : true })}
              >
                Con necesidades de ayuda
              </Chip>
            </FilterGroup>
          </div>
        )}

        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Filtros aplicados">
            {chips.map((c) => (
              <li key={c.key}>
                <Badge variant="secondary" className="h-6 gap-1 pr-1">
                  {c.label}
                  <button
                    type="button"
                    aria-label={`Quitar filtro ${c.label}`}
                    onClick={c.remove}
                    className="hover:bg-background/60 rounded-full p-0.5"
                  >
                    <X aria-hidden />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-2 text-sm font-medium" aria-live="polite">
          {props.loading
            ? "Cargando..."
            : `${events.length} ${events.length === 1 ? "evento" : "eventos"} ciudadanos${
                filters.period ? ` · ${PERIOD_LABELS[filters.period].toLowerCase()}` : ""
              }`}
        </p>
        <p className="text-muted-foreground mb-3 text-xs">
          {props.noticeCount} {props.noticeCount === 1 ? "aviso oficial" : "avisos oficiales"} en el
          mapa. {props.helpCount} {props.helpCount === 1 ? "punto" : "puntos"} de acopio (no cuentan
          como emergencias).
          {props.offLayers.length > 0 && ` Capas apagadas: ${props.offLayers.join(", ")}.`}
        </p>

        {!props.loading && events.length === 0 && (
          <div className="rounded-md border border-dashed p-3 text-sm">
            <p>{NO_RESULTS_COPY}</p>
            {hasActiveFilters(filters) && (
              <Button variant="outline" size="sm" className="mt-2" onClick={props.onClearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {events.map((e) => {
            const Icon = CATEGORY_ICONS[e.category];
            const selected = e.id === selectedId;
            const districtOnly = e.place.precision === "district";
            return (
              <li key={e.id} id={`ev-${e.id}`}>
                <div
                  className={cn(
                    "rounded-md border transition-colors",
                    selected ? "border-primary bg-muted ring-1 ring-primary" : "bg-card",
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(selected ? undefined : e.id)}
                    className="flex w-full items-start gap-2.5 p-2.5 text-left"
                  >
                    <span className="bg-primary/10 text-primary mt-0.5 rounded-full p-1.5">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-sm leading-snug font-medium">{e.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {CATEGORY_LABELS[e.category]} · {e.place.territory.name},{" "}
                        {e.place.territory.departmentName}
                      </span>
                      <span className="flex flex-wrap items-center gap-1">
                        <MapOriginBadge origin={e.origin} />
                        <MapReviewBadge status={e.reviewStatus} />
                        {e.isDemo && <DemoBadge />}
                        {districtOnly && (
                          <Badge variant="outline">
                            <MapPin aria-hidden /> Solo distrito
                          </Badge>
                        )}
                        {e.place.precision === "approximate" && (
                          <Badge variant="outline">Ubicación aproximada</Badge>
                        )}
                      </span>
                      <time
                        dateTime={new Date(e.occurredAt.start).toISOString()}
                        title={formatDateTime(e.occurredAt.start)}
                        className="text-muted-foreground text-xs"
                      >
                        Ocurrió {formatRelative(e.occurredAt.start, now)}
                      </time>
                    </span>
                  </button>
                  {selected && (
                    <div className="flex flex-col gap-1 border-t px-2.5 py-2 text-xs lg:hidden">
                      <p className="text-muted-foreground">
                        {districtOnly
                          ? "Solo se conoce el distrito: no hay punto en el mapa."
                          : PRECISION_LABELS[e.place.precision]}
                        . Demostración: datos ficticios.
                      </p>
                      <a
                        href={`/eventos/${e.id}`}
                        className="text-primary font-medium underline-offset-4 hover:underline"
                      >
                        Ver detalle
                      </a>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          Consultado con el reloj de demostración. Los puntos de ayuda no se incluyen en el conteo
          de eventos. «No encontramos reportes» no significa «no hay peligro».
        </p>
      </div>
    </div>
  );
}
