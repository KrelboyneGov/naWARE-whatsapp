import { useCallback, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Locate, MapPin } from "lucide-react";
import { HAZARD_TYPES, type HazardType } from "@emergency-map/domain/constants";
import { DEMO_TERRITORIES } from "@emergency-map/domain/demo";
import type { GeoPoint } from "@emergency-map/domain/schemas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  buttonVariants,
  cn,
} from "@emergency-map/web-ui";
import {
  GPS_PROBLEM_COPY,
  useGeolocation,
  type GpsReading,
} from "@/components/nearby/use-geolocation";
import { useReporter, useSubmitQuickReport, type QuickReportOutcome } from "@/lib/community-source";
import { HAZARD_ICONS, HAZARD_LABELS, HAZARD_TINT } from "@/lib/hazard-labels";

/** Demo fallback when the person has no GPS: Chorrillos, the dev seed example. */
const DEMO_POINT: GeoPoint = DEMO_TERRITORIES.find((t) => t.ubigeo === "150108")?.centroid ?? {
  lat: -12.1697,
  lng: -77.0153,
};

/**
 * Two taps, like Waze: pick what you see, send. The location comes from the device (published as
 * approximate); a note and evidence are optional and can be added later from the event page.
 */
export function QuickReportPanel({ onDone }: { onDone?: () => void }) {
  const [hazard, setHazard] = useState<HazardType | null>(null);
  const [point, setPoint] = useState<{ value: GeoPoint; source: "gps" | "demo" } | null>(null);
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<QuickReportOutcome | null>(null);
  const me = useReporter();
  const submit = useSubmitQuickReport();

  const onReading = useCallback((r: GpsReading) => setPoint({ value: r.point, source: "gps" }), []);
  const gps = useGeolocation(onReading);

  const reset = () => {
    setHazard(null);
    setNote("");
    setOutcome(null);
    submit.reset();
  };

  const pick = (h: HazardType) => {
    setHazard(h);
    if (!point && !gps.pending) gps.request();
  };

  const send = async () => {
    if (!hazard) return;
    const where = point?.value ?? DEMO_POINT;
    setOutcome(await submit.mutateAsync({ hazardType: hazard, point: where, note }));
  };

  if (outcome) return <Result outcome={outcome} onClose={() => onDone?.()} onAnother={reset} />;

  return (
    <div className="grid gap-4 p-5">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de peligro">
        {HAZARD_TYPES.map((h) => {
          const Icon = HAZARD_ICONS[h];
          const active = hazard === h;
          return (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => pick(h)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2 text-center text-[13px] font-medium transition",
                active
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-[var(--border-strong)]",
                HAZARD_TINT[h],
              )}
            >
              <Icon className="size-7" aria-hidden />
              {HAZARD_LABELS[h]}
            </button>
          );
        })}
      </div>

      {hazard && (
        <div className="grid gap-3">
          <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-[13px]">
            {point?.source === "gps" ? (
              <>
                <Locate className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>Usaremos tu ubicación actual. Se publica como aproximada.</span>
              </>
            ) : gps.pending ? (
              <>
                <Locate className="mt-0.5 size-4 shrink-0 animate-pulse" aria-hidden />
                <span>Buscando tu ubicación…</span>
              </>
            ) : (
              <>
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  {gps.problem ? `${GPS_PROBLEM_COPY[gps.problem].title}. ` : ""}
                  Sin GPS usaremos Chorrillos como ubicación de demostración.{" "}
                  <button type="button" className="text-primary underline" onClick={gps.request}>
                    Reintentar GPS
                  </button>
                </span>
              </>
            )}
          </div>
          <Input
            value={note}
            maxLength={280}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Detalle opcional: «tapa un carril», «hay heridos»…"
            aria-label="Detalle opcional"
          />
          <Button size="lg" className="h-12 text-base" disabled={submit.isPending} onClick={send}>
            Enviar reporte de {HAZARD_LABELS[hazard].toLowerCase()}
          </Button>
          <p className="text-[13px] text-[var(--text-secondary)]">
            {me.isAnonymous ? (
              <>
                Sin cuenta: tu reporte se muestra cuando 3 personas distintas reportan lo mismo
                cerca.{" "}
                <Link to={"/auth/login" as "/"} className="text-primary">
                  Inicia sesión
                </Link>{" "}
                para publicarlo de inmediato.
              </>
            ) : (
              "Se publica de inmediato como «sin verificar» hasta que alguien lo revise."
            )}
          </p>
        </div>
      )}

      {!hazard && (
        <Link
          to="/reportar"
          search={{ modo: "completo" }}
          className={cn(buttonVariants({ variant: "ghost" }), "justify-self-center text-sm")}
          onClick={() => onDone?.()}
        >
          Prefiero el formulario completo, con fecha y evidencia
        </Link>
      )}
    </div>
  );
}

export function QuickReportSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-[520px]">
        <DialogHeader className="border-b border-[var(--border-subtle)] p-5 pr-12">
          <DialogTitle className="text-xl font-semibold">¿Qué está pasando?</DialogTitle>
          <DialogDescription className="text-[13px] text-[var(--text-secondary)]">
            Toca lo que ves y envía. Puedes agregar detalles o fotos después.
          </DialogDescription>
        </DialogHeader>
        {/* Remounted on each open so a closed sheet always starts empty. */}
        {open && <QuickReportPanel onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function Result({
  outcome,
  onClose,
  onAnother,
}: {
  outcome: QuickReportOutcome;
  onClose: () => void;
  onAnother: () => void;
}) {
  return (
    <div className="grid gap-4 p-5 text-center">
      {outcome.status === "published" ? (
        <>
          <CheckCircle2 className="mx-auto size-12 text-emerald-600" aria-hidden />
          <p className="text-lg font-semibold">Reporte publicado</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Ya aparece en el mapa y en Urgencias como «sin verificar». Tus vecinos podrán confirmar
            si sigue ahí.
          </p>
          <Link
            to={"/urgencias" as "/"}
            className={cn(buttonVariants({ size: "lg" }))}
            onClick={onClose}
          >
            Ver en urgencias
          </Link>
        </>
      ) : (
        <>
          <Clock className="mx-auto size-12 text-amber-600" aria-hidden />
          <p className="text-lg font-semibold">Recibimos tu reporte</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Como no tienes cuenta, se mostrará cuando{" "}
            {outcome.missing === 1 ? "1 persona más" : `${outcome.missing} personas más`} reporten
            lo mismo cerca.
          </p>
        </>
      )}
      <Button variant="outline" onClick={onAnother}>
        Reportar otra cosa
      </Button>
    </div>
  );
}
