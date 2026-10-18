import { Link } from "@tanstack/react-router";
import { Repeat } from "lucide-react";
import { Button, Skeleton, buttonVariants } from "@emergency-map/web-ui";
import type { LocalityOverview } from "@emergency-map/domain/schemas";
import { CATEGORY_ICONS, DemoBadge, ReviewBadge } from "@/components/event";
import {
  CATEGORY_LABELS,
  NOTICE_VALIDITY_LABELS,
  ORIGIN_LABELS,
  formatDateTime,
  formatRelative,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { distanceKm } from "@/components/nearby/geo";
import { LOCALITY_PERIOD_DAYS, NEAR_LOCALITY_RADIUS_KM } from "./use-locality-overview";

const card =
  "grid gap-1 rounded-xl border border-[var(--border-subtle)] bg-card p-3.5 text-foreground transition-colors";
const linkCard = cn(card, "hover:border-[var(--border-strong)] hover:no-underline");
const muted = "text-[13px] text-[var(--text-secondary)]";

const eventHref = (id: string) => `/eventos/${id}` as "/";

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid content-start gap-2.5">
      <h2 className="font-heading text-[17px] font-semibold">{title}</h2>
      {intro && <p className={muted}>{intro}</p>}
      {children}
    </section>
  );
}

export function LocalityLoading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Cargando la localidad">
      <Skeleton className="h-9 w-2/3" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export function LocalityError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="grid max-w-xl justify-items-start gap-2 rounded-xl border p-5">
      <p className="font-medium">No pudimos cargar esta localidad</p>
      <p className="text-sm text-[var(--text-secondary)]">
        Esto no significa que no ocurra nada. Vuelve a intentarlo.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/** Everything published for the saved district, grouped as in the design. */
export function LocalityView({
  overview,
  now,
  onChange,
}: {
  overview: LocalityOverview;
  now: Date;
  onChange: () => void;
}) {
  const { territory, notices, events, nearbyEvents, organizations, needs } = overview;
  const province = territory.provinceName ?? territory.name;
  const nearbySorted = nearbyEvents
    .map((e) => ({
      e,
      km: e.place.point ? distanceKm(territory.centroid, e.place.point) : null,
    }))
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1.5">
          <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight md:text-[30px]">
            Qué se ha publicado en {territory.name}
          </h1>
          <span className="text-sm text-[var(--text-secondary)]">
            Distrito de {territory.name} · Provincia de {province} · Departamento de{" "}
            {territory.departmentName} · localidad guardada en este dispositivo
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onChange}>
            <Repeat aria-hidden /> Cambiar localidad
          </Button>
          <Link to={"/mapa" as "/"} className={buttonVariants()}>
            Ver en mapa
          </Link>
        </div>
      </div>

      {overview.noInformation && (
        <div className="grid max-w-3xl justify-items-start gap-3 rounded-2xl border border-[var(--border-subtle)] p-6">
          <strong className="text-[17px]">
            No encontramos información para esta localidad en las fuentes conectadas
          </strong>
          <p className="text-sm text-[var(--text-secondary)]">
            Esto no significa que no ocurra nada: la cobertura es parcial y depende de reportes y
            fuentes disponibles.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to={"/eventos" as "/"} className={buttonVariants({ variant: "outline" })}>
              Ampliar periodo
            </Link>
            <Link to={"/cerca" as "/"} className={buttonVariants({ variant: "outline" })}>
              Localidades cercanas
            </Link>
            <Link to="/reportar" className={buttonVariants({ variant: "outline" })}>
              Publicar un reporte
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Avisos oficiales que intersectan el distrito">
          {notices.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Ningún aviso vigente intersecta este distrito según las fuentes conectadas.
            </p>
          )}
          {notices.map((n) => (
            <article key={n.id} className={card}>
              <span className="text-sm font-medium">{n.title}</span>
              <span className={muted}>
                {NOTICE_VALIDITY_LABELS[n.validity]}
                {n.validTo ? ` · hasta ${formatDateTime(n.validTo)}` : ""}
                {n.severity ? ` · ${n.severity.issuer}: ${n.severity.legend}` : ""}
              </span>
              <span className={muted}>Fuente: {n.institution}</span>
              {n.partialOverlap && (
                <span className="text-xs text-warning">Este aviso incluye parte del distrito.</span>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {n.isDemo && <DemoBadge />}
                {n.url ? (
                  <a href={n.url} className="text-xs underline" rel="noreferrer" target="_blank">
                    Ver fuente original
                  </a>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)]">
                    Fuente simulada, enlace no disponible
                  </span>
                )}
              </div>
            </article>
          ))}
        </Section>

        <Section title="Reportes ciudadanos en su territorio">
          {events.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Sin reportes publicados dentro del distrito en los últimos {LOCALITY_PERIOD_DAYS}{" "}
              días.
            </p>
          )}
          {events.map((e) => {
            const Icon = CATEGORY_ICONS[e.category];
            return (
              <Link
                key={e.id}
                to={eventHref(e.id)}
                className={cn(linkCard, "grid-cols-[32px_1fr] gap-x-2.5")}
              >
                <span className="bg-muted flex size-8 items-center justify-center rounded-lg">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="grid gap-1">
                  <span className="text-sm font-medium">{e.title}</span>
                  <span className={muted}>
                    {CATEGORY_LABELS[e.category]} · {formatRelative(e.occurredAt.start, now)} ·{" "}
                    {ORIGIN_LABELS[e.origin]}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <ReviewBadge status={e.reviewStatus} />
                    {e.isDemo && <DemoBadge />}
                  </span>
                </span>
              </Link>
            );
          })}
        </Section>

        <Section title="Necesidades y organizaciones con cobertura">
          {organizations.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Ninguna organización declara cobertura en este distrito.
            </p>
          )}
          {organizations.map((o) => {
            const open = needs.filter(
              (n) => n.organizationId === o.id && n.status === "open",
            ).length;
            return (
              <Link key={o.id} to={"/ayudar" as "/"} className={linkCard}>
                <span className="text-sm font-medium">{o.name}</span>
                <span className={muted}>
                  {open === 1 ? "1 necesidad abierta" : `${open} necesidades abiertas`}
                  {o.contactReviewedAt
                    ? ` · contacto revisado ${formatDateTime(o.contactReviewedAt)}`
                    : " · contacto sin revisar"}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  Cobertura declarada en {o.coverage.map((c) => c.name).join(", ")}. Cobertura no
                  significa sede.
                </span>
                {o.isDemo && <DemoBadge className="mt-1 justify-self-start" />}
              </Link>
            );
          })}
        </Section>

        <Section
          title="En localidades cercanas"
          intro={`Eventos a menos de ${NEAR_LOCALITY_RADIUS_KM} km que ocurren fuera del límite del distrito.`}
        >
          {nearbySorted.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Sin eventos cercanos publicados en el periodo.
            </p>
          )}
          {nearbySorted.map(({ e, km }) => (
            <Link key={e.id} to={eventHref(e.id)} className={linkCard}>
              <span className="text-sm font-medium">{e.title}</span>
              <span className={muted}>
                {e.place.territory.name} ·{" "}
                {km === null
                  ? "distancia no disponible"
                  : `a ~${km.toFixed(0)} km${e.place.precision === "exact" ? "" : " (aproximada)"}`}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <ReviewBadge status={e.reviewStatus} />
                {e.isDemo && <DemoBadge />}
              </span>
            </Link>
          ))}
        </Section>
      </div>
    </>
  );
}
