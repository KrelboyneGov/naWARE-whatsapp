import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Camera, CircleDashed, Flag, HandHeart, Link2, Share2 } from "lucide-react";
import { Button, Skeleton, buttonVariants, cn } from "@emergency-map/web-ui";
import type { PublicEvidence, PublicReviewDecision } from "@emergency-map/domain/schemas";
import { CATEGORY_ICONS, DemoBadge, OriginBadge, ReviewBadge } from "@/components/event";
import { ACTIVITY_DOT_CLASS } from "@/components/history/activity-labels";
import {
  CATEGORY_LABELS,
  PRECISION_LABELS,
  PUBLICATION_LABELS,
  REVIEW_LABELS,
  formatDateTime,
  formatRelative,
} from "@/lib/labels";
import { ContributeSheet } from "./contribute-sheet";
import { formatLocality, formatOccurred } from "./format";
import { ReportIssueDialog } from "./report-issue-dialog";
import { SituationBadge } from "./situation-badge";
import { SpecialState } from "./special-state";
import { SignalBar } from "@/components/signals/signal-bar";
import { useEventDetail, type EventDetailData } from "./use-event-detail";

// MapLibre touches `window`: load it only in the browser.
const EventLocationMap = lazy(() => import("./event-location-map"));

const PRECISION_TEXT = {
  exact: "Punto declarado por el autor; precisión puntual.",
  approximate: "Ubicación aproximada. El círculo es incertidumbre, no el perímetro del evento.",
  district: "Solo se conoce el distrito. El círculo es orientativo.",
} as const;

const h2 = "text-xl font-semibold tracking-tight";

function DetailSkeleton() {
  return (
    <main
      className="mx-auto grid w-full max-w-[1160px] gap-4 px-4 py-6 md:px-10"
      aria-busy="true"
      aria-label="Cargando el evento"
    >
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </main>
  );
}

export function EventDetailPage({ id, isAuthenticated }: { id: string; isAuthenticated: boolean }) {
  const { data, isPending, isError, refetch } = useEventDetail(id);

  if (isPending) return <DetailSkeleton />;
  if (isError) {
    return (
      <main className="mx-auto grid max-w-xl justify-items-center gap-3 px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">No pudimos cargar este evento</h1>
        <p className="text-text-secondary">
          Falló la consulta. Eso no significa que el evento no exista. Inténtalo de nuevo.
        </p>
        <Button size="lg" onClick={() => refetch()}>
          Reintentar
        </Button>
      </main>
    );
  }
  if (data.status !== "ok") return <SpecialState state={data} />;
  return <EventDetailView data={data.data} isAuthenticated={isAuthenticated} />;
}

function EvidenceCard({ e }: { e: PublicEvidence }) {
  const kindLabel =
    e.type === "photo"
      ? e.ownsImage
        ? "Imagen propia declarada"
        : "Imagen compartida"
      : e.type === "document_link"
        ? "Enlace documental"
        : "Declaración textual";
  return (
    <article className="border-border-subtle shadow-xs grid content-start gap-2.5 rounded-xl border p-3">
      {e.type === "photo" && (
        <div
          className="text-text-secondary flex aspect-[4/3] items-center justify-center rounded-lg bg-[repeating-linear-gradient(135deg,#F5F5F7_0_12px,#ECECEE_12px_24px)] p-2 text-center text-xs"
          role="img"
          aria-label="Marcador de posición de imagen"
        >
          {e.isDemo ? (
            <span>
              Imagen de prueba · marcador de posición
              <br />
              Ningún archivo real fue recibido
            </span>
          ) : (
            <span>Imagen adjunta. La vista previa aún no está disponible.</span>
          )}
        </div>
      )}
      <div className="grid gap-1 text-[13px]">
        <span className="text-sm font-medium">{e.description}</span>
        <span className="text-text-secondary">
          {e.author.displayName} · {kindLabel}
        </span>
        {e.url && (
          <a
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary inline-flex items-center gap-1 break-all underline-offset-2 hover:underline"
          >
            <Link2 className="size-3.5 shrink-0" aria-hidden />
            {e.url}
          </a>
        )}
        <span className="text-text-secondary">
          {e.declaredCapturedAt
            ? `Captura declarada ${formatDateTime(e.declaredCapturedAt.start)}`
            : "Fecha de captura no declarada"}{" "}
          · Subida {formatDateTime(e.receivedAt)}
        </span>
        <span className="mt-0.5 flex flex-wrap gap-1.5">
          <ReviewBadge status={e.reviewStatus} />
          {e.isDemo && <DemoBadge />}
        </span>
      </div>
    </article>
  );
}

