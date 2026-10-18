import type { SubmitReportInput } from "@emergency-map/domain/schemas";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, CheckCircle2, TriangleAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  buttonVariants,
  cn,
} from "@emergency-map/web-ui";
import { DEMO_EVENTS, DEMO_TERRITORIES } from "@emergency-map/domain/demo";
import { PUBLICATION_LABELS } from "@/lib/labels";
import {
  EMPTY_DRAFT,
  clearDraft,
  isDraftEmpty,
  loadDraft,
  saveDraft,
  type ReportDraft,
} from "@/lib/report-draft";
import { client } from "@/lib/orpc-client";
import {
  buildSubmitInput,
  findDuplicates,
  validateStep1,
  validateStep2,
  type FieldErrors,
} from "./report-logic";
import { StepEvidence, type EvidenceItem } from "./step-evidence";
import { StepReview } from "./step-review";
import { StepWhat } from "./step-what";
import { StepWhere } from "./step-where";

const STEPS = ["Qué pasó", "Dónde y cuándo", "Evidencia", "Revisar y enviar"] as const;

type SubmitResult = { id: string; simulated: boolean };

/** Sends the report to POST /api/v1/events. Input was validated with submitReportInputSchema. */
async function submitReport(input: SubmitReportInput): Promise<SubmitResult> {
  const res = await client.events.submit(input);
  if (!res.data) throw new Error(res.error?.message ?? "No pudimos enviar el reporte");
  return { id: res.data.id, simulated: false };
}

