import type { CollectionPoint, Organization } from "@emergency-map/domain/schemas";
import { Button } from "@emergency-map/web-ui";
import { DemoBadge } from "../event/demo-badge";
import { EmptyState } from "../event/empty-state";
import { territoryLabel } from "./help-data";
import { PointStatusBadge, fmtDate } from "./help-ui";

export function PointsList({
  points,
  organizations,
  onOpen,
}: {
  points: CollectionPoint[];
  organizations: Organization[];
  onOpen: (id: string) => void;
}) {
  if (points.length === 0) {
    return (
      <EmptyState
        title="Sin puntos de recepción para mostrar"
        description="No hay puntos de recepción publicados en las fuentes conectadas. Esto no indica que no se necesite ayuda."
      />
    );
  }
  return (
    <>
      {points.map((p) => {
        const org = organizations.find((o) => o.id === p.organizationId);
        return (
          <article
            key={p.id}
            className="grid gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-card p-3.5 shadow-[var(--shadow-xs)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grid gap-0.5">
                <span className="text-xs text-[color:var(--text-secondary)]">
                  Punto de recepción · {p.id}
                </span>
                <h3 className="text-[15px] font-medium">{p.name}</h3>
              </div>
              <PointStatusBadge status={p.status} />
            </div>
            {p.isDemo && <DemoBadge className="justify-self-start" />}
            <span className="text-[13px] text-[color:var(--text-secondary)]">{p.address}</span>
            <span className="text-[13px]">
              {p.schedule.text} · recibe para{" "}
              <strong className="font-medium">
                {p.destinationTerritories.map(territoryLabel).join("; ") || "destino no indicado"}
              </strong>
            </span>
            <span className="text-xs text-[color:var(--text-secondary)]">
              Contacto revisado {fmtDate(org?.contactReviewedAt)} · Disponibilidad confirmada{" "}
              {fmtDate(p.availabilityConfirmedAt)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => onOpen(p.id)}
            >
              Ver ficha del punto
            </Button>
          </article>
        );
      })}
      <p className="m-0 text-xs text-[color:var(--text-tertiary)]">
        Una sede de organización no es automáticamente un punto de acopio. Se muestra «horario
        declarado», no «abierto ahora».
      </p>
    </>
  );
}