function ReviewNote({ decisions }: { decisions: PublicReviewDecision[] }) {
  const latest = decisions
    .filter((d) => d.kind === "corroboration")
    .sort((a, b) => b.decidedAt.getTime() - a.decidedAt.getTime())[0];
  const checked =
    latest && Array.isArray(latest.details.aspectsChecked)
      ? (latest.details.aspectsChecked as string[])
      : [];
  const limits = typeof latest?.details.limits === "string" ? latest.details.limits : null;

  return (
    <div className="border-border-subtle bg-surface-secondary grid gap-1.5 rounded-xl border p-3.5 text-[13px]">
      <span className="text-text-secondary text-[11px] font-medium tracking-wider uppercase">
        Sobre esta revisión
      </span>
      {latest ? (
        <>
          <span>Equipo de revisión · {formatDateTime(latest.decidedAt)}</span>
          <span>{latest.publicReason}</span>
          {checked.length > 0 && (
            <span>
              <strong className="font-medium">Se corroboró:</strong> {checked.join("; ")}
            </span>
          )}
          {limits && (
            <span>
              <strong className="font-medium">Sigue incierto:</strong> {limits}
            </span>
          )}
        </>
      ) : (
        <span className="text-text-secondary">
          Aún no hay una revisión de contenido. La publicación pasó controles básicos; eso no
          comprueba el hecho.
        </span>
      )}
    </div>
  );
}

