import type { PublicEvent } from "@emergency-map/domain/schemas";

import { CATEGORY_ICONS } from "./category-icon";
import { DemoBadge } from "./demo-badge";
import { FreshnessLabel } from "./freshness-label";
import { OriginBadge } from "./origin-badge";
import { ReviewBadge } from "./review-badge";
import { CATEGORY_LABELS, formatDateTime, formatRelative } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface EventCardProps {
  event: PublicEvent;
  /** Reference "now" for relative times; pass DEMO_NOW with demo data. */
  now: Date;
  selected?: boolean;
  /** When set, the card becomes a button that selects the event (e.g. highlights its marker). */
  onSelect?: (id: string) => void;
  className?: string;
}

/** Event summary: category, title, locality, time, origin, review, freshness, demo marker. */
export function EventCard({ event, now, selected = false, onSelect, className }: EventCardProps) {
  const Icon = CATEGORY_ICONS[event.category];
  const locality = [event.place.territory.name, event.place.territory.departmentName]
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");

  const body = (
    <>
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Icon className="size-4" aria-hidden />
        {CATEGORY_LABELS[event.category]}
      </div>
      <h3 className="mt-1 font-heading text-lg font-semibold leading-snug">{event.title}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{locality}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Actualizado {formatRelative(event.lastUpdatedAt, now)}
        {" · "}
        <time dateTime={event.lastUpdatedAt.toISOString()}>
          {formatDateTime(event.lastUpdatedAt)}
        </time>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <OriginBadge origin={event.origin} />
        <ReviewBadge status={event.reviewStatus} />
        {event.isDemo && <DemoBadge />}
      </div>
      <FreshnessLabel status={event.situationStatus} className="mt-2" />
    </>
  );

  const base = cn(
    "block w-full rounded-xl border bg-card p-4 text-left transition-colors",
    selected ? "border-primary ring-2 ring-primary/30 bg-brand-soft" : "border-border",
    className,
  );

  if (!onSelect) return <article className={base}>{body}</article>;
  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      aria-pressed={selected}
      className={cn(
        base,
        "cursor-pointer hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-primary",
      )}
    >
      {body}
    </button>
  );
}
