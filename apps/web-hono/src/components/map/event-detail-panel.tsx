import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CircleDashed, Share2, X } from "lucide-react";
import { Button, buttonVariants, cn } from "@emergency-map/web-ui";
import type { PublicEvent } from "@emergency-map/domain/schemas";

import { DemoBadge } from "../event/demo-badge";
import { FreshnessLabel } from "../event/freshness-label";
import { OriginBadge } from "../event/origin-badge";
import { ReviewBadge } from "../event/review-badge";
import { CATEGORY_ICONS } from "./category-icons";
import { CATEGORY_LABELS, PRECISION_LABELS, formatDateTime, formatRelative } from "@/lib/labels";

interface EventDetailProps {
  event: PublicEvent;
  now: Date;
  onClose: () => void;
}

/**
 * Side sheet of the selected event on /mapa (desktop). Shows the four dimensions separately and
 * only what the public read model carries; evidence, sources and history live on the detail page.
 */
export function EventDetailPanel(props: EventDetailProps) {
  return (
    <aside
      aria-label={props.event.title}
      className="bg-background order-3 hidden min-h-0 w-[400px] shrink-0 flex-col border-l lg:flex"
    >
      <EventDetailContent {...props} />
    </aside>
  );
}

/** The selected event's card, shared by the desktop side sheet and the mobile bottom sheet. */
export function EventDetailContent({ event, now, onClose }: EventDetailProps) {
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const Icon = CATEGORY_ICONS[event.category];
  const t = event.place.territory;
  const locality = [t.name, t.provinceName, t.departmentName].filter(Boolean).join(", ");
  const approximate = event.place.precision !== "exact";

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMsg("Enlace copiado. Incluye los filtros y la selección actuales.");
    } catch {
      setShareMsg("No pudimos copiar el enlace. Cópialo desde la barra del navegador.");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-mono text-xs text-[var(--text-secondary)]">{event.id}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Compartir" onClick={share}>
            <Share2 aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Cerrar ficha" onClick={onClose}>
            <X aria-hidden />
          </Button>
        </div>
      </div>
      {shareMsg && (
        <div
          role="status"
          className="bg-brand-soft text-primary mx-4 mt-3 rounded-lg px-3 py-2 text-[13px]"
        >
          {shareMsg}
        </div>
      )}
      <div className="grid flex-1 content-start gap-5 overflow-y-auto p-4">
        <div className="grid gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Icon className="size-3.5" aria-hidden />
            {CATEGORY_LABELS[event.category]}
          </span>
          <h2 className="font-heading text-[22px] leading-tight font-semibold text-balance">
            {event.title}
          </h2>
          <span className="text-sm text-[var(--text-secondary)]">{locality}</span>
          <span className="text-[13px] text-[var(--text-secondary)]">
            Ocurrió {formatRelative(event.occurredAt.start, now)} ·{" "}
            {formatDateTime(event.occurredAt.start)}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <OriginBadge origin={event.origin} />
            <ReviewBadge status={event.reviewStatus} />
            {event.isDemo && <DemoBadge />}
          </div>
          <FreshnessLabel status={event.situationStatus} />
          <span className="text-[13px] text-[var(--text-secondary)]">
            Actualizado {formatRelative(event.lastUpdatedAt, now)} ·{" "}
            {formatDateTime(event.lastUpdatedAt)}
          </span>
          {event.severity && (
            <span className="text-[13px]">
              <strong className="font-medium">Severidad según la fuente:</strong>{" "}
              {event.severity.issuer} · {event.severity.legend}
            </span>
          )}
          {approximate && (
            <span className="text-warning inline-flex items-center gap-1.5 text-[13px]">
              <CircleDashed className="size-3.5" aria-hidden />
              {event.place.precision === "district"
                ? "Solo se conoce el distrito: no hay punto en el mapa."
                : `${PRECISION_LABELS[event.place.precision]}: no es el perímetro del evento.`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={`/eventos/${event.id}` as "/"} className={cn(buttonVariants({ size: "sm" }))}>
            Ver detalle completo
          </Link>
        </div>

        <section className="grid gap-1.5">
          <h3 className="text-[11px] font-medium tracking-wider text-[var(--text-secondary)] uppercase">
            Qué se sabe
          </h3>
          <p className="text-sm text-pretty">{event.description || "Sin descripción adicional."}</p>
        </section>

        <p className="text-xs text-[var(--text-secondary)]">
          Evidencias, fuentes y cambios del registro están en el detalle completo. «Con aportes» o
          «publicado» no significa que el hecho esté comprobado.
        </p>
      </div>
    </>
  );
}
