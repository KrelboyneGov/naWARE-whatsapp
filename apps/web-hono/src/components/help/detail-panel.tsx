import { ExternalLink, Flag, FlaskConical, IdCard, MailCheck, X } from "lucide-react";
import { Button, buttonVariants } from "@emergency-map/web-ui";
import { cn } from "@/lib/utils";
import type { CollectionPoint, Need, Organization } from "@emergency-map/domain/schemas";
import { DemoBadge } from "../event/demo-badge";
import { NEED_CATEGORY_LABELS } from "@/lib/labels";
import { isNeedCurrent, isStale, territoryLabel } from "./help-data";
import { Field, fmtDate } from "./help-ui";

const chip =
  "inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[13px] text-muted-foreground";

export function PanelShell({
  id,
  title,
  onClose,
  children,
}: {
  id: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside role="dialog" aria-label={title} className="flex min-h-0 flex-col bg-background">
      <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-4 py-3">
        <span className="font-mono text-xs text-[color:var(--text-secondary)]">{id}</span>
        <Button variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={onClose}>
          <X aria-hidden />
        </Button>
      </div>
      <div className="grid flex-1 content-start gap-4 overflow-auto p-4 text-sm">{children}</div>
    </aside>
  );
}

export function PointDetail({
  point,
  org,
  now,
}: {
  point: CollectionPoint;
  org: Organization | undefined;
  now: Date;
}) {
  const stale = isStale(point.availabilityConfirmedAt, now);
  const contact = point.contacts[0];
  const mapsHref = `https://www.openstreetmap.org/?mlat=${point.location.lat}&mlon=${point.location.lng}#map=17/${point.location.lat}/${point.location.lng}`;
  return (
    <>
      <div className="grid gap-1.5">
        <h2 className="m-0 text-[22px] font-semibold tracking-tight">{point.name}</h2>
        <span className="text-[color:var(--text-secondary)]">{point.address}</span>
        {point.arrivalReference && (
          <span className="text-[13px] text-[color:var(--text-secondary)]">
            Referencia: {point.arrivalReference}
          </span>
        )}
      </div>
      {point.status !== "active" && (
        <div className="rounded-lg bg-status-warning-quiet px-3 py-2.5 text-[13px] text-status-warning">
          Este punto figura como cerrado temporalmente.
        </div>
      )}
      {point.isDemo && (
        <div className="flex flex-wrap gap-2">
          <DemoBadge />
          <span className={chip}>
            <FlaskConical className="size-3.5" aria-hidden /> Dirección y contacto ficticios
          </span>
        </div>
      )}
      <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-[13px]">
        <Field label="Horario declarado">{point.schedule.text}</Field>
        <Field label="Recibe para">
          {point.destinationTerritories.map(territoryLabel).join("; ") || "No indicado"} (la colecta
          está en {territoryLabel(point.territory)}; el destino puede ser otra región)
        </Field>
        <Field label="Acepta">
          {point.accepts.map((c) => NEED_CATEGORY_LABELS[c]).join(", ") || "No indicado"}
        </Field>
        <Field label="No acepta">{point.doesNotAccept ?? "No indicado"}</Field>
        <Field label="Contacto revisado">{fmtDate(org?.contactReviewedAt)}</Field>
        <Field label="Disponibilidad confirmada">{fmtDate(point.availabilityConfirmedAt)}</Field>
      </dl>
      {stale && (
        <div className="rounded-lg bg-status-warning-quiet px-3 py-2.5 text-[13px] text-status-warning">
          El contacto tiene más de 7 días sin revisión. Confirma antes de trasladarte.
        </div>
      )}
      <div className="grid gap-2">
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "h-auto justify-self-start py-1.5")}
        >
          <ExternalLink aria-hidden /> Opciones para llegar (servicio externo de mapas)
        </a>
        <span className="text-xs text-[color:var(--text-secondary)]">
          Se abre un servicio externo identificado como tal. No garantizamos que una vía esté
          habilitada ni dibujamos rutas «seguras».
        </span>
      </div>
      <div className="grid gap-1 text-[13px]">
        <span className="font-medium">
          {point.isDemo ? "Contacto institucional de ejemplo" : "Contacto institucional"}
        </span>
        <span className="font-mono">{contact?.value ?? "Sin contacto público"}</span>
        {point.isDemo && (
          <span className="text-[color:var(--text-secondary)]">
            No operativo. En producción aparecerá el contacto institucional revisado.
          </span>
        )}
      </div>
    </>
  );
}

export function OrgDetail({
  org,
  needs,
  points,
  now,
}: {
  org: Organization;
  needs: Need[];
  points: CollectionPoint[];
  now: Date;
}) {
  const own = needs.filter((n) => n.organizationId === org.id);
  const open = own.filter((n) => isNeedCurrent(n, now)).length;
  const closed = own.length - open;
  const contact = org.contacts[0];
  return (
    <>
      <div className="grid gap-1.5">
        <h2 className="m-0 text-[22px] font-semibold tracking-tight">{org.name}</h2>
        <span className="text-[color:var(--text-secondary)]">{org.description}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {org.isDemo && <DemoBadge />}
        <span className={chip}>
          <IdCard className="size-3.5" aria-hidden /> Identidad revisada{" "}
          {fmtDate(org.identityReviewedAt)}
        </span>
        <span className={chip}>
          <MailCheck className="size-3.5" aria-hidden /> Contacto revisado{" "}
          {fmtDate(org.contactReviewedAt)}
        </span>
      </div>
      <span className="text-xs text-[color:var(--text-secondary)]">
        Qué se comprobó: existencia de la organización y respuesta del contacto institucional. No
        implica aval estatal ni verificación de cada necesidad.
      </span>
      <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-[13px]">
        <Field label="Cobertura">
          {org.coverage.map(territoryLabel).join("; ") || "No indicada"}
        </Field>
        <Field label="Contacto público">
          <span className="font-mono">{contact?.value ?? "Sin contacto público"}</span>
        </Field>
        <Field label="Necesidades">
          {open} {open === 1 ? "abierta" : "abiertas"} · {closed}{" "}
          {closed === 1 ? "no vigente" : "no vigentes"}
        </Field>
        <Field label="Puntos propios">
          {points.filter((p) => p.organizationId === org.id && p.status !== "withdrawn").length}
        </Field>
      </dl>
      {org.isDemo && (
        <div className="rounded-lg bg-status-warning-quiet px-3 py-2.5 text-[13px] text-status-warning">
          Contacto de ejemplo, no operativo. Abrir esta vista no contacta a ninguna persona real.
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="justify-self-start"
        disabled
        title="Aún no disponible"
      >
        <Flag aria-hidden /> Reportar un contacto incorrecto
      </Button>
    </>
  );
}
