import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpDown, History, Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  buttonVariants,
  cn,
} from "@emergency-map/web-ui";
import {
  EVENT_CATEGORIES,
  ORIGINS,
  REVIEW_STATUSES,
  SITUATION_STATUSES,
} from "@emergency-map/domain/constants";
import type { PublicEvent } from "@emergency-map/domain/schemas";
import {
  CATEGORY_ICONS,
  DemoBadge,
  EmptyState,
  OriginBadge,
  ReviewBadge,
} from "@/components/event";
import { formatLocality, formatOccurred } from "@/components/event-detail/format";
import { SituationBadge } from "@/components/event-detail/situation-badge";
import {
  CATEGORY_LABELS,
  ORIGIN_LABELS,
  REVIEW_LABELS,
  SITUATION_LABELS,
  formatDateTime,
  formatRelative,
} from "@/lib/labels";
import { ACTIVITY_DOT_CLASS, ACTIVITY_LABELS, ACTOR_ROLE_LABELS } from "./activity-labels";
import {
  HISTORY_PERIODS,
  HISTORY_PERIOD_LABELS,
  activeFilterCount,
  filterActivity,
  filterEvents,
  type HistorySearch,
} from "./history-filters";
import { useHistoryData } from "./use-history-data";

type ListKey = "cat" | "org" | "rev" | "sit";

const FILTER_GROUPS: {
  key: ListKey;
  title: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "cat",
    title: "Fenómeno",
    options: EVENT_CATEGORIES.map((v) => ({ value: v, label: CATEGORY_LABELS[v] })),
  },
  {
    key: "org",
    title: "Origen",
    options: ORIGINS.map((v) => ({ value: v, label: ORIGIN_LABELS[v] })),
  },
  {
    key: "rev",
    title: "Revisión",
    options: REVIEW_STATUSES.map((v) => ({ value: v, label: REVIEW_LABELS[v] })),
  },
  {
    key: "sit",
    title: "Estado temporal",
    options: SITUATION_STATUSES.map((v) => ({ value: v, label: SITUATION_LABELS[v] })),
  },
];

function toggle<T extends string>(list: readonly T[] | undefined, v: T): T[] | undefined {
  const cur = list ?? [];
  const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
  return next.length ? next : undefined;
}

const th =
  "border-border-subtle border-b px-2.5 py-2 text-[11px] font-medium tracking-wider uppercase";