export function ReportForm({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const evidenceRef = useRef(evidence);
  evidenceRef.current = evidence;

  useEffect(() => {
    const saved = loadDraft();
    if (saved && !isDraftEmpty(saved)) {
      setDraft(saved);
      setRestored(true);
    }
    setHydrated(true);
  }, []);

  // Autosave text fields once the stored draft has been read.
  useEffect(() => {
    if (!hydrated || result) return;
    const t = setTimeout(() => saveDraft(draft), 400);
    return () => clearTimeout(t);
  }, [draft, hydrated, result]);

  // Free local previews when leaving the page.
  useEffect(
    () => () => {
      evidenceRef.current.forEach((e) => URL.revokeObjectURL(e.previewUrl));
    },
    [],
  );

  const patch = useCallback((p: Partial<ReportDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(p)) {
        delete next[k];
        if (k === "ubigeo") delete next.place;
        if (k === "title") delete next.title;
        if (k === "timeMode" || k === "time" || k === "timeEnd") delete next.time;
      }
      return next;
    });
  }, []);

  const territory = useMemo(
    () => DEMO_TERRITORIES.find((t) => t.ubigeo === draft.ubigeo),
    [draft.ubigeo],
  );
  const duplicates = useMemo(
    () => (draft.step === 2 ? findDuplicates(draft, DEMO_EVENTS) : []),
    [draft],
  );

  const goTo = (step: ReportDraft["step"]) => {
    setErrors({});
    setSubmitError(null);
    setDraft((d) => ({ ...d, step }));
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const next = () => {
    const e =
      draft.step === 1 ? validateStep1(draft) : draft.step === 2 ? validateStep2(draft) : {};
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    goTo((draft.step + 1) as ReportDraft["step"]);
  };

  const saveAndExit = () => {
    const ok = saveDraft(draft);
    setSavedNote(
      ok
        ? "Borrador guardado solo en este dispositivo, sin fotos."
        : "No pudimos guardar el borrador en este navegador.",
    );
    if (ok) setTimeout(() => window.location.assign("/mapa"), 900);
  };

  const submit = async () => {
    const e: FieldErrors = { ...validateStep1(draft), ...validateStep2(draft) };
    if (!draft.confirmed) e.confirmed = "Confirma esta casilla para enviar.";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    const built = buildSubmitInput(draft, territory);
    if (!built.success) {
      setErrors({ form: `No pudimos validar el reporte: ${built.error}` });
      return;
    }
    if (!isAuthenticated) {
      saveDraft(draft);
      window.location.assign("/auth/login?redirect=/reportar");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitReport(built.data);
      clearDraft();
      setResult(res);
    } catch {
      setSubmitError(
        "No pudimos confirmar el envío, así que no sabemos si tu reporte se recibió. Tu borrador sigue aquí. Intenta de nuevo en unos minutos; si ves un identificador de reporte, no lo reenvíes.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const discard = () => {
    clearDraft();
    setDraft(EMPTY_DRAFT);
    setRestored(false);
    setErrors({});
  };

  if (result) {
    return (
      <div
        className="mx-auto flex max-w-2xl flex-col items-start gap-3 rounded-2xl border p-6"
        role="status"
      >
        <CheckCircle2 className="size-7" aria-hidden />
        <h2 ref={headingRef} className="text-xl font-semibold">
          Recibimos tu reporte
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{result.id}</span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium">
            {PUBLICATION_LABELS.pending_review}
          </span>
        </div>
        <p className="text-muted-foreground text-sm text-pretty">
          Pasará por controles de publicación. Publicarlo no significa que el hecho esté comprobado;
          su revisión se mostrará por separado. Aún no es una alerta ni está corroborado.
        </p>
        {result.simulated && (
          <Alert>
            <AlertTitle>Envío simulado (demostración)</AlertTitle>
            <AlertDescription>
              Este reporte no se guardó en ningún servidor ni se publicará.
            </AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Link to={"/mis-reportes" as "/"} className={cn(buttonVariants())}>
            Ver seguimiento
          </Link>
          <Link to="/mapa" className={cn(buttonVariants({ variant: "outline" }))}>
            Volver al mapa
          </Link>
        </div>
      </div>
    );
  }

  const errorEntries = Object.entries(errors).filter(([, m]) => m);
  const anchor = (k: string) =>
    k === "form" ? undefined : `#field-${k === "place" ? "place" : k}`;

  const stepper = (
    <nav aria-label="Pasos del reporte">
      {/* Phones: a progress bar; the step name is already the form's h2. */}
      <ol className="grid grid-cols-4 gap-1.5 lg:hidden" aria-hidden>
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={cn("h-1 rounded-full", i < draft.step ? "bg-primary" : "bg-muted")}
          />
        ))}
      </ol>
      <ol className="hidden gap-1 lg:grid">
        {STEPS.map((label, i) => {
          const n = (i + 1) as ReportDraft["step"];
          const done = n < draft.step;
          const current = n === draft.step;
          return (
            <li key={label} aria-current={current ? "step" : undefined}>
              <button
                type="button"
                disabled={!done}
                onClick={() => goTo(n)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium",
                  current
                    ? "bg-[var(--surface-quiet)] text-foreground"
                    : "text-[var(--text-secondary)]",
                  done && "cursor-pointer hover:bg-[var(--surface-quiet)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border font-mono text-xs",
                    current && "border-primary bg-primary text-primary-foreground",
                    done && "border-primary text-primary",
                  )}
                >
                  {done ? <Check className="size-3.5" aria-hidden /> : n}
                </span>
                {label}
                {done && <span className="sr-only"> (completado, volver)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
      <aside className="grid gap-4 lg:sticky lg:top-6 lg:gap-6">
        <div className="grid gap-1.5">
          <h1 className="text-[22px] leading-[1.18] font-semibold tracking-tight lg:text-[26px]">
            Cuéntanos qué está pasando
          </h1>
          <p className="hidden text-sm text-[var(--text-secondary)] text-pretty sm:block">
            Comparte lo que observaste y dónde ocurrió. Tu aporte pasará por controles antes de
            publicarse.
          </p>
        </div>
        {stepper}
        <div className="grid gap-1.5 rounded-xl border border-[var(--border-subtle)] p-3 text-[13px] text-[var(--text-secondary)]">
          <span className="text-warning inline-flex items-start gap-1.5 font-medium">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            No te acerques a una zona peligrosa para obtener evidencia.
          </span>
          <span>
            El borrador se guarda solo en este dispositivo y puede perderse al cerrar el navegador.
          </span>
          <span aria-live="polite" className="text-primary">
            {savedNote}
          </span>
        </div>
        <Button
          variant="ghost"
          className="hidden justify-start lg:inline-flex"
          onClick={saveAndExit}
        >
          Guardar borrador y salir
        </Button>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        {restored && (
          <Alert>
            <AlertTitle>Recuperamos tu borrador</AlertTitle>
            <AlertDescription>
              Estaba guardado en este dispositivo. Las fotos no se guardan: vuelve a elegirlas.{" "}
              <button type="button" className="underline" onClick={discard}>
                Empezar de nuevo
              </button>
            </AlertDescription>
          </Alert>
        )}

        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold tracking-tight outline-none"
        >
          Paso {draft.step} de 4 · {STEPS[draft.step - 1]}
        </h2>

        {errorEntries.length > 0 && (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Revisa estos campos</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {errorEntries.map(([k, m]) => (
                  <li key={k}>
                    {anchor(k) ? (
                      <a href={anchor(k)} className="underline">
                        {m}
                      </a>
                    ) : (
                      m
                    )}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {draft.step === 1 && <StepWhat draft={draft} errors={errors} onChange={patch} />}
        {draft.step === 2 && (
          <StepWhere
            draft={draft}
            errors={errors}
            territories={DEMO_TERRITORIES}
            territory={territory}
            duplicates={duplicates}
            onChange={patch}
            onPickDuplicate={(id) => {
              saveDraft(draft);
              window.location.assign(`/eventos/${id}`);
            }}
          />
        )}
        {draft.step === 3 && <StepEvidence items={evidence} onItems={(u) => setEvidence(u)} />}
        {draft.step === 4 && (
          <StepReview
            draft={draft}
            territory={territory}
            evidence={evidence}
            errors={errors}
            onEdit={goTo}
            onChange={patch}
          />
        )}

        {submitError && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
        {draft.step === 4 && !isAuthenticated && (
          <p className="text-muted-foreground text-sm">
            Para enviar necesitas iniciar sesión. Guardaremos tu borrador y volverás aquí.
          </p>
        )}

        {/* Phones: the step buttons stay above the bottom nav (3.5rem + safe area). */}
        <div className="bg-background sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 md:static md:mx-0 md:px-0 md:pt-4 md:pb-0">
          <div className="flex gap-2">
            <Button variant="ghost" className="lg:hidden" onClick={saveAndExit}>
              Guardar y salir
            </Button>
            {draft.step > 1 && (
              <Button
                variant="outline"
                onClick={() => goTo((draft.step - 1) as ReportDraft["step"])}
              >
                Atrás
              </Button>
            )}
          </div>
          {draft.step < 4 ? (
            <Button onClick={next}>Continuar</Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting
                ? "Enviando..."
                : isAuthenticated
                  ? "Enviar reporte"
                  : "Iniciar sesión para enviar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
