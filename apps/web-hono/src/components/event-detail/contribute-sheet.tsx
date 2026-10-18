import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  buttonVariants,
  cn,
} from "@emergency-map/web-ui";
import { client } from "@/lib/orpc-client";

const RELATIONS = [
  { value: "same", label: "Vi el mismo evento" },
  { value: "near", label: "Vi algo relacionado cerca" },
  { value: "contradicts", label: "Tengo información que lo contradice" },
  { value: "source", label: "Comparto una fuente o documento" },
] as const;
type Relation = (typeof RELATIONS)[number]["value"];

interface Draft {
  relation: Relation;
  description: string;
  when: string;
  where: string;
  url: string;
  sawIt: boolean;
  ownsImage: boolean;
  sharingSource: boolean;
}

const EMPTY: Draft = {
  relation: "same",
  description: "",
  when: "",
  where: "",
  url: "",
  sawIt: false,
  ownsImage: false,
  sharingSource: false,
};

const storageKey = (eventId: string) => `evidence-draft:${eventId}`;

/** Text-only draft in sessionStorage. Every access is wrapped: private windows throw. */
function loadDraft(eventId: string): Draft {
  try {
    const raw = sessionStorage.getItem(storageKey(eventId));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}
function saveDraft(eventId: string, draft: Draft) {
  try {
    sessionStorage.setItem(storageKey(eventId), JSON.stringify(draft));
  } catch {
    /* storage unavailable: the draft just won't survive navigation */
  }
}
function clearDraft(eventId: string) {
  try {
    sessionStorage.removeItem(storageKey(eventId));
  } catch {
    /* ignore */
  }
}

/** Composes the description: the API has no fields for relation, time or place yet. */
function composeDescription(d: Draft): string {
  const relation = RELATIONS.find((r) => r.value === d.relation)!.label;
  const lines = [`Relación con el evento: ${relation}.`, d.description.trim()];
  if (d.when.trim()) lines.push(`Cuándo (hora de Perú): ${d.when.trim()}.`);
  if (d.where.trim()) lines.push(`Dónde: ${d.where.trim()}.`);
  return lines.join("\n").slice(0, 1000);
}

function isValidUrl(v: string): boolean {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

export interface ContributeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  isAuthenticated: boolean;
  /** Where to come back after signing in. */
  returnTo: string;
}

/** "Aportar evidencia": side panel on desktop, full-width on mobile. */
export function ContributeSheet({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  isAuthenticated,
  returnTo,
}: ContributeSheetProps) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(loadDraft(eventId));
    setHydrated(true);
  }, [eventId]);
  useEffect(() => {
    if (hydrated && !sentId) saveDraft(eventId, draft);
  }, [draft, eventId, hydrated, sentId]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const urlValue = draft.url.trim();
  const urlInvalid = urlValue !== "" && !isValidUrl(urlValue);
  const tooShort = draft.description.trim().length < 10;

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await client.evidence.add({
        id: eventId,
        type: urlValue ? "document_link" : "testimony",
        description: composeDescription(draft),
        storageKey: null,
        fileSha256: null,
        url: urlValue || null,
        observedPersonally: draft.sawIt,
        ownsImage: draft.ownsImage,
        declaredCapturedAt: null,
      });
      if (!res.data) throw new Error(res.error?.message ?? "No pudimos enviar tu aporte.");
      clearDraft(eventId);
      setSentId(res.data.id);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos enviar tu aporte. Tu borrador sigue aquí; inténtalo de nuevo.",
      );
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setSentId(null);
    setDraft(EMPTY);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next && sentId) reset();
      }}
    >
      <DialogContent
        className={cn(
          "top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 content-start overflow-y-auto sm:max-w-[480px]",
          "gap-0 p-0",
        )}
      >
        <DialogHeader className="border-border-subtle border-b p-5 pr-12">
          <DialogTitle className="text-xl font-semibold">Aportar evidencia</DialogTitle>
          <DialogDescription className="text-text-secondary text-[13px]">
            Sobre «{eventTitle}». Tu aporte pasa por controles antes de publicarse y no cambia el
            estado del evento.
          </DialogDescription>
        </DialogHeader>

        {sentId ? (
          <div className="grid gap-3 p-5">
            <CheckCircle2 className="text-status-positive size-6" aria-hidden />
            <p className="text-base font-semibold">Recibimos tu aporte</p>
            <p className="text-text-secondary text-sm">
              Aparecerá después de los controles de publicación y no cambia automáticamente el
              estado del evento. Identificador{" "}
              <span className="font-mono text-[13px]">{sentId}</span>.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href="/mis-reportes" className={buttonVariants({ size: "lg" })}>
                Ver seguimiento en Mis aportes
              </a>
              <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid content-start gap-4 p-5 text-sm">
              <div className="grid gap-1.5">
                <Label htmlFor="ap-rel">Relación con el evento</Label>
                <select
                  id="ap-rel"
                  value={draft.relation}
                  onChange={(e) => patch({ relation: e.target.value as Relation })}
                  className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
                >
                  {RELATIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ap-desc">Qué observaste</Label>
                <Textarea
                  id="ap-desc"
                  rows={4}
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Describe lo que viste, sin suposiciones sobre la causa"
                  className="text-sm"
                />
                <p className="text-text-secondary text-xs">
                  Un aporte textual es útil. No te acerques a una zona peligrosa para obtener una
                  foto.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="ap-when">Cuándo (hora de Perú)</Label>
                  <Input
                    id="ap-when"
                    value={draft.when}
                    onChange={(e) => patch({ when: e.target.value })}
                    placeholder="14 oct 2026, 17:40"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ap-where">Dónde</Label>
                  <Input
                    id="ap-where"
                    value={draft.where}
                    onChange={(e) => patch({ where: e.target.value })}
                    placeholder="Referencia o distrito"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ap-url">Enlace documental (opcional)</Label>
                <Input
                  id="ap-url"
                  type="url"
                  value={draft.url}
                  onChange={(e) => patch({ url: e.target.value })}
                  placeholder="https://"
                  aria-invalid={urlInvalid}
                  className="h-9 text-sm"
                />
                {urlInvalid ? (
                  <p className="text-status-danger text-xs">
                    Escribe un enlace completo, con https://.
                  </p>
                ) : (
                  <p className="text-text-secondary text-xs">
                    Aún no se pueden adjuntar fotos desde esta pantalla.
                  </p>
                )}
              </div>
              <div className="grid gap-2.5">
                {(
                  [
                    ["sawIt", "Lo observé personalmente"],
                    ["ownsImage", "La imagen es mía"],
                    ["sharingSource", "Estoy compartiendo una fuente"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2.5 text-sm">
                    <Checkbox
                      checked={draft[key]}
                      onCheckedChange={(v) => patch({ [key]: v === true })}
                    />
                    {label}
                  </label>
                ))}
                <p className="text-text-secondary text-xs">
                  Estas declaraciones se registran por separado; no constituyen prueba de veracidad.
                </p>
              </div>
              {error && (
                <p
                  role="alert"
                  className="bg-status-danger-quiet text-status-danger rounded-md p-3 text-[13px]"
                >
                  {error}
                </p>
              )}
            </div>
            <DialogFooter className="border-border-subtle mt-auto items-center justify-between border-t p-5 sm:justify-between">
              {isAuthenticated ? (
                <>
                  <span className="text-text-secondary text-xs">
                    Los aportes se revisan antes de publicarse.
                  </span>
                  <Button size="lg" disabled={tooShort || urlInvalid || sending} onClick={send}>
                    {sending ? "Enviando…" : "Enviar aporte"}
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-text-secondary text-xs">
                    Para enviar se pide acceso; tu borrador se conserva.
                  </span>
                  <Link
                    to="/auth/login"
                    search={{ redirect: returnTo }}
                    className={buttonVariants({ size: "lg" })}
                  >
                    Entrar para enviar
                  </Link>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
