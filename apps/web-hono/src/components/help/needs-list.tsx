import { MapPin, Mail } from "lucide-react";
import { Button, Skeleton } from "@emergency-map/web-ui";
import type { CollectionPoint, Need, Organization } from "@emergency-map/domain/schemas";
import { DemoBadge } from "../event/demo-badge";
import { EmptyState } from "../event/empty-state";
import { NEED_CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { effectiveNeedStatus, territoryLabel } from "./help-data";
import { Field, NeedStatusBadge, fmtDate } from "./help-ui";

/** Quantities are always attributed to the organization that declared them. */
export function quantityText(q: string): string {
  return q.startsWith("Según actualización") ? q : `${q} · según actualización de la organización`;
}

export function NeedsList({
  needs,
  now,
  organizations,
  points,
  onOpenPoint,
  onOpenOrg,
}: {
  needs: Need[];
  now: Date;
  organizations: Organization[];
  points: CollectionPoint[];
  onOpenPoint: (id: string) => void;
  onOpenOrg: (id: string) => void;
}) {
  if (needs.length === 0) {
    return (
      <EmptyState
        title="Sin necesidades con estos filtros"
        description="Las necesidades vencidas quedan en historial con su estado. Quita «Solo vigentes» para verlas."
      />
    );
  }
  return (
    <>
      {needs.map((n) => {
        const status = effectiveNeedStatus(n, now);
        const org = organizations.find((o) => o.id === n.organizationId);
        const point = points.find((p) => p.id === n.collectionPointId);
        return (
          <article
            key={n.id}
            className={cn(
              "grid gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-card p-3.5 shadow-[var(--shadow-xs)]",
              status !== "open" && "opacity-70",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grid gap-0.5">
                <span className="text-xs text-[color:var(--text-secondary)]">
                  {NEED_CATEGORY_LABELS[n.category]} · {n.id}
                </span>
                <h3 className="text-[15px] leading-snug font-medium">{n.title}</h3>
              </div>
              <NeedStatusBadge status={status} />
            </div>
            {n.isDemo && <DemoBadge className="justify-self-start" />}
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 text-[13px]">
              <Field label="Responsable">
                <button
                  type="button"
                  onClick={() => onOpenOrg(n.organizationId)}
                  className="cursor-pointer font-medium text-[color:var(--text-link)] hover:underline"
                >
                  {org?.name ?? n.organizationId}
                </button>
              </Field>
              <Field label="Destino">{territoryLabel(n.destinationTerritory)}</Field>
              <Field label="Se recibe en">
                {point
                  ? `${point.name} (${point.territory.name})`
                  : "Sin punto de recepción indicado"}
              </Field>
              <Field label="Cantidad">
                {n.quantity ? quantityText(n.quantity) : "No declarada"}
              </Field>
              <Field label="Vigencia">
                {n.deadline ? `Hasta ${fmtDate(n.deadline)}` : "Sin fecha indicada"} · actualizado{" "}
                {fmtDate(n.updatedAt)}
              </Field>
            </dl>
            {n.statusNote && (
              <p className="m-0 text-xs text-[color:var(--text-secondary)]">{n.statusNote}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!point}
                onClick={() => point && onOpenPoint(point.id)}
              >
                <MapPin aria-hidden /> Ver cómo entregar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenOrg(n.organizationId)}>
                <Mail aria-hidden /> Contactar organización
              </Button>
            </div>
          </article>
        );
      })}
      <p className="m-0 text-xs text-[color:var(--text-tertiary)]">
        Las cantidades son «según actualización de la organización». Abrir un contacto no registra
        ni confirma ninguna entrega.
      </p>
    </>
  );
}

export function ListSkeleton() {
  return (
    <div className="grid gap-2.5" aria-busy="true" aria-label="Cargando">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}
