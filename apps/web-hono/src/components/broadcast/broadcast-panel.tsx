import { useState } from "react";
import { Button, Skeleton } from "@emergency-map/web-ui";
import { Ban, Check as CheckIcon, Copy, Unplug, X } from "lucide-react";

import { DemoBadge } from "../event/demo-badge";
import { StatusChip, type ChipTone } from "../sources/status-chip";
import {
  buildShareText,
  isRetracted,
  isStale,
  runChecks,
  type Draft,
  type DraftStatus,
} from "./draft-logic";
import { useDrafts } from "./use-drafts";
import { CATEGORY_LABELS, DEMO_LABEL, REVIEW_LABELS, formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STATUS: Record<DraftStatus, { label: string; tone: ChipTone }> = {
  ready: { label: "Listo para revisar", tone: "neutral" },
  prepared: { label: "Borrador preparado", tone: "neutral" },
  approved: { label: "Aprobado (sin envío)", tone: "positive" },
  retraction_pending: { label: "Pendiente por retractación", tone: "warning" },
};

interface DraftState {
  text?: string;
  regenerated?: boolean;
  approved?: boolean;
  copied?: boolean;
}

function statusOf(d: Draft, s: DraftState): DraftStatus {
  if (isRetracted(d.event)) return "retraction_pending";
  if (s.approved) return "approved";
  return s.copied ? "prepared" : "ready";
}

/** Broadcast drafts (design "Difusión"). Produces drafts only; nothing is published anywhere. */
export function BroadcastPanel() {
  const { data: drafts, isPending, isError, refetch } = useDrafts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, DraftState>>({});

  if (isPending) return <Skeleton className="m-6 h-96 rounded-xl" aria-busy="true" />;
  if (isError || !drafts) {
    return (
      <div role="alert" className="m-6 rounded-xl border border-border-subtle p-4 text-sm">
        No pudimos cargar los borradores.{" "}
        <button type="button" className="font-medium text-primary" onClick={() => refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  const patch = (id: string, p: DraftState) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  const cur = drafts.find((d) => d.id === selectedId) ?? drafts[0];
  if (!cur) {
    return (
      <p className="m-6 rounded-xl border border-dashed border-border p-5 text-sm text-text-secondary">
        No hay borradores de difusión. Los borradores se generan desde eventos publicados.
      </p>
    );
  }
  const s = states[cur.id] ?? {};
  const retracted = isRetracted(cur.event);
  const stale = isStale(cur, !!s.regenerated);
  const text = s.text ?? (s.regenerated ? buildShareText(cur.event) : cur.text);
  const status = statusOf(cur, s);
  const checks = runChecks(text);
  const e = cur.event;
  const locality = [e.place.territory.name, e.place.territory.departmentName]
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .join(", ");

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard may be blocked; the state below still records that the text was prepared.
    }
    patch(cur.id, { copied: true });
  };

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_minmax(0,1fr)]">
      <section className="border-b border-border-subtle lg:border-b-0 lg:border-r">
        <div className="grid gap-2 px-5 pb-3 pt-5">
          <h1 className="m-0 text-[22px] font-semibold tracking-tight">Borradores de difusión</h1>
          <p className="m-0 flex items-center gap-2 rounded-lg bg-warning-bg px-3 py-2 text-[13px] text-warning">
            <Unplug className="size-3.5 shrink-0" aria-hidden />
            Cuentas no conectadas. Solo se preparan borradores.
          </p>
        </div>
        <ul className="m-0 grid list-none p-0">
          {drafts.map((d) => {
            const st = STATUS[statusOf(d, states[d.id] ?? {})];
            const active = d.id === cur.id;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => setSelectedId(d.id)}
                  className={cn(
                    "grid w-full gap-1 border-b border-l-[3px] border-b-border-subtle px-5 py-3 text-left hover:bg-surface-hover",
                    active ? "border-l-primary bg-accent-primary-quiet" : "border-l-transparent",
                  )}
                >
                  <span className="flex justify-between font-mono text-xs text-text-secondary">
                    <span>
                      {d.id} · v{d.generatedVersion}
                    </span>
                    <span>{d.network}</span>
                  </span>
                  <span className="text-sm font-medium leading-snug">{d.event.title}</span>
                  <StatusChip tone={st.tone} dot className="justify-self-start">
                    {st.label}
                  </StatusChip>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid min-w-0 xl:grid-cols-2">
        <div className="flex flex-col gap-4 p-5 xl:border-r xl:border-border-subtle xl:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="m-0 text-[17px] font-semibold">Texto · {cur.network}</h2>
            <StatusChip tone={STATUS[status].tone} dot>
              {STATUS[status].label}
            </StatusChip>
          </div>
          {stale && !retracted && (
            <div
              role="alert"
              className="grid gap-2 rounded-lg bg-warning-bg p-3 text-[13px] text-warning"
            >
              <strong className="font-medium">
                El evento cambió desde que se generó este borrador
              </strong>
              <span>
                Desde la versión {cur.generatedVersion} cambió el estado de revisión de «
                {REVIEW_LABELS[cur.generatedReviewStatus]}» a «{REVIEW_LABELS[e.reviewStatus]}».
              </span>
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => patch(cur.id, { regenerated: true, text: undefined })}
                >
                  Regenerar
                </Button>
              </div>
            </div>
          )}
          {retracted && (
            <div
              role="alert"
              className="grid gap-1 rounded-lg bg-status-danger-quiet p-3 text-[13px] text-status-danger"
            >
              <strong className="font-medium">El evento fue retirado de la vista pública</strong>
              <span>
                Este borrador quedó pendiente. Si hubo difusión previa, se debe crear una tarea de
                corrección. «Retirado del mapa» no significa «borrado de todas las redes».
              </span>
            </div>
          )}
          <div className="grid gap-1">
            <label htmlFor="draft-text" className="sr-only">
              Texto del borrador
            </label>
            <textarea
              id="draft-text"
              rows={9}
              value={
                retracted
                  ? "(Borrador bloqueado: el evento fue retirado de la vista pública.)"
                  : text
              }
              disabled={retracted}
              onChange={(ev) => patch(cur.id, { text: ev.target.value, copied: false })}
              className="w-full rounded-lg border border-border-strong bg-surface-card p-3 text-sm disabled:opacity-60"
            />
            <span className="text-xs text-text-secondary">{text.length} caracteres</span>
          </div>
          <div className="grid gap-1.5 text-[13px] text-text-secondary">
            <span className="font-medium text-text-primary">Comprobaciones</span>
            {[...checks, { label: "Marca «Demostración»", ok: text.includes(DEMO_LABEL) }].map(
              (c) => (
                <span key={c.label} className="flex items-center gap-1.5">
                  {c.ok ? (
                    <CheckIcon className="size-3.5 text-status-positive" aria-hidden />
                  ) : (
                    <X className="size-3.5 text-status-danger" aria-hidden />
                  )}
                  {c.label}
                  <span className="sr-only">{c.ok ? ": sí" : ": falta"}</span>
                </span>
              ),
            )}
            <span className="flex items-center gap-1.5 text-text-tertiary">
              <Ban className="size-3.5" aria-hidden />
              Sin cifras de afectados ni llamados a donar sin necesidad confirmada
            </span>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
            <Button onClick={copy} disabled={retracted}>
              <Copy className="size-4" aria-hidden />
              Copiar texto
            </Button>
            <Button
              variant="outline"
              onClick={() => patch(cur.id, { approved: true })}
              disabled={retracted || stale || !!s.approved}
            >
              <CheckIcon className="size-4" aria-hidden />
              {s.approved ? "Aprobado" : stale ? "Regenera antes de aprobar" : "Aprobar borrador"}
            </Button>
            <span
              className="text-xs text-text-secondary sm:ml-auto"
              title="Publicar directamente queda fuera del MVP sin integración, permisos y revisión explícita"
            >
              Publicar: no disponible sin integración
            </span>
          </div>
          {s.copied && (
            <span role="status" className="text-[13px] text-primary">
              Texto copiado. Estado: «Borrador preparado». No se envió a ninguna red.
            </span>
          )}
        </div>

        <div className="grid content-start gap-3 bg-surface-secondary p-5 xl:p-6">
          <h2 className="m-0 text-[17px] font-semibold">Vista previa de tarjeta</h2>
          <div className="max-w-[480px] overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-sm">
            <div className="relative flex aspect-[1.91/1] items-end bg-surface-quiet p-4">
              {e.isDemo && (
                <span className="absolute left-3 top-3 rounded bg-surface-inverse px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-text-inverse">
                  {DEMO_LABEL}
                </span>
              )}
              <span className="rounded-lg bg-surface-card/90 px-2.5 py-2 text-xs text-text-secondary">
                Sin imagen: las fotografías requieren disponibilidad y permiso de uso.
              </span>
            </div>
            <div className="grid gap-1.5 px-4 py-3.5">
              <span className="text-xs text-text-secondary">
                {CATEGORY_LABELS[e.category]} · {locality}
              </span>
              <strong className="text-base font-semibold leading-tight">{e.title}</strong>
              <span className="text-[13px] text-text-secondary">
                {formatDateTime(e.occurredAt.start)} · {REVIEW_LABELS[e.reviewStatus]} · Fuente:{" "}
                {e.origin === "official" ? "Fuente oficial" : "Reportes ciudadanos"}
              </span>
              <span className="font-mono text-xs text-primary">
                andes-alerta.ejemplo/eventos/{e.id}
              </span>
              {e.isDemo && <DemoBadge className="justify-self-start" />}
            </div>
          </div>
          <p className="m-0 max-w-[480px] text-xs text-text-secondary">
            La tarjeta incorpora fecha y estado y enlaza a la ficha vigente; no queda como
            afirmación atemporal. Si el evento cambia, el borrador debe regenerarse antes de
            aprobarse.
          </p>
        </div>
      </div>
    </div>
  );
}
