import { useState } from "react";
import { Skeleton } from "@emergency-map/web-ui";
import type { SourceHealth } from "@emergency-map/domain/constants";
import type { DataSource } from "@emergency-map/domain/schemas";
import { Info } from "lucide-react";

import { DemoBadge } from "../event/demo-badge";
import { StatusChip, type ChipTone } from "./status-chip";
import { useSources } from "./use-sources";
import { DEMO_LABEL, SOURCE_HEALTH_LABELS, formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";

const HEALTH: Record<SourceHealth, { tone: ChipTone; explain: string }> = {
  up_to_date: { tone: "positive", explain: "Datos al día según su frecuencia de publicación." },
  delayed: { tone: "warning", explain: "La fuente publica con menos frecuencia de la esperada." },
  stale: {
    tone: "warning",
    explain: "No hemos podido consultarla recientemente; el último dato fechado permanece.",
  },
  error: {
    tone: "danger",
    explain:
      "La última consulta falló. Se conserva el último dato fechado; el fenómeno puede continuar.",
  },
};

const fmt = (d: Date | null) => (d ? formatDateTime(d) : "Sin dato");

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-text-secondary">{label}</dt>
      <dd className="m-0">{children}</dd>
    </>
  );
}

function SourceCard({ source, internal }: { source: DataSource; internal: boolean }) {
  const health = HEALTH[source.health];
  return (
    <article className="grid gap-4 rounded-xl border border-border-subtle p-4 shadow-xs sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[17px] font-semibold">{source.name}</h2>
          <StatusChip tone={health.tone} dot>
            {SOURCE_HEALTH_LABELS[source.health]}
          </StatusChip>
          <StatusChip>
            {source.isDemo ? "Autoridad: institucional (simulada)" : "Autoridad: institucional"}
          </StatusChip>
          {source.isDemo && <DemoBadge />}
        </div>
        <dl className="m-0 grid grid-cols-1 gap-x-3 gap-y-1 text-sm sm:grid-cols-[200px_1fr] sm:gap-y-1.5">
          <Row label="Institución">{source.institution}</Row>
          <Row label="Tipo de información">{source.infoType}</Row>
          <Row label="Cobertura">{source.coverage}</Row>
          <Row label="Enlace original">
            {source.originalUrl ? (
              <a href={source.originalUrl} target="_blank" rel="noreferrer noopener">
                {source.originalUrl}
              </a>
            ) : (
              <span className="text-warning">Fuente simulada, enlace no disponible</span>
            )}
          </Row>
          <Row label="Última publicación conocida">{fmt(source.lastPublishedAt)}</Row>
          <Row label="Última consulta exitosa">{fmt(source.lastSuccessfulFetchAt)}</Row>
        </dl>
        <p className="m-0 text-[13px] text-text-secondary">{health.explain}</p>
      </div>
      {internal && (
        <div className="grid content-start gap-2 rounded-lg bg-surface-secondary p-3 text-[13px]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
            Interno
          </span>
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-2 gap-y-1">
            {[
              "Última ejecución",
              "Registros procesados",
              "Duplicados evitados",
              "Próximo intento",
            ].map((l) => (
              <Row key={l} label={l}>
                <span className="font-mono">—</span>
              </Row>
            ))}
          </dl>
          <p className="m-0 text-text-secondary">
            El detalle de ejecuciones todavía no está disponible en esta versión, y el reintento
            manual no está habilitado.
          </p>
          <span className="text-xs text-text-tertiary">
            No se muestran claves, tokens ni respuestas con datos privados.
          </span>
        </div>
      )}
    </article>
  );
}

/** Source status page (design "Fuentes"). `canSeeInternal` is true for reviewer/admin roles. */
export function SourcesPage({ canSeeInternal }: { canSeeInternal: boolean }) {
  const { data, isPending, isError, refetch } = useSources();
  const [view, setView] = useState<"publica" | "interna">("publica");
  const internal = canSeeInternal && view === "interna";

  return (
    <main className="mx-auto grid w-full max-w-5xl content-start gap-5 px-4 py-6 sm:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="grid gap-1">
          <h1 className="m-0 text-2xl font-semibold tracking-tight">Estado de las fuentes</h1>
          <p className="m-0 text-sm text-text-secondary">
            «Última consulta exitosa» es nuestra consulta; «última publicación conocida» es de la
            institución. Un retraso técnico no significa que el fenómeno terminó.
          </p>
        </div>
        {canSeeInternal && (
          <div
            role="group"
            aria-label="Vista"
            className="inline-flex shrink-0 rounded-lg border border-border-subtle p-0.5 text-sm"
          >
            {(
              [
                ["publica", "Vista pública"],
                ["interna", "Vista interna"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 font-medium",
                  view === value ? "bg-surface-quiet text-text-primary" : "text-text-secondary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {data?.fromDemoFallback && (
        <p
          role="status"
          className="m-0 flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-[13px] text-warning"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          No pudimos consultar la API de fuentes. Se muestran datos de {DEMO_LABEL.toLowerCase()},
          no el estado real.
        </p>
      )}

      {isPending && (
        <div className="grid gap-4" aria-busy="true">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      )}
      {isError && (
        <div role="alert" className="rounded-xl border border-border-subtle p-4 text-sm">
          No pudimos cargar las fuentes. Esto no significa que estén al día.{" "}
          <button type="button" className="font-medium text-primary" onClick={() => refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {data && data.sources.length === 0 && (
        <p className="m-0 rounded-xl border border-dashed border-border p-5 text-sm text-text-secondary">
          Todavía no hay fuentes registradas. Esto no significa que no haya información oficial.
        </p>
      )}
      {data?.sources.map((s) => (
        <SourceCard key={s.id} source={s} internal={internal} />
      ))}
    </main>
  );
}
