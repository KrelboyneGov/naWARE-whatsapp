import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { Button, Input, Skeleton } from "@emergency-map/web-ui";
import {
  PUBLICATION_STATUSES,
  QUEUE_REASONS,
  type PublicationStatus,
  type QueueReason,
} from "@emergency-map/domain/constants";

import { NoAccess } from "./review-gate";
import { QUEUE_REASON_LABELS, QUEUE_REASON_PRIORITY, QUEUE_REASON_TONE } from "./review-labels";
import {
  isAccessError,
  queueQueryOptions,
  type QueueFilters,
  type QueueItem,
} from "./use-review-data";
import { DemoBadge, EmptyState, OriginBadge } from "@/components/event";
import { CATEGORY_LABELS, PUBLICATION_LABELS, formatDateTime, formatRelative } from "@/lib/labels";
import { cn } from "@/lib/utils";

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary";

type Order = "arrival" | "priority";

interface LocalFilters {
  q: string;
  region: string;
  withEvidence: boolean;
  order: Order;
}

const EMPTY_SERVER: QueueFilters = { publicationStatuses: [], reasons: [], assignedToMe: false };
const EMPTY_LOCAL: LocalFilters = { q: "", region: "", withEvidence: false, order: "arrival" };

export function ReviewQueuePage() {
  const [server, setServer] = useState<QueueFilters>(EMPTY_SERVER);
  const [local, setLocal] = useState<LocalFilters>(EMPTY_LOCAL);
  const [showFilters, setShowFilters] = useState(false);

  // Unfiltered query feeds the KPI counters so they do not shrink with the filters.
  const all = useQuery(queueQueryOptions(EMPTY_SERVER));
  const filtered = useQuery(queueQueryOptions(server));

  const now = new Date();
  const items = filtered.data?.items ?? [];
  const regions = [
    ...new Set((all.data?.items ?? []).map((i) => i.event.place.territory.departmentName)),
  ].sort();

  const rows = useRows(items, local);
  if (all.error && isAccessError(all.error)) return <NoAccess signedIn />;
  const allItems = all.data?.items ?? [];
  const kpis: Array<{ label: string; n: number; active: boolean; pick: () => void }> = [
    {
      label: "Pendientes de controles",
      n: allItems.filter((i) => i.event.publicationStatus === "pending_review").length,
      active: server.publicationStatuses.includes("pending_review"),
      pick: () => setServer({ ...EMPTY_SERVER, publicationStatuses: ["pending_review"] }),
    },
    {
      label: "Con evidencia nueva",
      n: allItems.filter((i) => i.reason === "new_evidence").length,
      active: server.reasons.includes("new_evidence"),
      pick: () => setServer({ ...EMPTY_SERVER, reasons: ["new_evidence"] }),
    },
    {
      label: "Posibles duplicados",
      n: allItems.filter((i) => i.reason === "possible_duplicate").length,
      active: server.reasons.includes("possible_duplicate"),
      pick: () => setServer({ ...EMPTY_SERVER, reasons: ["possible_duplicate"] }),
    },
    {
      label: "Casos en disputa",
      n: allItems.filter((i) => i.reason === "disputed").length,
      active: server.reasons.includes("disputed"),
      pick: () => setServer({ ...EMPTY_SERVER, reasons: ["disputed"] }),
    },
  ];

  const chips: Array<{ label: string; remove: () => void }> = [
    ...server.publicationStatuses.map((s) => ({
      label: `Publicación: ${PUBLICATION_LABELS[s]}`,
      remove: () =>
        setServer({
          ...server,
          publicationStatuses: server.publicationStatuses.filter((x) => x !== s),
        }),
    })),
    ...server.reasons.map((r) => ({
      label: QUEUE_REASON_LABELS[r],
      remove: () => setServer({ ...server, reasons: server.reasons.filter((x) => x !== r) }),
    })),
    ...(local.region
      ? [{ label: local.region, remove: () => setLocal({ ...local, region: "" }) }]
      : []),
    ...(local.withEvidence
      ? [{ label: "Con evidencia", remove: () => setLocal({ ...local, withEvidence: false }) }]
      : []),
    ...(server.assignedToMe
      ? [{ label: "Asignados a mí", remove: () => setServer({ ...server, assignedToMe: false }) }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Panel interno
          </p>
          <h1 className="font-heading text-[26px] font-semibold leading-tight">
            Revisión de reportes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El tiempo en cola no es un compromiso de atención.
          </p>
        </div>
        <div
          role="group"
          aria-label="Orden"
          className="inline-flex rounded-lg border border-border p-0.5"
        >
          {(
            [
              ["arrival", "Por llegada"],
              ["priority", "Prioridad editorial"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={local.order === value}
              onClick={() => setLocal({ ...local, order: value })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                local.order === value ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {all.data?.source === "demo" && (
        <p role="status" className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
          No se pudo consultar la cola real. Se muestran datos de demostración.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={k.pick}
            aria-pressed={k.active}
            className={cn(
              "grid gap-1 rounded-xl border bg-card p-4 text-left hover:border-border-strong",
              k.active ? "border-primary" : "border-border",
            )}
          >
            <span className="text-xs text-muted-foreground">{k.label}</span>
            <span className="font-mono text-2xl font-medium tabular-nums">{k.n}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-72">
          <Input
            value={local.q}
            onChange={(e) => setLocal({ ...local, q: e.target.value })}
            placeholder="Buscar por ID, resumen o localidad"
            aria-label="Buscar casos"
            className="h-9"
          />
        </div>
        <Button variant="outline" size="lg" onClick={() => setShowFilters(true)}>
          <SlidersHorizontal aria-hidden /> Filtros
        </Button>
        {chips.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
          >
            {c.label}
            <button type="button" onClick={c.remove} aria-label={`Quitar ${c.label}`}>
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{rows.length}</span> casos
        </span>
      </div>

      {filtered.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Sin casos con estos filtros"
          description="Quita filtros o cambia el orden para ver el resto de la cola. Una cola vacía no significa que no haya reportes por atender fuera de ella."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                {[
                  "ID",
                  "Resumen",
                  "Localidad",
                  "Llegada",
                  "Origen",
                  "Aportes",
                  "Motivo en cola",
                  "Asignado",
                  "",
                ].map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className={cn(
                      "border-b border-border px-3 py-2 font-medium",
                      h === "Aportes" && "text-right",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <QueueRow key={r.event.id} item={r} now={now} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-tertiary">
        No existe aprobación masiva: cada decisión de publicación, corroboración, relación o cierre
        se toma por caso, con motivo. Cinco aportes priorizan la revisión; no aprueban nada.
      </p>

      {showFilters && (
        <FilterDrawer
          server={server}
          local={local}
          regions={regions}
          onServer={setServer}
          onLocal={setLocal}
          onClose={() => setShowFilters(false)}
          onReset={() => {
            setServer(EMPTY_SERVER);
            setLocal(EMPTY_LOCAL);
          }}
        />
      )}
    </div>
  );
}

function useRows(items: QueueItem[], f: LocalFilters): QueueItem[] {
  return useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const list = items.filter((i) => {
      if (q) {
        const hay = `${i.event.id} ${i.event.title} ${i.event.place.territory.name} ${i.event.place.territory.departmentName}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      if (f.region && i.event.place.territory.departmentName !== f.region) return false;
      if (f.withEvidence && i.pendingEvidenceCount === 0) return false;
      return true;
    });
    return list.sort((a, b) =>
      f.order === "arrival"
        ? new Date(a.enteredQueueAt).getTime() - new Date(b.enteredQueueAt).getTime()
        : QUEUE_REASON_PRIORITY[a.reason] - QUEUE_REASON_PRIORITY[b.reason],
    );
  }, [items, f]);
}

function QueueRow({ item, now }: { item: QueueItem; now: Date }) {
  const { event } = item;
  const t = event.place.territory;
  const locality = t.name === t.departmentName ? t.name : `${t.name}, ${t.departmentName}`;
  const tone = QUEUE_REASON_TONE[item.reason];
  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-hover">
      <td className="whitespace-nowrap px-3 py-3 font-mono text-[13px]">{event.id}</td>
      <td className="min-w-64 px-3 py-3">
        <span className="grid gap-0.5">
          <span className="flex flex-wrap items-center gap-2 font-medium">
            {event.title}
            {event.isDemo && <DemoBadge />}
          </span>
          <span className="text-xs text-muted-foreground">
            {CATEGORY_LABELS[event.category]} · {PUBLICATION_LABELS[event.publicationStatus]} ·
            versión {item.pendingVersionSeq}
          </span>
        </span>
      </td>
      <td className="px-3 py-3 text-muted-foreground">{locality}</td>
      <td
        className="whitespace-nowrap px-3 py-3 text-muted-foreground"
        title={formatDateTime(item.enteredQueueAt)}
      >
        {formatRelative(item.enteredQueueAt, now)}
      </td>
      <td className="px-3 py-3">
        <OriginBadge origin={event.origin} />
      </td>
      <td className="px-3 py-3 text-right font-mono">{event.contributionCount}</td>
      <td className="px-3 py-3">
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-[13px] font-medium",
            tone === "warning" ? "bg-warning-bg text-warning" : "bg-muted text-muted-foreground",
          )}
        >
          {QUEUE_REASON_LABELS[item.reason]}
        </span>
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        {item.assignedTo ? "Asignado" : "Sin asignar"}
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <Link
          to="/revision/$id"
          params={{ id: event.id }}
          className="inline-flex h-7 items-center rounded-md border border-border-strong px-2.5 text-[13px] font-medium"
        >
          Abrir
        </Link>
      </td>
    </tr>
  );
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function FilterDrawer(props: {
  server: QueueFilters;
  local: LocalFilters;
  regions: string[];
  onServer: (f: QueueFilters) => void;
  onLocal: (f: LocalFilters) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const { server, local, regions } = props;
  return (
    <>
      <div className="fixed inset-0 z-30 bg-surface-scrim" onClick={props.onClose} aria-hidden />
      <aside
        role="dialog"
        aria-label="Filtros de la cola"
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col bg-card shadow-overlay"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-heading text-xl font-semibold">Filtros</h2>
          <Button variant="ghost" size="icon" onClick={props.onClose} aria-label="Cerrar">
            <X />
          </Button>
        </div>
        <div className="grid gap-5 overflow-auto p-6">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Estado de publicación</legend>
            {PUBLICATION_STATUSES.map((s: PublicationStatus) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={server.publicationStatuses.includes(s)}
                  onChange={() =>
                    props.onServer({
                      ...server,
                      publicationStatuses: toggle(server.publicationStatuses, s),
                    })
                  }
                />
                {PUBLICATION_LABELS[s]}
              </label>
            ))}
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Motivo en cola</legend>
            {QUEUE_REASONS.map((r: QueueReason) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={server.reasons.includes(r)}
                  onChange={() => props.onServer({ ...server, reasons: toggle(server.reasons, r) })}
                />
                {QUEUE_REASON_LABELS[r]}
              </label>
            ))}
          </fieldset>
          <label className="grid gap-1 text-sm font-medium">
            Región
            <select
              className={selectClass}
              value={local.region}
              onChange={(e) => props.onLocal({ ...local, region: e.target.value })}
            >
              <option value="">Todas</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={local.withEvidence}
              onChange={(e) => props.onLocal({ ...local, withEvidence: e.target.checked })}
            />
            Solo con evidencia adjunta
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={server.assignedToMe}
              onChange={(e) => props.onServer({ ...server, assignedToMe: e.target.checked })}
            />
            Solo asignados a mí
          </label>
        </div>
        <div className="mt-auto flex justify-between border-t border-border px-6 py-4">
          <Button variant="ghost" size="lg" onClick={props.onReset}>
            Restablecer
          </Button>
          <Button size="lg" onClick={props.onClose}>
            Ver resultados
          </Button>
        </div>
      </aside>
    </>
  );
}
