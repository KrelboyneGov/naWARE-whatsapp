import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button, Skeleton } from "@emergency-map/web-ui";

import { DecisionPanel } from "./decision-panel";
import { NoAccess } from "./review-gate";
import {
  DECISION_KIND_LABELS,
  EVIDENCE_TYPE_LABELS,
  EVIDENCE_VISIBILITY_LABELS,
  QUEUE_REASON_LABELS,
} from "./review-labels";
import {
  caseQueryOptions,
  duplicatesQueryOptions,
  isAccessError,
  queueQueryOptions,
  type CaseEvent,
  type ReviewCase,
  type StaleVersionInfo,
} from "./use-review-data";
import {
  DemoBadge,
  EmptyState,
  FreshnessLabel,
  OriginBadge,
  ReviewBadge,
} from "@/components/event";
import {
  CATEGORY_LABELS,
  PRECISION_LABELS,
  PUBLICATION_LABELS,
  formatDateTime,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

const NO_FILTERS = { publicationStatuses: [], reasons: [], assignedToMe: false };

export function ReviewCasePage({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const caseQuery = useQuery(caseQueryOptions(eventId));
  const queue = useQuery(queueQueryOptions(NO_FILTERS));
  const loaded = caseQuery.data?.data ?? null;

  // The version the moderator is looking at, pinned when the case loads or is reloaded on purpose.
  const [reviewedSeq, setReviewedSeq] = useState<number | null>(null);
  const [stale, setStale] = useState<StaleVersionInfo | null>(null);
  const [tab, setTab] = useState<"case" | "evidence">("case");

  useEffect(() => {
    if (loaded && reviewedSeq === null) setReviewedSeq(loaded.event.versionSeq);
  }, [loaded, reviewedSeq]);

  if (caseQuery.error && isAccessError(caseQuery.error)) return <NoAccess signedIn />;
  if (caseQuery.isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (!loaded || reviewedSeq === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <EmptyState
          title="No encontramos este caso"
          description="Puede haber sido fusionado o el enlace es incorrecto. Vuelve a la cola para ver los casos disponibles."
          action={
            <Link to="/revision" className="text-sm font-medium text-primary">
              Volver a la cola
            </Link>
          }
        />
      </div>
    );
  }

  const { event } = loaded;
  // Stale if the API said so, or if a background refresh shows a newer version than the pinned one.
  const currentSeq =
    stale?.currentSeq ?? (event.versionSeq !== reviewedSeq ? event.versionSeq : null);
  const isStale = stale !== null || event.versionSeq !== reviewedSeq;

  async function reload() {
    setStale(null);
    const fresh = await qc.fetchQuery({ ...caseQueryOptions(eventId), staleTime: 0 });
    setReviewedSeq(fresh.data?.event.versionSeq ?? null);
  }

  return (
    <div className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[260px_minmax(0,1fr)_400px]">
      <aside className="hidden border-r border-border xl:block" aria-label="Cola de revisión">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <Link
            to="/revision"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> Cola
          </Link>
          <span className="text-xs text-muted-foreground">
            {queue.data?.items.length ?? 0} casos
          </span>
        </div>
        {(queue.data?.items ?? []).map((q) => (
          <Link
            key={q.event.id}
            to="/revision/$id"
            params={{ id: q.event.id }}
            aria-current={q.event.id === eventId ? "page" : undefined}
            className={cn(
              "grid gap-0.5 border-b border-l-[3px] border-border px-4 py-3 hover:bg-surface-hover",
              q.event.id === eventId ? "border-l-primary bg-brand-soft" : "border-l-transparent",
            )}
          >
            <span className="font-mono text-xs text-muted-foreground">{q.event.id}</span>
            <span className="text-[13px] font-medium leading-snug">{q.event.title}</span>
            <span className="text-xs text-muted-foreground">{QUEUE_REASON_LABELS[q.reason]}</span>
          </Link>
        ))}
      </aside>

      <main className="grid min-w-0 content-start gap-6 px-4 py-6 md:px-7">
        <Link
          to="/revision"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary xl:hidden"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Cola
        </Link>

        {caseQuery.data?.source === "demo" && (
          <p role="status" className="rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning">
            No se pudo consultar el caso real. Se muestran datos de demostración; las decisiones se
            envían a la API y pueden fallar.
          </p>
        )}

        {isStale && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-bg px-3.5 py-3 text-sm text-warning"
          >
            <span>
              <strong className="font-medium">Otra persona actualizó este caso</strong>
              {currentSeq !== null && ` (ahora va en la versión ${currentSeq})`}. Estás viendo la
              versión {reviewedSeq}; las decisiones quedan bloqueadas hasta recargar.
            </span>
            <Button variant="outline" size="lg" onClick={reload}>
              Recargar
            </Button>
          </div>
        )}

        <CaseHeader event={event} reviewedSeq={reviewedSeq} />

        <div
          role="tablist"
          aria-label="Secciones del caso"
          className="flex gap-1 border-b border-border"
        >
          {(
            [
              ["case", "Caso"],
              ["evidence", `Evidencia (${loaded.evidence.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                tab === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "case" ? <CaseTab data={loaded} /> : <EvidenceTab evidence={loaded.evidence} />}
      </main>

      <aside
        className="border-t border-border bg-card lg:border-l lg:border-t-0"
        aria-label="Decisión"
      >
        <DecisionPanelWrapper
          eventId={eventId}
          reviewedSeq={reviewedSeq}
          blocked={isStale}
          data={loaded}
          onStale={setStale}
          onDecided={() => {
            qc.invalidateQueries({ queryKey: ["review"] }).then(() => reload());
          }}
        />
      </aside>
    </div>
  );
}

function DecisionPanelWrapper(props: {
  eventId: string;
  reviewedSeq: number;
  blocked: boolean;
  data: ReviewCase;
  onStale: (s: StaleVersionInfo) => void;
  onDecided: () => void;
}) {
  const duplicates = useQuery(duplicatesQueryOptions(props.data.event));
  return (
    <DecisionPanel
      eventId={props.eventId}
      reviewedSeq={props.reviewedSeq}
      blocked={props.blocked}
      evidence={props.data.evidence}
      duplicates={duplicates.data ?? []}
      onStale={props.onStale}
      onDecided={props.onDecided}
    />
  );
}

function CaseHeader({ event, reviewedSeq }: { event: CaseEvent; reviewedSeq: number }) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
        <span>{event.id}</span>
        <span>·</span>
        <span>Versión {reviewedSeq} en revisión</span>
        <span>·</span>
        <span>Recibido {formatDateTime(event.createdAt)}</span>
      </div>
      <h1 className="font-heading text-2xl font-semibold leading-tight">{event.title}</h1>
      <div className="flex flex-wrap items-center gap-1.5">
        <OriginBadge origin={event.origin} />
        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium">
          Publicación: {PUBLICATION_LABELS[event.publicationStatus]}
        </span>
        <ReviewBadge status={event.reviewStatus} />
        <FreshnessLabel status={event.situationStatus} />
        {event.isDemo && <DemoBadge />}
      </div>
      {event.mergedIntoEventId && (
        <p className="text-sm text-muted-foreground">
          Fusionado con{" "}
          <Link
            to="/revision/$id"
            params={{ id: event.mergedIntoEventId }}
            className="font-mono text-primary"
          >
            {event.mergedIntoEventId}
          </Link>
          .
        </p>
      )}
    </div>
  );
}

const sectionTitle = "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

function CaseTab({ data }: { data: ReviewCase }) {
  const { event } = data;
  const duplicates = useQuery(duplicatesQueryOptions(event));
  const t = event.place.territory;

  const history = [
    ...data.versions.map((v) => ({
      at: v.createdAt,
      type: `Versión ${v.seq}`,
      text: `${v.title} · ${PUBLICATION_LABELS[v.publicationStatus]}`,
    })),
    ...data.decisions.map((d) => ({
      at: d.decidedAt,
      type: DECISION_KIND_LABELS[d.kind],
      text: `${d.decision} (versión ${d.versionSeq}) · motivo público: «${d.publicReason}»${
        d.privateNote ? ` · nota privada: «${d.privateNote}»` : ""
      }`,
    })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const rows: Array<[string, React.ReactNode]> = [
    ["Categoría declarada", CATEGORY_LABELS[event.category]],
    ["Descripción original", event.description ? `«${event.description}»` : "Sin descripción"],
    [
      "Geometría y precisión",
      <>
        {PRECISION_LABELS[event.place.precision]}
        {event.place.point
          ? ` · ${event.place.point.lat.toFixed(4)}, ${event.place.point.lng.toFixed(4)}`
          : " · sin punto (solo distrito)"}
        {event.place.reference ? ` · ${event.place.reference}` : ""}
      </>,
    ],
    ["Localidad", [t.name, t.provinceName, t.departmentName].filter(Boolean).join(", ")],
    [
      "Hora observada",
      `${formatDateTime(event.occurredAt.start)} (precisión: ${event.occurredAt.precision})`,
    ],
    ["Autor", `${event.author.displayName} (${event.author.role})`],
    [
      "Aportes",
      `${event.contributionCount} (no equivale a ${event.contributionCount} verificaciones)`,
    ],
  ];

  return (
    <section className="grid gap-6">
      <dl className="grid gap-x-4 gap-y-2.5 text-sm sm:grid-cols-[180px_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="m-0">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-2">
        <span className={sectionTitle}>Posibles coincidencias</span>
        {(duplicates.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No se encontraron coincidencias. Esto no descarta que exista un duplicado.
          </p>
        ) : (
          duplicates.data!.map((d) => (
            <div
              key={d.event.id}
              className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-border p-3 text-[13px]"
            >
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">
                  {d.event.id} · {d.event.title}
                </span>
                <span className="text-muted-foreground">
                  {PUBLICATION_LABELS[d.event.publicationStatus]} ·{" "}
                  {d.approxDistanceKm === null
                    ? "distancia no calculable"
                    : `${d.approxDistanceKm.toFixed(1)} km`}{" "}
                  · {Math.round(d.hoursApart)} h de diferencia · {d.event.contributionCount}{" "}
                  aporte(s)
                </span>
              </span>
              <Link
                to="/revision/$id"
                params={{ id: d.event.id }}
                className="font-medium text-primary"
              >
                Abrir caso
              </Link>
            </div>
          ))
        )}
        <span className="text-xs text-muted-foreground">
          La coincidencia se calcula por categoría, distancia y tiempo. No determina por sí sola que
          sea el mismo evento.
        </span>
      </div>

      <div className="grid gap-1">
        <span className={sectionTitle}>Historial del caso</span>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
        ) : (
          history.map((h, i) => (
            <div
              key={i}
              className="grid gap-1 border-b border-border py-2 text-[13px] sm:grid-cols-[150px_1fr] sm:gap-3"
            >
              <span className="text-muted-foreground">{formatDateTime(h.at)}</span>
              <span>
                <strong className="font-medium">{h.type}</strong> · {h.text}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function EvidenceTab({ evidence }: { evidence: ReviewCase["evidence"] }) {
  if (evidence.length === 0) {
    return <EmptyState description="Este caso no tiene evidencia adjunta." />;
  }
  const yn = (v: boolean | null) => (v === null ? "No declarado" : v ? "Sí" : "No");
  return (
    <section className="grid gap-3">
      {evidence.map((ev) => (
        <article
          key={ev.id}
          className="grid gap-4 rounded-xl border border-border p-3.5 sm:grid-cols-[220px_1fr]"
        >
          <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted p-2 text-center text-xs text-muted-foreground">
            {ev.id} · {EVIDENCE_TYPE_LABELS[ev.type]}
            <br />
            {ev.storageKey ? "Original disponible según permisos" : "Sin archivo"}
          </div>
          <dl className="grid content-start gap-x-3 gap-y-1.5 text-[13px] sm:grid-cols-[150px_1fr]">
            {(
              [
                ["Descripción del autor", ev.description],
                [
                  "Fecha declarada",
                  ev.declaredCapturedAt ? (
                    <>
                      {formatDateTime(ev.declaredCapturedAt.start)}{" "}
                      <span className="text-muted-foreground">(no comprobada)</span>
                    </>
                  ) : (
                    "No declarada"
                  ),
                ],
                ["Fecha de carga", formatDateTime(ev.receivedAt)],
                [
                  "Observación directa",
                  <>
                    {yn(ev.observedPersonally)}{" "}
                    <span className="text-muted-foreground">(declaración, no comprobada)</span>
                  </>,
                ],
                [
                  "Derechos declarados",
                  ev.ownsImage === null
                    ? "No declarados"
                    : ev.ownsImage
                      ? "Imagen propia"
                      : "No es imagen propia",
                ],
                ["Visibilidad", EVIDENCE_VISIBILITY_LABELS[ev.visibility]],
                [
                  "Archivo repetido",
                  ev.duplicateOfEvidenceId
                    ? `Mismo archivo que ${ev.duplicateOfEvidenceId}; no cuenta como aporte independiente.`
                    : "Sin coincidencias de archivo. La comparación de archivos no es un detector de falsedad.",
                ],
              ] as Array<[string, React.ReactNode]>
            ).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="m-0">{v}</dd>
              </div>
            ))}
            {ev.url && (
              <div className="contents">
                <dt className="text-muted-foreground">Enlace</dt>
                <dd className="m-0 break-all">
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary"
                  >
                    {ev.url}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </article>
      ))}
    </section>
  );
}