export function HistoryPage({
  search,
  onPatch,
}: {
  search: HistorySearch;
  onPatch: (p: Partial<HistorySearch>) => void;
}) {
  const { data, isPending, isError, refetch } = useHistoryData();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const tab = search.tab ?? "eventos";
  const period = search.per ?? "all";
  const dateMode = search.date ?? "occ";
  const sort = search.sort ?? "upd";

  const now = data?.now ?? new Date();
  const events = data ? filterEvents(data.events, search, data.now) : [];
  const activity = data ? filterActivity(data.activity, data.events, search, data.now) : [];
  const count = tab === "eventos" ? events.length : activity.length;
  const isHistoric = period === "all" || period === "30d";
  const filterCount = activeFilterCount(search);

  const chips = FILTER_GROUPS.flatMap((g) =>
    (search[g.key] ?? []).map((v) => ({
      key: `${g.key}:${v}`,
      label: g.options.find((o) => o.value === v)?.label ?? v,
      remove: () => onPatch({ [g.key]: toggle(search[g.key] as string[] | undefined, v) }),
    })),
  );

  const clearAll = () =>
    onPatch({
      q: undefined,
      per: undefined,
      date: undefined,
      cat: undefined,
      org: undefined,
      rev: undefined,
      sit: undefined,
    });

  const mapSearch = {
    cat: search.cat,
    per: period === "all" ? undefined : period,
  };

  return (
    <main className="mx-auto grid w-full max-w-[1240px] gap-5 px-4 pt-6 pb-16 md:px-10 md:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">
            Eventos y actualizaciones
          </h1>
          <p className="text-text-secondary max-w-2xl text-sm">
            Un evento con varias actualizaciones cuenta una sola vez en «Eventos». «Actividad» lista
            cada cambio.
          </p>
        </div>
        <Link
          to="/mapa"
          search={mapSearch}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-9 px-3 text-sm")}
        >
          <MapIcon aria-hidden /> Ver estos resultados en el mapa
        </Link>
      </div>

      <div role="tablist" aria-label="Vista" className="border-border-subtle flex gap-1 border-b">
        {(
          [
            ["eventos", "Eventos", data?.events.length ?? 0],
            ["actividad", "Actividad", data?.activity.length ?? 0],
          ] as const
        ).map(([value, label, total]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => onPatch({ tab: value === "eventos" ? undefined : value })}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium",
              tab === value
                ? "border-accent-primary text-text-primary"
                : "text-text-secondary hover:text-text-primary border-transparent",
            )}
          >
            {label}
            <span className="bg-surface-quiet rounded-full px-1.5 font-mono text-xs">{total}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[260px]">
          <Search
            className="text-text-secondary pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Buscar en título o localidad"
            value={search.q ?? ""}
            onChange={(e) => onPatch({ q: e.target.value || undefined })}
            placeholder="Buscar en título o localidad"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <div
          role="group"
          aria-label="Periodo"
          className="border-border-subtle bg-surface-quiet inline-flex rounded-lg border p-0.5"
        >
          {HISTORY_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => onPatch({ per: p === "all" ? undefined : p })}
              className={cn(
                "rounded-md px-2.5 py-1 text-[13px] font-medium",
                period === p ? "bg-card shadow-xs" : "text-text-secondary",
              )}
            >
              {HISTORY_PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <select
          aria-label="Fecha a la que aplica el periodo"
          value={dateMode}
          onChange={(e) => onPatch({ date: e.target.value === "occ" ? undefined : "upd" })}
          className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="occ">Por ocurrencia / publicación</option>
          <option value="upd">Por última actualización</option>
        </select>
        <Button
          variant="outline"
          size="lg"
          className="h-9 px-3 text-sm"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal aria-hidden /> Más filtros
          {filterCount > 0 && (
            <span className="bg-accent-primary rounded-full px-1.5 text-xs text-white">
              {filterCount}
            </span>
          )}
        </Button>
        {chips.map((c) => (
          <span
            key={c.key}
            className="bg-accent-primary-quiet text-accent-primary inline-flex items-center gap-1 rounded-md py-1 pr-1 pl-2.5 text-[13px]"
          >
            {c.label}
            <button
              type="button"
              onClick={c.remove}
              aria-label={`Quitar filtro ${c.label}`}
              className="hover:bg-accent-primary/10 rounded p-0.5"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
        {isHistoric && (
          <span className="bg-status-warning-quiet text-warning inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px] font-medium">
            <History className="size-3.5" aria-hidden />
            Rango histórico: no son eventos recientes
          </span>
        )}
        <span className="text-text-secondary text-[13px] sm:ml-auto">
          <span className="text-text-primary font-mono">{count}</span>{" "}
          {tab === "eventos"
            ? count === 1
              ? "evento"
              : "eventos"
            : count === 1
              ? "cambio"
              : "cambios"}
          {tab === "eventos" &&
            ` · orden: ${sort === "upd" ? "última actualización" : "fecha del evento"}`}
        </span>
      </div>

      {isPending && (
        <div className="grid gap-2" aria-busy="true" aria-label="Cargando eventos">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          title="No pudimos cargar los eventos"
          description="Falló la consulta. Eso no significa que no haya eventos. Inténtalo de nuevo."
          action={
            <Button size="lg" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      )}

      {data && tab === "eventos" && events.length > 0 && (
        <EventsTable
          events={events}
          now={now}
          sort={sort}
          onSort={(s) => onPatch({ sort: s === "upd" ? undefined : s })}
        />
      )}

      {data && tab === "actividad" && activity.length > 0 && (
        <>
          <ol className="grid max-w-[860px]">
            {activity.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[12px_1fr] gap-x-3 text-sm sm:grid-cols-[150px_12px_1fr]"
              >
                <time
                  dateTime={a.at.toISOString()}
                  className="text-text-secondary col-span-2 text-[13px] sm:col-span-1 sm:pt-0.5 sm:text-right"
                >
                  {formatDateTime(a.at)}
                </time>
                <span
                  className="grid justify-items-center max-sm:col-start-1 max-sm:row-start-2"
                  aria-hidden
                >
                  <span
                    className={cn("mt-[7px] size-2 rounded-full", ACTIVITY_DOT_CLASS[a.type])}
                  />
                  <span className="bg-border-subtle w-px flex-1" />
                </span>
                <span className="grid gap-0.5 pb-[18px] max-sm:row-start-2">
                  <span>
                    <strong className="font-medium">{ACTIVITY_LABELS[a.type]}</strong> ·{" "}
                    {ACTOR_ROLE_LABELS[a.actorRole]}
                    {a.isDemo && <DemoBadge className="ml-2" />}
                  </span>
                  <span className="text-text-secondary">{a.summary}</span>
                  <Link
                    to="/eventos/$id"
                    params={{ id: a.eventId }}
                    className="text-accent-primary text-[13px] hover:underline"
                  >
                    {a.eventId} · {a.eventTitle}
                  </Link>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-text-tertiary text-xs">
            La vista pública omite notas privadas, datos personales y razones internas sensibles.
          </p>
        </>
      )}

      {data && count === 0 && (
        <EmptyState
          title="No encontramos publicaciones con estos filtros"
          description="La cobertura es parcial: una fuente puede no haber respondido. Amplía el periodo o restablece los filtros. Esto no significa que no haya peligro."
          action={
            <Button variant="outline" size="lg" onClick={clearAll}>
              Restablecer filtros
            </Button>
          }
        />
      )}

      {data && (
        <div className="text-text-secondary flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span>
            Mostrando todos los registros de demostración. «Cargar más» conserva la posición al
            volver de una ficha.
          </span>
          <Button variant="outline" size="sm" disabled>
            Cargar más
          </Button>
        </div>
      )}

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent
          className={cn(
            "top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 content-start overflow-y-auto sm:max-w-[360px]",
            "gap-0 p-0",
          )}
        >
          <DialogHeader className="border-border-subtle border-b p-5 pr-12">
            <DialogTitle className="text-xl font-semibold">Filtros</DialogTitle>
            <DialogDescription className="sr-only">
              Filtra por fenómeno, origen, revisión y estado temporal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid content-start gap-5 p-5">
            {FILTER_GROUPS.map((g) => (
              <fieldset key={g.key} className="grid gap-2">
                <legend className="mb-1 text-[13px] font-medium">{g.title}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {g.options.map((o) => {
                    const on = (search[g.key] as string[] | undefined)?.includes(o.value) ?? false;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          onPatch({
                            [g.key]: toggle(search[g.key] as string[] | undefined, o.value),
                          })
                        }
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-[13px]",
                          on
                            ? "border-accent-primary bg-accent-primary-quiet text-accent-primary"
                            : "border-border-subtle hover:bg-surface-hover",
                        )}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <DialogFooter className="border-border-subtle mt-auto justify-between border-t p-5 sm:justify-between">
            <Button variant="ghost" size="lg" onClick={clearAll}>
              Restablecer
            </Button>
            <Button size="lg" onClick={() => setFiltersOpen(false)}>
              Ver resultados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function EventsTable({
  events,
  now,
  sort,
  onSort,
}: {
  events: PublicEvent[];
  now: Date;
  sort: "occ" | "upd";
  onSort: (s: "occ" | "upd") => void;
}) {
  return (
    <>
      <table className="hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr className="text-text-secondary text-left">
            <th className={th}>Tipo / título</th>
            <th className={th}>Localidad</th>
            <th className={th}>Origen</th>
            <th className={th}>Revisión</th>
            <th className={th}>Situación</th>
            <th className={th} aria-sort={sort === "occ" ? "descending" : "none"}>
              <button
                type="button"
                onClick={() => onSort("occ")}
                className="inline-flex items-center gap-1 uppercase"
              >
                Fecha del evento <ArrowUpDown className="size-3" aria-hidden />
              </button>
            </th>
            <th className={th} aria-sort={sort === "upd" ? "descending" : "none"}>
              <button
                type="button"
                onClick={() => onSort("upd")}
                className="inline-flex items-center gap-1 uppercase"
              >
                Última actualización <ArrowUpDown className="size-3" aria-hidden />
              </button>
            </th>
            <th className={th}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const Icon = CATEGORY_ICONS[e.category];
            return (
              <tr key={e.id} className="border-border-subtle hover:bg-surface-hover border-b">
                <td className="min-w-[280px] px-2.5 py-3">
                  <span className="flex items-center gap-2.5">
                    <span className="bg-surface-secondary inline-flex size-[30px] flex-none items-center justify-center rounded-lg">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="grid gap-0.5">
                      <span className="leading-snug font-medium">{e.title}</span>
                      <span className="text-text-secondary text-xs">
                        {CATEGORY_LABELS[e.category]} · {e.id}
                        {e.isDemo && <DemoBadge className="ml-2 px-1.5 py-0 text-[11px]" />}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="text-text-secondary px-2.5 py-3">{formatLocality(e.place)}</td>
                <td className="px-2.5 py-3">
                  <OriginBadge origin={e.origin} />
                </td>
                <td className="px-2.5 py-3">
                  <ReviewBadge status={e.reviewStatus} />
                </td>
                <td className="px-2.5 py-3">
                  <SituationBadge status={e.situationStatus} />
                </td>
                <td className="text-text-secondary px-2.5 py-3">{formatOccurred(e.occurredAt)}</td>
                <td
                  className="text-text-secondary px-2.5 py-3 whitespace-nowrap"
                  title={formatDateTime(e.lastUpdatedAt)}
                >
                  {formatRelative(e.lastUpdatedAt, now)}
                </td>
                <td className="px-2.5 py-3">
                  <Link
                    to="/eventos/$id"
                    params={{ id: e.id }}
                    className="text-accent-primary text-[13px] font-medium whitespace-nowrap hover:underline"
                  >
                    Ver detalle
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="grid gap-3 md:hidden">
        {events.map((e) => {
          const Icon = CATEGORY_ICONS[e.category];
          return (
            <li
              key={e.id}
              className="border-border-subtle shadow-xs grid gap-2 rounded-xl border p-3.5"
            >
              <div className="text-accent-primary flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4" aria-hidden />
                {CATEGORY_LABELS[e.category]}
                <span className="text-text-secondary font-mono text-xs font-normal">{e.id}</span>
              </div>
              <Link
                to="/eventos/$id"
                params={{ id: e.id }}
                className="text-base leading-snug font-semibold hover:underline"
              >
                {e.title}
              </Link>
              <p className="text-text-secondary text-sm">
                {formatLocality(e.place)} · {formatOccurred(e.occurredAt)}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <OriginBadge origin={e.origin} />
                <ReviewBadge status={e.reviewStatus} />
                <SituationBadge status={e.situationStatus} />
                {e.isDemo && <DemoBadge />}
              </div>
              <p className="text-text-secondary text-[13px]">
                Actualizado {formatRelative(e.lastUpdatedAt, now)}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
