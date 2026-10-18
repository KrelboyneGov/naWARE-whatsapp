import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "@emergency-map/web-ui";
import type { Need } from "@emergency-map/domain/schemas";
import { client } from "@/lib/orpc-client";
import { FormField } from "./form-controls";
import { ProblemNotice } from "./problem-notice";
import { classifyWriteError, type WriteProblem } from "./write-errors";

export function CoverDialog({
  need,
  onClose,
  signedIn,
}: {
  need: Need | null;
  onClose: () => void;
  signedIn: boolean;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<WriteProblem | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await client.help.updateNeedStatus({
        id: need!.id,
        status: "covered",
        note: note.trim(),
      });
      if (!res.data) throw new Error(res.error?.message ?? "No pudimos actualizar la necesidad");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["help"] });
      reset();
    },
    onError: (e) => setProblem(classifyWriteError(e)),
  });
  const reset = () => {
    setNote("");
    setProblem(null);
    onClose();
  };

  return (
    <Dialog open={!!need} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Marcar como cubierta?</DialogTitle>
          <DialogDescription>
            Saldrá del directorio de vigentes y quedará en historial con la nota. No confirma
            entregas individuales.
          </DialogDescription>
        </DialogHeader>
        <FormField label="Nota pública" htmlFor="cover-note">
          <Textarea
            id="cover-note"
            rows={2}
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej.: Se alcanzó la cantidad prevista según conteo de la organización."
          />
        </FormField>
        {problem && <ProblemNotice problem={problem} />}
        {!signedIn && !problem && <ProblemNotice problem={{ kind: "signin" }} />}
        <DialogFooter>
          <Button variant="outline" onClick={reset}>
            Cancelar
          </Button>
          <Button
            disabled={note.trim().length < 5 || mutation.isPending}
            onClick={() => (signedIn ? mutation.mutate() : setProblem({ kind: "signin" }))}
          >
            Marcar cubierta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
