import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Plus } from "lucide-react";
import { Button, Skeleton } from "@emergency-map/web-ui";
import type { Need } from "@emergency-map/domain/schemas";
import { DemoBadge } from "../event/demo-badge";
import { EmptyState } from "../event/empty-state";
import { DAY_MS, effectiveNeedStatus, territoryLabel, useHelpSnapshot } from "../help/help-data";
import { NeedStatusBadge, PointStatusBadge, fmtDate } from "../help/help-ui";
import { quantityText } from "../help/needs-list";
import { NEED_CATEGORY_LABELS } from "@/lib/labels";
import { CoverDialog } from "./cover-dialog";
import { NeedFormDialog } from "./need-form-dialog";
import { PointFormDialog } from "./point-form-dialog";
import { ProblemNotice } from "./problem-notice";

const th =
  "border-b border-[color:var(--border-subtle)] px-2.5 py-2 text-left text-[11px] font-medium tracking-wider text-[color:var(--text-secondary)] uppercase";
const td = "px-2.5 py-3 align-top";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1 rounded-xl border border-[color:var(--border-subtle)] px-4 py-3.5">
      <span className="text-xs text-[color:var(--text-secondary)]">{label}</span>
      <span className="font-mono text-2xl font-medium">{value}</span>
    </div>
  );
}

/**
 * Organization workspace. The profile shown is the first organization the API returns (the demo
 * organization when the API is unavailable); membership is enforced by the API on every write.
 */
export function OrganizationWorkspace({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { data, isPending, isError, refetch } = useHelpSnapshot();
  const [newNeed, setNewNeed] = useState(false);
  const [newPoint, setNewPoint] = useState(false);
  const [covering, setCovering] = useState<Need | null>(null);

  if (isPending) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  const org = data?.organizations[0];
  if (isError || !data || !org) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          title="No pudimos cargar tu organización"
          description="Inténtalo de nuevo. Si el problema sigue, la organización aún no tiene un perfil publicado."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  const now = data.now;
  const needs = data.needs.filter((n) => n.organizationId === org.id);
  const points = data.points.filter((p) => p.organizationId === org.id);
  const open = needs.filter((n) => effectiveNeedStatus(n, now) === "open");
  const soon = open.filter((n) => n.deadline && n.deadline.getTime() - now.getTime() < 7 * DAY_MS);
  const paused = needs.filter((n) => n.status === "paused");
  const pointName = (id: string | null) => {
    const p = data.points.find((x) => x.id === id);
    return p ? `${p.name} (${p.territory.name})` : "Sin punto indicado";
  };

  return (
    <div className="mx-auto grid max-w-6xl content-start gap-6 px-4 py-6 md:px-8 md:pb-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-[26px] font-semibold tracking-tight">{org.name}</h1>
            {org.isDemo && <DemoBadge />}
          </div>
          <p className="m-0 text-sm text-[color:var(--text-secondary)]">
            Solo puedes editar tus propios registros. Cada cambio queda registrado con su fecha.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setNewPoint(true)}>
            <MapPin aria-hidden /> Crear punto de recepción
          </Button>
          <Button onClick={() => setNewNeed(true)}>
            <Plus aria-hidden /> Crear necesidad
          </Button>
        </div>
      </div>

      {!isAuthenticated && <ProblemNotice problem={{ kind: "signin" }} />}
      {data.source === "demo" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-secondary)]">
          <DemoBadge /> Datos de demostración: la API no respondió, se muestra el conjunto de
          ejemplo.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Necesidades abiertas" value={open.length} />
        <Stat label="Próximas a vencer (7 días)" value={soon.length} />
        <Stat label="Pausadas" value={paused.length} />
      </div>

      <section className="grid gap-2.5" aria-labelledby="org-needs">
        <h2 id="org-needs" className="m-0 text-[17px] font-semibold">
          Necesidades
        </h2>
        {needs.length === 0 ? (
          <EmptyState description="Esta organización aún no publicó necesidades." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead>
                <tr>
                  {["Necesidad", "Destino", "Recepción", "Vigencia", "Estado"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                  <th className={th}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {needs.map((n) => {
                  const status = effectiveNeedStatus(n, now);
                  return (
                    <tr key={n.id} className="border-b border-[color:var(--border-subtle)]">
                      <td className={td}>
                        <span className="grid gap-0.5">
                          <span className="font-medium">{n.title}</span>
                          <span className="text-xs text-[color:var(--text-secondary)]">
                            {NEED_CATEGORY_LABELS[n.category]} · {n.id} ·{" "}
                            {n.quantity ? quantityText(n.quantity) : "sin cantidad"}
                          </span>
                          {n.isDemo && <DemoBadge className="mt-1 justify-self-start" />}
                        </span>
                      </td>
                      <td className={`${td} text-[color:var(--text-secondary)]`}>
                        {territoryLabel(n.destinationTerritory)}
                      </td>
                      <td className={`${td} text-[color:var(--text-secondary)]`}>
                        {pointName(n.collectionPointId)}
                      </td>
                      <td className={`${td} whitespace-nowrap text-[color:var(--text-secondary)]`}>
                        {n.deadline ? `Hasta ${fmtDate(n.deadline)}` : "Sin fecha"}
                      </td>
                      <td className={td}>
                        <NeedStatusBadge status={status} />
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        <span className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="Aún no disponible: la API no permite editar la vigencia"
                          >
                            Editar vigencia
                          </Button>
                          {status === "open" && (
                            <Button variant="ghost" size="sm" onClick={() => setCovering(n)}>
                              Marcar cubierta
                            </Button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="m-0 text-xs text-[color:var(--text-tertiary)]">
          Una necesidad vencida sale del filtro de vigentes y queda en historial con su estado. No
          se publica el domicilio de un voluntario por defecto.
        </p>
      </section>

      <section className="grid gap-2.5" aria-labelledby="org-points">
        <h2 id="org-points" className="m-0 text-[17px] font-semibold">
          Puntos de recepción propios
        </h2>
        {points.length === 0 ? (
          <EmptyState description="Esta organización aún no tiene puntos de recepción." />
        ) : (
          points.map((p) => (
            <div
              key={p.id}
              className="grid gap-3 rounded-xl border border-[color:var(--border-subtle)] p-3.5 text-sm md:grid-cols-[1fr_auto] md:items-center"
            >
              <span className="grid gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {p.name} · {p.id}
                  <PointStatusBadge status={p.status} />
                  {p.isDemo && <DemoBadge />}
                </span>
                <span className="text-[13px] text-[color:var(--text-secondary)]">
                  {p.address} · {p.schedule.text} · confirmado {fmtDate(p.availabilityConfirmedAt)}{" "}
                  · recibe para{" "}
                  {p.destinationTerritories.map((t) => t.name).join(", ") || "destino no indicado"}
                </span>
              </span>
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" disabled title="Aún no disponible">
                  Confirmar disponibilidad hoy
                </Button>
                <Button variant="ghost" size="sm" disabled title="Aún no disponible">
                  Cerrar temporalmente
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <Link
        to="/ayudar"
        className="text-sm font-medium text-[color:var(--text-link)] hover:underline"
      >
        Ver cómo se muestra en el directorio público
      </Link>

      <NeedFormDialog
        open={newNeed}
        onOpenChange={setNewNeed}
        org={org}
        points={points}
        signedIn={isAuthenticated}
      />
      <PointFormDialog
        open={newPoint}
        onOpenChange={setNewPoint}
        org={org}
        signedIn={isAuthenticated}
      />
      <CoverDialog need={covering} onClose={() => setCovering(null)} signedIn={isAuthenticated} />
    </div>
  );
}
