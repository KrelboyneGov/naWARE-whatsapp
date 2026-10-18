import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, PlusCircle } from "lucide-react";
import { HAZARD_CATEGORY, HAZARD_TYPES, type HazardType } from "@emergency-map/domain/constants";
import { DEMO_EVENTS, DEMO_TERRITORIES } from "@emergency-map/domain/demo";
import { summarizeSignals } from "@emergency-map/domain/rules";
import type { PublicEvent, SignalSummary } from "@emergency-map/domain/schemas";
import { Button, Skeleton, buttonVariants, cn } from "@emergency-map/web-ui";
import { CATEGORY_ICONS, DemoBadge, EmptyState, ReviewBadge } from "@/components/event";
import { DEMO_EVIDENCE } from "@/components/event-detail/demo-detail";
import { QuickReportSheet } from "@/components/quick-report/quick-report-sheet";
import { CommunityBadge } from "@/components/signals/community-badge";
import { WeatherCard } from "@/components/weather/weather-card";
import { useCommunity } from "@/lib/community-source";
import { HAZARD_ICONS, HAZARD_LABELS } from "@/lib/hazard-labels";
import { CATEGORY_LABELS, formatRelative } from "@/lib/labels";

/** Lower comes first. "Possibly resolved" and closed events sink but stay listed. */
const STATE_RANK: Record<SignalSummary["state"], number> = {
  getting_worse: 0,
  confirmed_by_neighbours: 1,
  mixed: 2,
  no_recent_signals: 3,
  possibly_resolved: 4,
};

interface Row {
  event: PublicEvent;
  summary: SignalSummary;
  evidenceCount: number;
}

const CHORRILLOS = DEMO_TERRITORIES.find((t) => t.ubigeo === "150108");

/**
 * What is happening now: published events ordered by what neighbours say and how recent they
 * are. Closed or "possibly resolved" ones stay visible at the end with their state, never hidden
 * as if nothing had happened.
 */
export function UrgenciesPage() {
  const community = useCommunity();
  const [filter, setFilter] = useState<HazardType | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const rows = useMemo<Row[]>(() => {
    if (!community.data) return [];
    const { now, signals, quickReportEvents } = community.data;
    const events = [...quickReportEvents, ...DEMO_EVENTS].filter(
      (e) => e.publicationStatus === "published",
    );
    return events
      .map((event) => ({
        event,
        summary: summarizeSignals(
          signals.filter((s) => s.eventId === event.id),
          now,
        ),
        evidenceCount: DEMO_EVIDENCE.filter(
          (d) => d.eventId === event.id && d.visibility === "public",
        ).length,
      }))
      .filter(({ event }) =>
        filter
          ? (event.hazardType ?? null) === filter ||
            (!event.hazardType && event.category === HAZARD_CATEGORY[filter])
          : true,
      )
      .sort((a, b) => {
        const closedA = a.event.situationStatus === "closure_reported" ? 1 : 0;
        const closedB = b.event.situationStatus === "closure_reported" ? 1 : 0;
        if (closedA !== closedB) return closedA - closedB;
        const rank = STATE_RANK[a.summary.state] - STATE_RANK[b.summary.state];
        if (rank !== 0) return rank;
        return b.event.lastUpdatedAt.getTime() - a.event.lastUpdatedAt.getTime();
      });
  }, [community.data, filter]);

  const now = community.data?.now ?? new Date();

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-4 py-6 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Urgencias</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Lo que reportan las personas ahora, con lo que dicen sus vecinos. Primero lo que empeora
            o sigue activo.
          </p>
        </div>
        <Button size="lg" onClick={() => setReportOpen(true)}>
          <PlusCircle aria-hidden /> Reportar algo
        </Button>
      </header>

      <WeatherCard point={CHORRILLOS?.centroid ?? null} placeName="Chorrillos" />

      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        role="toolbar"
        aria-label="Filtrar por tipo"
      >
        <Chip active={filter === null} onClick={() => setFilter(null)}>
          Todo
        </Chip>
        {HAZARD_TYPES.filter((h) => h !== "other").map((h) => {
          const Icon = HAZARD_ICONS[h];
          return (
            <Chip key={h} active={filter === h} onClick={() => setFilter(filter === h ? null : h)}>
              <Icon className="size-3.5" aria-hidden /> {HAZARD_LABELS[h]}
            </Chip>
          );
        })}
      </div>

      {community.isPending ? (
        <div className="grid gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No hay reportes de este tipo"
          description="Que no haya reportes no significa que la zona esté segura."
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <UrgencyRow key={r.event.id} row={r} now={now} />
          ))}
        </ul>
      )}

      <QuickReportSheet open={reportOpen} onOpenChange={setReportOpen} />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-[var(--border-subtle)] bg-card hover:border-[var(--border-strong)]",
      )}
    >
      {children}
    </button>
  );
}

function UrgencyRow({ row, now }: { row: Row; now: Date }) {
  const { event: e, summary, evidenceCount } = row;
  const Icon = e.hazardType ? HAZARD_ICONS[e.hazardType] : CATEGORY_ICONS[e.category];
  const kind = e.hazardType ? HAZARD_LABELS[e.hazardType] : CATEGORY_LABELS[e.category];
  const closed = e.situationStatus === "closure_reported";
  return (
    <li
      className={cn(
        "grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-card p-4",
        (closed || summary.state === "possibly_resolved") && "opacity-75",
      )}
    >
      <Link
        to={`/eventos/${e.id}` as "/"}
        className="grid grid-cols-[40px_1fr] gap-3 hover:no-underline"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="grid min-w-0 gap-1">
          <span className="text-[13px] font-medium text-[var(--text-secondary)]">
            {kind} · {e.place.territory.name} · {formatRelative(e.occurredAt.start, now)}
          </span>
          <span className="font-medium leading-snug">{e.title}</span>
          {e.place.reference && (
            <span className="text-[13px] text-[var(--text-secondary)]">{e.place.reference}</span>
          )}
        </span>
      </Link>
      <div className="flex flex-wrap items-center gap-1.5">
        {closed ? (
          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[13px]">
            Se reportó el cierre
          </span>
        ) : (
          <CommunityBadge summary={summary} now={now} />
        )}
        <ReviewBadge status={e.reviewStatus} />
        {e.isDemo && <DemoBadge />}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-[var(--text-secondary)]">
          {evidenceCount === 0
            ? "Sin evidencias todavía"
            : `${evidenceCount} ${evidenceCount === 1 ? "evidencia" : "evidencias"}`}
        </span>
        <div className="flex gap-2">
          <Link
            to={`/eventos/${e.id}` as "/"}
            hash="aportar"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Camera className="size-4" aria-hidden /> Subir evidencia
          </Link>
          <Link to={`/eventos/${e.id}` as "/"} className={cn(buttonVariants({ size: "sm" }))}>
            ¿Sigue ahí?
          </Link>
        </div>
      </div>
    </li>
  );
}
