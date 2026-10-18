import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@emergency-map/web-ui";
import {
  CORROBORATION_DECISIONS,
  PUBLICATION_DECISIONS,
  RELATION_DECISIONS,
  type CorroborationDecision,
  type PublicationDecision,
  type RelationDecision,
} from "@emergency-map/domain/constants";

import {
  CLOSURE_ACTION_LABEL,
  CLOSURE_SUMMARY,
  CORROBORATION_ACTION_LABELS,
  CORROBORATION_SUMMARIES,
  DIMENSION_LABELS,
  PUBLICATION_ACTION_LABELS,
  PUBLICATION_SUMMARIES,
  RELATION_ACTION_LABELS,
  RELATION_SUMMARIES,
  type Dimension,
} from "./review-labels";
import {
  asStaleVersion,
  type DuplicateCandidate,
  type ReviewCase,
  type StaleVersionInfo,
} from "./use-review-data";
import { client } from "@/lib/orpc-client";
import { cn } from "@/lib/utils";

const DIMENSIONS: Dimension[] = ["publication", "corroboration", "relation", "closure"];
const MIN_REASON = 8;

interface Props {
  eventId: string;
  /** The version the moderator is looking at. Every decision carries it (ADR 0004). */
  reviewedSeq: number;
  /** True when the loaded version is no longer current; decisions stay blocked. */
  blocked: boolean;
  evidence: ReviewCase["evidence"];
  duplicates: DuplicateCandidate[];
  onStale: (info: StaleVersionInfo) => void;
  onDecided: () => void;
}

interface Form {
  action: string;
  publicReason: string;
  privateNote: string;
  aspectsChecked: string;
  limits: string;
  officialNoticeId: string;
  otherEventId: string;
  evidenceIds: string[];
  sourceDescription: string;
  sourceUrl: string;
}

const EMPTY: Form = {
  action: "",
  publicReason: "",
  privateNote: "",
  aspectsChecked: "",
  limits: "",
  officialNoticeId: "",
  otherEventId: "",
  evidenceIds: [],
  sourceDescription: "",
  sourceUrl: "",
};

