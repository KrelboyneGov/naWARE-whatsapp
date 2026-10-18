import { Pencil } from "lucide-react";
import { Badge, Button, Card, CardContent, Checkbox } from "@emergency-map/web-ui";
import type { Territory } from "@emergency-map/domain/schemas";
import {
  CATEGORY_LABELS,
  formatDateTime,
  PRECISION_LABELS,
  PUBLICATION_LABELS,
} from "@/lib/labels";
import { territoryLabel } from "@/lib/map-filters";
import type { ReportDraft } from "@/lib/report-draft";
import { CATEGORY_ICONS } from "@/components/map/category-icons";
import { MapOriginBadge, MapReviewBadge } from "@/components/map/badges";
import { buildOccurredAt, type FieldErrors } from "./report-logic";
import type { EvidenceItem } from "./step-evidence";
import { FieldError } from "./step-what";

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <Button variant="ghost" size="xs" onClick={onEdit}>
          <Pencil aria-hidden /> Editar<span className="sr-only">: {title}</span>
        </Button>
      </div>
      {children}
    </section>
  );
}

export function StepReview({
  draft,
  territory,
  evidence,
  errors,
  onEdit,
  onChange,
}: {
  draft: ReportDraft;
  territory: Territory | undefined;
  evidence: EvidenceItem[];
  errors: FieldErrors;
  onEdit: (step: 1 | 2 | 3) => void;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  const Icon = draft.category ? CATEGORY_ICONS[draft.category] : null;
  const occurred = buildOccurredAt(draft);
  const timeText = !occurred
    ? "—"
    : occurred.precision === "exact"
      ? formatDateTime(occurred.start)
      : occurred.precision === "day"
        ? `${formatDateTime(occurred.start).split(",")[0]} (hora desconocida)`
        : `${formatDateTime(occurred.start)} a ${formatDateTime(occurred.end!)}`;
  const observedText = {
    yes: "Lo observó personalmente",
    no: "No lo observó personalmente",
    prefer_not_to_say: "Prefirió no indicarlo",
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Badge variant="secondary" className="mb-2">
          Vista previa, aún no publicada
        </Badge>
        <Card>
          <CardContent className="flex items-start gap-3 pt-4">
            {Icon && (
              <span className="bg-primary/10 text-primary rounded-full p-2">
                <Icon className="size-5" aria-hidden />
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="font-medium">{draft.title || "(sin título)"}</p>
              <p className="text-muted-foreground text-xs">
                {draft.category && CATEGORY_LABELS[draft.category]} ·{" "}
                {territory ? territory.name + ", " + territory.departmentName : "—"} ·{" "}
                {draft.precision === "district" ? "Solo distrito" : PRECISION_LABELS.approximate}
              </p>
              <div className="flex flex-wrap gap-1">
                <MapOriginBadge origin="citizen" />
                <MapReviewBadge status="unverified" />
                <Badge variant="outline">{PUBLICATION_LABELS.pending_review}</Badge>
              </div>
              {draft.description && (
                <p className="text-sm whitespace-pre-line">{draft.description}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Section title="Qué pasó" onEdit={() => onEdit(1)}>
        <p>{draft.category && CATEGORY_LABELS[draft.category]}</p>
        <p className="text-muted-foreground">{draft.observed && observedText[draft.observed]}</p>
        {draft.sourceUrl && <p className="break-all">Fuente: {draft.sourceUrl}</p>}
      </Section>
      <Section title="Dónde y cuándo" onEdit={() => onEdit(2)}>
        <p>{territory && territoryLabel(territory)}</p>
        <p className="text-muted-foreground">
          {draft.precision === "district"
            ? "Público: solo el distrito, sin punto en el mapa."
            : "Público: un punto aproximado (redondeado). Tu punto exacto no se publica."}
        </p>
        {draft.reference && <p>Referencia: {draft.reference}</p>}
        <p>{timeText} (hora de Lima)</p>
      </Section>
      <Section title="Evidencia" onEdit={() => onEdit(3)}>
        {evidence.length === 0 ? (
          <p className="text-muted-foreground">Sin fotos. Podríamos pedirte más información.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {evidence.map((e) => (
              <li key={e.id} className="w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.previewUrl}
                  alt={e.description || e.file.name}
                  className="size-24 rounded object-cover"
                />
                <p className="truncate text-xs">{e.description || e.file.name}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground text-xs">
          Demostración: las fotos no se suben a ningún servidor.
        </p>
      </Section>

      <div id="field-confirmed" className="flex flex-col gap-1">
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={draft.confirmed}
            onCheckedChange={(c) => onChange({ confirmed: c === true })}
            aria-describedby="err-confirmed"
            className="mt-0.5"
          />
          <span>
            Confirmo que la descripción corresponde a lo que sé y que puedo compartir los archivos
            que adjunté.
          </span>
        </label>
        <FieldError id="err-confirmed" message={errors.confirmed} />
      </div>
    </div>
  );
}