function EventDetailView({
  data,
  isAuthenticated,
}: {
  data: EventDetailData;
  isAuthenticated: boolean;
}) {
  const { event, evidence, decisions, sources, needs, changes, now, districtCentroid } = data;
  const [contributeOpen, setContributeOpen] = useState(false);
  // "#aportar" (from Urgencias) opens the evidence sheet directly.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#aportar")
      setContributeOpen(true);
  }, []);
  const [issueOpen, setIssueOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const Icon = CATEGORY_ICONS[event.category];
  const returnTo = `/eventos/${event.id}`;
  const locality = formatLocality(event.place);
  const precision = event.place.precision;
  const approx = precision !== "exact";
  const hasMapCenter = !!(event.place.point ?? districtCentroid);

  const share = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${returnTo}` : returnTo;
    const text = [
      event.title,
      formatDateTime(event.lastUpdatedAt),
      REVIEW_LABELS[event.reviewStatus],
      event.isDemo ? "DEMOSTRACIÓN" : null,
      url,
    ]
      .filter(Boolean)
      .join(" · ");
    try {
      await navigator.clipboard.writeText(text);
      setShareMsg(
        `Enlace copiado con título, fecha y estado actual.${event.isDemo ? " Lleva la marca «Demostración»." : ""} No incluye tu ubicación.`,
      );
    } catch {
      setShareMsg(`No pudimos copiar el enlace. Cópialo desde la barra de direcciones: ${url}`);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-[1160px] gap-6 px-4 pt-4 pb-16 md:px-10 md:pt-6">
      <Link
        to="/mapa"
        search={{ sel: event.id }}
        className="text-accent-primary inline-flex items-center gap-1.5 justify-self-start text-sm font-medium hover:underline"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Volver al mapa (conserva filtros y selección)
      </Link>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="grid gap-7">
          <header className="grid gap-2.5">
            <span className="text-text-secondary inline-flex items-center gap-1.5 font-mono text-[13px]">
              <Icon className="size-3.5" aria-hidden />
              {CATEGORY_LABELS[event.category]} · {event.id}
            </span>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight text-pretty md:text-3xl">
              {event.title}
            </h1>
            <p className="text-text-secondary">
              {locality}
              {event.place.reference ? ` · ${event.place.reference}` : ""} ·{" "}
              {formatOccurred(event.occurredAt)}
            </p>
            {/* Four independent dimensions: never merged into one "verified" badge. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1">
                <span className="text-text-secondary text-[13px]">Origen:</span>
                <OriginBadge origin={event.origin} />
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-text-secondary text-[13px]">Revisión:</span>
                <ReviewBadge status={event.reviewStatus} />
              </span>
              <span className="border-border bg-card text-text-secondary inline-flex items-center rounded-md border px-2 py-0.5 text-[13px]">
                Publicación: {PUBLICATION_LABELS[event.publicationStatus]}
              </span>
              <SituationBadge status={event.situationStatus} />
              {event.isDemo && <DemoBadge />}
            </div>
            <p className="text-text-secondary text-[13px]">
              Última actualización {formatDateTime(event.lastUpdatedAt)} (
              {formatRelative(event.lastUpdatedAt, now)})
            </p>
            {event.severity && (
              <p className="text-sm">
                <strong className="font-medium">Severidad según la fuente emisora:</strong>{" "}
                {event.severity.level} · {event.severity.issuer}. No la determina la cantidad de
                fotos ni de aportes.
              </p>
            )}
            {approx && (
              <p className="text-status-warning inline-flex items-center gap-1.5 text-[13px]">
                <CircleDashed className="size-3.5 shrink-0" aria-hidden />
                {precision === "district"
                  ? "Ubicación conocida solo a nivel de distrito"
                  : "Ubicación aproximada declarada por el autor"}
              </p>
            )}
          </header>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg" className="h-10 px-4 text-sm" onClick={() => setContributeOpen(true)}>
              <Camera aria-hidden /> Aportar evidencia
            </Button>
            <a
              href="#fuentes"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-10 px-4 text-sm",
              )}
            >
              <Link2 aria-hidden /> Ver fuentes
            </a>
            <Button variant="ghost" size="lg" className="h-10 px-4 text-sm" onClick={share}>
              <Share2 aria-hidden /> Compartir
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="h-10 px-4 text-sm"
              onClick={() => setIssueOpen(true)}
            >
              <Flag aria-hidden /> Informar un error
            </Button>
            {event.hasOpenNeeds && (
              <a
                href="/ayudar"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-status-positive text-status-positive h-10 px-4 text-sm",
                )}
              >
                <HandHeart aria-hidden /> Cómo ayudar
              </a>
            )}
          </div>
          {shareMsg && (
            <p
              role="status"
              className="bg-accent-primary-quiet text-accent-primary rounded-lg px-3.5 py-2.5 text-sm"
            >
              {shareMsg}
            </p>
          )}

          <SignalBar eventId={event.id} now={now} />

          <section className="grid gap-2" aria-labelledby="que-se-sabe">
            <h2 id="que-se-sabe" className={h2}>
              Qué se sabe
            </h2>
            <p className="text-pretty">{event.description}</p>
            <p className="text-text-secondary text-[13px]">
              Este resumen solo cambia si existe una nueva versión respaldada. Las evidencias no
              modifican el estado del evento por sí solas.
            </p>
          </section>

          <section className="grid gap-3" aria-labelledby="evidencias">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h2 id="evidencias" className={h2}>
                Evidencias
              </h2>
              <span className="text-text-secondary text-[13px]">
                {evidence.length} {evidence.length === 1 ? "aporte" : "aportes"} · no son
                verificaciones
              </span>
            </div>
            {evidence.length === 0 ? (
              <p className="text-text-secondary text-sm">
                {event.origin === "official"
                  ? "Este registro proviene de una publicación de fuente; no tiene aportes ciudadanos."
                  : "Todavía no hay aportes publicados en este evento. Puedes ser la primera persona en aportar."}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {evidence.map((e) => (
                  <EvidenceCard key={e.id} e={e} />
                ))}
              </div>
            )}
          </section>

          <section id="fuentes" className="grid scroll-mt-20 gap-3" aria-labelledby="fuentes-h">
            <h2 id="fuentes-h" className={h2}>
              Fuentes
            </h2>
            {sources.length === 0 ? (
              <p className="text-text-secondary text-sm">
                Sin publicaciones oficiales vinculadas. Un reporte ciudadano no se convierte en
                información oficial.
              </p>
            ) : (
              sources.map((n) => (
                <div
                  key={n.id}
                  className="border-border-subtle grid gap-1 rounded-xl border p-3.5 text-sm"
                >
                  <span className="font-medium">{n.institution}</span>
                  <span className="text-text-secondary">
                    Identificador {n.externalId} · Publicado por la fuente{" "}
                    {formatDateTime(n.issuedAt)} · Consultado por nosotros{" "}
                    {formatDateTime(n.fetchedAt)}
                  </span>
                  {n.url ? (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-primary hover:underline"
                    >
                      Ver publicación original
                    </a>
                  ) : (
                    <span className="text-status-warning">
                      {n.isDemo ? "Fuente simulada, " : ""}enlace no disponible
                    </span>
                  )}
                </div>
              ))
            )}
          </section>

          <section className="grid gap-3" aria-labelledby="que-cambio">
            <h2 id="que-cambio" className={h2}>
              Qué cambió
            </h2>
            <ol className="grid">
              {changes.map((c) => (
                <li key={c.id} className="grid grid-cols-[12px_1fr] gap-3 text-sm">
                  <span className="grid justify-items-center" aria-hidden>
                    <span
                      className={cn("mt-[7px] size-2 rounded-full", ACTIVITY_DOT_CLASS[c.type])}
                    />
                    <span className="bg-border-subtle w-px flex-1" />
                  </span>
                  <span className="grid gap-0.5 pb-4">
                    <span>
                      <strong className="font-medium">{c.typeLabel}</strong> · {c.actor} (
                      {c.roleLabel})
                    </span>
                    <span className="text-text-secondary">{c.text}</span>
                    <time dateTime={c.at.toISOString()} className="text-text-tertiary text-xs">
                      {formatDateTime(c.at)}
                    </time>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {needs.length > 0 && (
            <section className="grid gap-3" aria-labelledby="necesidades">
              <h2 id="necesidades" className={h2}>
                Necesidades relacionadas
              </h2>
              {needs.map(({ need, organization }) => (
                <div
                  key={need.id}
                  className="border-status-positive bg-status-positive-quiet grid gap-1 rounded-xl border p-3.5 text-sm"
                >
                  <span className="font-medium">{need.title}</span>
                  <span className="text-text-secondary">
                    Responsable: {organization?.name ?? "Organización no disponible"} · Destino:{" "}
                    {need.destinationTerritory.name}, {need.destinationTerritory.departmentName} ·
                    {need.deadline ? `Vence ${formatDateTime(need.deadline)}` : "Sin fecha límite"}{" "}
                    · Estado: abierta
                  </span>
                  <a href="/ayudar" className="text-status-positive font-medium hover:underline">
                    Ver cómo entregar
                  </a>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="grid gap-4 lg:sticky lg:top-4" aria-label="Ubicación, revisión y autoría">
          <div className="border-border-subtle overflow-hidden rounded-xl border">
            <div className="bg-surface-quiet h-[220px]">
              {mounted && hasMapCenter ? (
                <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
                  <EventLocationMap
                    precision={precision}
                    point={event.place.point}
                    centroid={districtCentroid}
                  />
                </Suspense>
              ) : hasMapCenter ? (
                <Skeleton className="h-full w-full rounded-none" />
              ) : (
                <p className="text-text-secondary flex h-full items-center justify-center p-4 text-center text-sm">
                  No tenemos una referencia para dibujar el mapa.
                </p>
              )}
            </div>
            <div className="grid gap-1 p-3.5 text-[13px]">
              <span className="font-medium">Dónde</span>
              <span className="text-text-secondary">{locality}</span>
              <span className="text-text-secondary">
                {PRECISION_LABELS[precision]}. {PRECISION_TEXT[precision]}
              </span>
              <Link
                to="/mapa"
                search={{ sel: event.id }}
                className="text-accent-primary hover:underline"
              >
                Abrir en el mapa
              </Link>
            </div>
          </div>

          <ReviewNote decisions={decisions} />

          <div className="border-border-subtle grid gap-1.5 rounded-xl border p-3.5 text-[13px]">
            <span className="text-text-secondary text-[11px] font-medium tracking-wider uppercase">
              Autoría
            </span>
            <span>
              {event.author.displayName} · rol: {ORIGIN_ROLE[event.author.role]}
            </span>
            <span className="text-text-secondary">
              No se muestran contactos personales ni coordenadas privadas del autor.
            </span>
          </div>
        </aside>
      </div>

      <ContributeSheet
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        eventId={event.id}
        eventTitle={event.title}
        isAuthenticated={isAuthenticated}
        returnTo={returnTo}
      />
      <ReportIssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        eventId={event.id}
        isAuthenticated={isAuthenticated}
        returnTo={returnTo}
      />
    </main>
  );
}

const ORIGIN_ROLE = {
  citizen: "Ciudadano",
  organization: "Organización",
  moderator: "Revisión",
  official: "Fuente oficial",
} as const;