function Radios<T extends string>({
  legend,
  options,
  labels,
  value,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: string;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {options.map((o) => (
        <label
          key={o}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
            value === o ? "border-primary bg-brand-soft" : "border-border",
          )}
        >
          <input type="radio" name={legend} checked={value === o} onChange={() => onChange(o)} />
          {labels[o]}
        </label>
      ))}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function DecisionPanel({
  eventId,
  reviewedSeq,
  blocked,
  evidence,
  duplicates,
  onStale,
  onDecided,
}: Props) {
  const qc = useQueryClient();
  const [dimension, setDimension] = useState<Dimension>("publication");
  const [form, setForm] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const base = {
    eventId,
    versionSeq: reviewedSeq,
    publicReason: form.publicReason.trim(),
    privateNote: form.privateNote.trim() || null,
  };

  const mutation = useMutation({
    mutationFn: async () => {
      switch (dimension) {
        case "publication":
          return client.review.decidePublication({
            ...base,
            decision: form.action as PublicationDecision,
          });
        case "corroboration": {
          const d = form.action as CorroborationDecision;
          return client.review.decideCorroboration({
            ...base,
            decision: d,
            aspectsChecked: form.aspectsChecked.trim() ? [form.aspectsChecked.trim()] : [],
            limits: form.limits.trim() || null,
            citedEvidenceIds: form.evidenceIds,
            officialNoticeId: form.officialNoticeId.trim() || null,
          });
        }
        case "relation":
          return client.review.decideRelation({
            ...base,
            decision: form.action as RelationDecision,
            otherEventId: form.otherEventId.trim(),
            evidenceIds: form.action === "split" ? form.evidenceIds : [],
          });
        case "closure":
          return client.review.reportClosure({
            ...base,
            sourceUrl: form.sourceUrl.trim() || null,
            sourceDescription: form.sourceDescription.trim(),
          });
      }
    },
    onSuccess: () => {
      const label = actionLabel();
      setDone(label);
      setForm(EMPTY);
      setTouched(false);
      toast.success("Decisión registrada");
      qc.invalidateQueries({ queryKey: ["review"] });
      onDecided();
    },
    onError: (error) => {
      const stale = asStaleVersion(error);
      if (stale) {
        onStale(stale);
        return;
      }
      toast.error(error instanceof Error ? error.message : "No se pudo registrar la decisión");
    },
  });

  function actionLabel(): string {
    switch (dimension) {
      case "publication":
        return PUBLICATION_ACTION_LABELS[form.action as PublicationDecision] ?? "";
      case "corroboration":
        return CORROBORATION_ACTION_LABELS[form.action as CorroborationDecision] ?? "";
      case "relation":
        return RELATION_ACTION_LABELS[form.action as RelationDecision] ?? "";
      case "closure":
        return CLOSURE_ACTION_LABEL;
    }
  }

  const action = dimension === "closure" ? "closure" : form.action;
  const needsLimits =
    dimension === "corroboration" &&
    (action === "corroborate_aspects" || action === "link_official_backing");
  const needsOfficial = dimension === "corroboration" && action === "link_official_backing";
  const reasonOk = form.publicReason.trim().length >= MIN_REASON;
  const valid =
    !!action &&
    reasonOk &&
    (!needsLimits || (form.aspectsChecked.trim() && form.limits.trim())) &&
    (!needsOfficial || form.officialNoticeId.trim()) &&
    (dimension !== "relation" ||
      (form.otherEventId.trim() && (action !== "split" || form.evidenceIds.length > 0))) &&
    (dimension !== "closure" || form.sourceDescription.trim());
  const disabled = blocked || !valid || mutation.isPending;
  const destructive = dimension === "publication" && (action === "reject" || action === "withdraw");

  const summary =
    dimension === "publication"
      ? PUBLICATION_SUMMARIES[action as PublicationDecision]
      : dimension === "corroboration"
        ? CORROBORATION_SUMMARIES[action as CorroborationDecision]
        : dimension === "relation"
          ? RELATION_SUMMARIES[action as RelationDecision]
          : CLOSURE_SUMMARY;

  const toggleEv = (id: string) =>
    set({
      evidenceIds: form.evidenceIds.includes(id)
        ? form.evidenceIds.filter((x) => x !== id)
        : [...form.evidenceIds, id],
    });

  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-[17px] font-semibold">Decisión</h2>
        <p className="text-xs text-muted-foreground">
          Cuatro decisiones independientes. Publicar no corrobora; vencer no cierra.
        </p>
      </div>

      {done && (
        <div className="mx-5 mt-4 grid gap-1.5 rounded-lg bg-status-positive-quiet p-3 text-[13px] text-status-positive">
          <strong className="font-medium">Decisión registrada</strong>
          <span>{done}</span>
          <span className="text-muted-foreground">
            Se guardaron actor, fecha y versión {reviewedSeq}.
          </span>
          <Link to="/revision" className="font-medium text-primary">
            Volver a la cola
          </Link>
        </div>
      )}

      <div className="grid content-start gap-5 overflow-auto px-5 py-4">
        <div
          role="tablist"
          aria-label="Tipo de decisión"
          className="grid grid-cols-2 gap-1 rounded-lg border border-border p-0.5"
        >
          {DIMENSIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={dimension === d}
              onClick={() => {
                setDimension(d);
                setForm(EMPTY);
                setTouched(false);
                setDone(null);
              }}
              className={cn(
                "rounded-md px-2 py-1.5 text-[13px] font-medium",
                dimension === d ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              {DIMENSION_LABELS[d]}
            </button>
          ))}
        </div>

        {dimension === "publication" && (
          <Radios
            legend="Publicación"
            options={PUBLICATION_DECISIONS}
            labels={PUBLICATION_ACTION_LABELS}
            value={form.action}
            onChange={(v) => set({ action: v })}
          />
        )}

        {dimension === "corroboration" && (
          <>
            <Radios
              legend="Corroboración"
              options={CORROBORATION_DECISIONS}
              labels={CORROBORATION_ACTION_LABELS}
              value={form.action}
              onChange={(v) => set({ action: v })}
            />
            <Field
              label={`Qué se comprobó exactamente${needsLimits ? "" : " (opcional)"}`}
              hint="Un moderador no se convierte en fuente oficial por pulsar un botón."
            >
              <Input
                value={form.aspectsChecked}
                onChange={(e) => set({ aspectsChecked: e.target.value })}
                placeholder="Ej.: coincidencia territorial de dos aportes"
                className="h-9"
              />
            </Field>
            <Field label={`Qué sigue incierto${needsLimits ? "" : " (opcional)"}`}>
              <Input
                value={form.limits}
                onChange={(e) => set({ limits: e.target.value })}
                className="h-9"
              />
            </Field>
            {needsOfficial && (
              <Field label="ID del aviso oficial">
                <Input
                  value={form.officialNoticeId}
                  onChange={(e) => set({ officialNoticeId: e.target.value })}
                  className="h-9"
                />
              </Field>
            )}
            {evidence.length > 0 && (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1 text-sm font-medium">Evidencia citada (opcional)</legend>
                {evidence.map((ev) => (
                  <label key={ev.id} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.evidenceIds.includes(ev.id)}
                      onChange={() => toggleEv(ev.id)}
                    />
                    <span className="font-mono">{ev.id}</span>
                  </label>
                ))}
              </fieldset>
            )}
          </>
        )}

        {dimension === "relation" && (
          <>
            <Radios
              legend="Relación"
              options={RELATION_DECISIONS}
              labels={RELATION_ACTION_LABELS}
              value={form.action}
              onChange={(v) => set({ action: v })}
            />
            <Field label="ID del otro evento">
              <Input
                value={form.otherEventId}
                onChange={(e) => set({ otherEventId: e.target.value })}
                placeholder="Ej.: DEMO-01"
                className="h-9"
              />
            </Field>
            {duplicates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {duplicates.map((d) => (
                  <button
                    key={d.event.id}
                    type="button"
                    onClick={() => set({ otherEventId: d.event.id })}
                    className="rounded-md border border-border px-2 py-1 font-mono text-xs"
                  >
                    Usar {d.event.id}
                  </button>
                ))}
              </div>
            )}
            {action === "split" && (
              <fieldset className="grid gap-1.5">
                <legend className="mb-1 text-sm font-medium">Evidencia a separar</legend>
                {evidence.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Este caso no tiene evidencia.
                  </span>
                )}
                {evidence.map((ev) => (
                  <label key={ev.id} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.evidenceIds.includes(ev.id)}
                      onChange={() => toggleEv(ev.id)}
                    />
                    <span className="font-mono">{ev.id}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {action === "merge" && form.otherEventId.trim() && (
              <div className="grid gap-1 rounded-lg border border-border bg-surface-secondary p-3 text-[13px]">
                <strong className="font-medium">Previsualización de la fusión</strong>
                <span>
                  Registro principal: {form.otherEventId.trim()}. La evidencia de {eventId} se
                  conserva como evidencia del registro principal. El enlace /eventos/{eventId}{" "}
                  redirigirá con explicación. El conteo de eventos no suma; el historial no se
                  borra.
                </span>
              </div>
            )}
          </>
        )}

        {dimension === "closure" && (
          <>
            <Field
              label="Fuente del cierre"
              hint="Nunca se cierra automáticamente un hecho porque venció un aviso."
            >
              <Input
                value={form.sourceDescription}
                onChange={(e) => set({ sourceDescription: e.target.value })}
                placeholder="Institución o publicación que comunica el cierre"
                className="h-9"
              />
            </Field>
            <Field label="Enlace a la fuente (opcional)">
              <Input
                type="url"
                value={form.sourceUrl}
                onChange={(e) => set({ sourceUrl: e.target.value })}
                placeholder="https://"
                className="h-9"
              />
            </Field>
          </>
        )}

        <Field label="Motivo público (se notificará al autor)">
          <Textarea
            rows={3}
            value={form.publicReason}
            onChange={(e) => {
              set({ publicReason: e.target.value });
              setTouched(true);
            }}
            aria-invalid={touched && !reasonOk}
            placeholder="Comprensible y sin acusaciones. Ej.: «Fecha no comprobada»."
          />
          {touched && !reasonOk && (
            <span className="text-xs font-normal text-error">
              El motivo público es obligatorio (mínimo {MIN_REASON} caracteres).
            </span>
          )}
        </Field>
        <Field label="Nota privada de moderación (no se notifica)">
          <Textarea
            rows={2}
            value={form.privateNote}
            onChange={(e) => set({ privateNote: e.target.value })}
            placeholder="Solo visible para el equipo"
          />
        </Field>

        {action && summary && (
          <div className="grid gap-1 rounded-lg bg-brand-soft p-3 text-[13px]">
            <strong className="font-medium">Consecuencias</strong>
            <span>{summary}</span>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border px-5 py-4">
        <span className="text-xs text-muted-foreground">
          Se guardan actor, fecha y versión {reviewedSeq}.
        </span>
        <Button
          size="lg"
          variant={destructive ? "destructive" : "default"}
          disabled={disabled}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Guardando…" : action ? actionLabel() : "Elige una acción"}
        </Button>
      </div>
    </div>
  );
}
