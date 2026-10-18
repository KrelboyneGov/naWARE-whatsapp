import type { PublicEvent } from "@emergency-map/domain/schemas";
import { Link } from "@tanstack/react-router";

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
  /** When set, the card body becomes a button that selects the event (e.g. highlights its marker). */
  onSelect?: (id: string) => void;
  /**
   * Shows a "Ver detalle" link to /eventos/$id. Defaults to true when `onSelect` is set (the body
   * is then a button and cannot be a link); a card without `onSelect` stays a plain article.
   */
  showDetailLink?: boolean;
  /** Optional line above the title, e.g. the kind of update ("Nuevo reporte"). */
  eyebrow?: string;
  className?: string;
}

/** Event summary: category, title, locality, time, origin, review, freshness, demo marker. */
export function EventCard({
  event,
  now,
  selected = false,
  onSelect,
  showDetailLink,
  eyebrow,
  className,
}: EventCardProps) {
  const Icon = CATEGORY_ICONS[event.category];
  const locality = [event.place.territory.name, event.place.territory.departmentName]
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");
  const withLink = showDetailLink ?? Boolean(onSelect);

  const body = (
    <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
      <span className="flex size-9 items-center justify-center rounded-[10px] bg-secondary text-foreground">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-0.5 text-xs font-medium text-[var(--text-secondary)]">{eyebrow}</p>
        )}
        <p className="text-[13px] text-[var(--text-secondary)]">
          {CATEGORY_LABELS[event.category]}
        </p>
        <h3 className="mt-0.5 font-heading text-base font-semibold leading-snug">{event.title}</h3>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{locality}</p>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
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
      </div>
    </div>
  );

  const base = cn(
    "block w-full rounded-xl border bg-card p-4 text-left shadow-[var(--shadow-xs)] transition-colors",
    selected ? "border-primary ring-2 ring-primary/30 bg-brand-soft" : "border-border",
    className,
  );

  const detailLink = withLink && (
    <Link
      to={`/eventos/${event.id}` as "/"}
      className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      Ver detalle
    </Link>
  );

  if (!onSelect) {
    return (
      <article className={base}>
        {body}
        {detailLink}
      </article>
    );
  }
  return (
    <div className={cn(base, "p-0")}>
      <button
        type="button"
        onClick={() => onSelect(event.id)}
        aria-pressed={selected}
        className="block w-full cursor-pointer rounded-xl p-4 text-left hover:bg-[var(--surface-quiet)] focus-visible:outline-2 focus-visible:outline-primary"
      >
        {body}
      </button>
      {detailLink && <div className="px-4 pb-3">{detailLink}</div>}
    </div>
  );
}
