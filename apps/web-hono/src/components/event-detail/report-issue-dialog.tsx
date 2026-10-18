import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
  buttonVariants,
} from "@emergency-map/web-ui";
import type { IssueType } from "@emergency-map/domain/constants";
import { client } from "@/lib/orpc-client";

const ISSUE_LABELS: Record<IssueType, string> = {
  wrong_location: "Ubicación incorrecta",
  wrong_date: "Fecha incorrecta",
  reused_image: "Imagen reutilizada",
  duplicate: "Evento duplicado",
  contradicted: "Información contradicha",
  personal_data: "Datos personales expuestos",
  inappropriate: "Contenido inapropiado",
};

export interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  isAuthenticated: boolean;
  returnTo: string;
}

/** "Informar un error": never promises an immediate removal and never shows the reporter. */
export function ReportIssueDialog({
  open,
  onOpenChange,
  eventId,
  isAuthenticated,
  returnTo,
}: ReportIssueDialogProps) {
  const [kind, setKind] = useState<IssueType | "">("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !kind || text.trim().length < 5 || sending || sent;

  const send = async () => {
    if (!kind) return;
    setSending(true);
    setError(null);
    try {
      const res = await client.review.reportIssue({
        eventId,
        type: kind,
        explanation: text.trim(),
        url: null,
      });
      if (!res.data) throw new Error(res.error?.message ?? "No pudimos enviar el informe.");
      setSent(true);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "No pudimos enviar el informe. Inténtalo de nuevo.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next && sent) {
          setSent(false);
          setKind("");
          setText("");
        }
      }}
    >
      <DialogContent className="max-h-dvh gap-4 overflow-y-auto p-5 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Informar un error</DialogTitle>
          <DialogDescription className="text-text-secondary text-[13px]">
            Tu identidad no se muestra en la ficha pública. Confirmaremos la recepción sin prometer
            un retiro inmediato.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="grid gap-2" disabled={sent}>
          <legend className="mb-1 text-sm font-medium">Qué está mal</legend>
          {(Object.keys(ISSUE_LABELS) as IssueType[]).map((k) => (
            <label key={k} className="flex items-center gap-2.5 text-sm">
              <input
                type="radio"
                name="issue-kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="accent-accent-primary size-4"
              />
              {ISSUE_LABELS[k]}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-1.5">
          <Label htmlFor="issue-text">Explicación</Label>
          <Textarea
            id="issue-text"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sent}
            placeholder="Qué está mal y cómo lo sabes. Enlace o evidencia opcional."
            className="text-sm"
          />
        </div>
        {sent && (
          <p
            role="status"
            className="bg-accent-primary-quiet text-accent-primary rounded-md p-3 text-[13px]"
          >
            Recibimos tu informe. Será revisado; no implica retiro automático.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="bg-status-danger-quiet text-status-danger rounded-md p-3 text-[13px]"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {isAuthenticated ? (
            <Button size="lg" disabled={disabled} onClick={send}>
              {sending ? "Enviando…" : "Enviar informe"}
            </Button>
          ) : (
            <Link
              to="/auth/login"
              search={{ redirect: returnTo }}
              className={buttonVariants({ size: "lg" })}
            >
              Entrar para enviar
            </Link>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
