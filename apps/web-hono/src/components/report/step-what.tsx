import { Input, Label, Textarea, cn } from "@emergency-map/web-ui";
import {
  EVENT_CATEGORIES,
  REPORT_DESCRIPTION_MAX,
  REPORT_TITLE_MAX,
} from "@emergency-map/domain/constants";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { Observed, ReportDraft } from "@/lib/report-draft";
import { CATEGORY_ICONS } from "@/components/map/category-icons";
import type { FieldErrors } from "./report-logic";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-destructive text-xs" role="alert">
      {message}
    </p>
  );
}

const OBSERVED: { value: Observed; label: string }[] = [
  { value: "yes", label: "Sí" },
  { value: "no", label: "No" },
  { value: "prefer_not_to_say", label: "Prefiero no indicar" },
];

export function StepWhat({
  draft,
  errors,
  onChange,
}: {
  draft: ReportDraft;
  errors: FieldErrors;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <fieldset id="field-category" className="flex flex-col gap-2" aria-describedby="err-category">
        <legend className="mb-1 text-[13px] font-medium">
          Categoría <span className="text-destructive">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EVENT_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            return (
              <label
                key={c}
                className={cn(
                  "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-ring/50 grid min-h-11 cursor-pointer content-start gap-2 rounded-xl border p-3 text-sm font-medium has-[:focus-visible]:ring-2",
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={draft.category === c}
                  onChange={() => onChange({ category: c })}
                  className="sr-only"
                />
                <Icon className="size-5 shrink-0" aria-hidden />
                {CATEGORY_LABELS[c]}
              </label>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          «Otro» no admite denuncias de delitos ni acusaciones personales. Los incidentes viales son
          reportes ciudadanos; no hay integración automática de tránsito.
        </p>
        <FieldError id="err-category" message={errors.category} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field-title">
          Título corto <span className="text-destructive">*</span>
        </Label>
        <Input
          id="field-title"
          value={draft.title}
          maxLength={REPORT_TITLE_MAX}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-invalid={!!errors.title}
          aria-describedby="err-title count-title"
          placeholder="Ej.: Humo visible en la ladera sobre la av. principal"
        />
        <div className="flex justify-between">
          <FieldError id="err-title" message={errors.title} />
          <span id="count-title" className="text-muted-foreground ml-auto text-xs">
            {draft.title.length}/{REPORT_TITLE_MAX}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field-description">Qué observaste</Label>
        <Textarea
          id="field-description"
          rows={5}
          value={draft.description}
          maxLength={REPORT_DESCRIPTION_MAX}
          onChange={(e) => onChange({ description: e.target.value })}
          aria-invalid={!!errors.description}
          aria-describedby="err-description count-description"
          placeholder="Describe solo lo que viste u oíste. No es necesario estimar causa, gravedad ni número de personas."
        />
        <div className="flex justify-between">
          <FieldError id="err-description" message={errors.description} />
          <span id="count-description" className="text-muted-foreground ml-auto text-xs">
            {draft.description.length}/{REPORT_DESCRIPTION_MAX}
          </span>
        </div>
      </div>

      <fieldset id="field-observed" className="flex flex-col gap-2" aria-describedby="err-observed">
        <legend className="mb-1 text-sm font-medium">¿Lo observaste personalmente?</legend>
        <div className="flex flex-wrap gap-2">
          {OBSERVED.map((o) => (
            <label
              key={o.value}
              className="has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-ring/50 flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm has-[:focus-visible]:ring-2"
            >
              <input
                type="radio"
                name="observed"
                value={o.value}
                checked={draft.observed === o.value}
                onChange={() => onChange({ observed: o.value })}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
        <FieldError id="err-observed" message={errors.observed} />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="field-source">Enlace o referencia de la fuente (opcional)</Label>
        <Input
          id="field-source"
          type="url"
          inputMode="url"
          value={draft.sourceUrl}
          onChange={(e) => onChange({ sourceUrl: e.target.value })}
          aria-invalid={!!errors.sourceUrl}
          aria-describedby="err-source hint-source"
          placeholder="https://"
        />
        <p id="hint-source" className="text-muted-foreground text-xs">
          Si tu información viene de otra fuente, pega el enlace. Se muestra aparte de lo que
          observaste tú.
        </p>
        <FieldError id="err-source" message={errors.sourceUrl} />
      </div>
    </div>
  );
}
