import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@emergency-map/web-ui";
import { NEED_CATEGORIES, type NeedCategory } from "@emergency-map/domain/constants";
import { DEMO_TERRITORIES } from "@emergency-map/domain/demo";
import type { Organization } from "@emergency-map/domain/schemas";
import { client } from "@/lib/orpc-client";
import { NEED_CATEGORY_LABELS } from "@/lib/labels";
import { FormField, nativeSelectClass } from "./form-controls";
import { ProblemNotice } from "./problem-notice";
import { classifyWriteError, type WriteProblem } from "./write-errors";

const empty = {
  name: "",
  address: "",
  reference: "",
  ubigeo: "",
  destUbigeo: "",
  schedule: "",
  accepts: [] as NeedCategory[],
  doesNotAccept: "",
  contact: "",
  lat: "",
  lng: "",
};

const ref = (ubigeo: string) => {
  const t = DEMO_TERRITORIES.find((x) => x.ubigeo === ubigeo);
  return t
    ? {
        ubigeo: t.ubigeo,
        name: t.name,
        provinceName: t.provinceName,
        departmentName: t.departmentName,
      }
    : null;
};

export function PointFormDialog({
  open,
  onOpenChange,
  org,
  signedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: Organization;
  signedIn: boolean;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState<WriteProblem | null>(null);
  const set = (p: Partial<typeof empty>) => setF((s) => ({ ...s, ...p }));
  const lat = Number(f.lat);
  const lng = Number(f.lng);
  const coordsOk = f.lat !== "" && f.lng !== "" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const mutation = useMutation({
    mutationFn: async () => {
      const territory = ref(f.ubigeo);
      const dest = ref(f.destUbigeo);
      if (!territory || !dest) throw new Error("Elige la ciudad del punto y el destino");
      const res = await client.help.createCollectionPoint({
        id: org.id,
        name: f.name.trim(),
        address: f.address.trim(),
        arrivalReference: f.reference.trim() || null,
        location: { lat, lng },
        territory,
        schedule: { text: f.schedule.trim(), confirmedAt: null },
        accepts: f.accepts,
        doesNotAccept: f.doesNotAccept.trim() || null,
        destinationTerritories: [dest],
        contacts: [{ kind: "email", value: f.contact.trim(), isDemo: false }],
        availabilityConfirmedAt: null,
      });
      if (!res.data) throw new Error(res.error?.message ?? "No pudimos crear el punto");
    },
    onSuccess: () => {
      setDone(true);
      setProblem(null);
      void qc.invalidateQueries({ queryKey: ["help"] });
    },
    onError: (e) => setProblem(classifyWriteError(e)),
  });

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setF(empty);
      setDone(false);
      setProblem(null);
    }
  };
  const disabled =
    !f.name.trim() ||
    !f.address.trim() ||
    !f.schedule.trim() ||
    !f.contact.trim() ||
    !f.ubigeo ||
    !f.destUbigeo ||
    !coordsOk ||
    mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear punto de recepción</DialogTitle>
          <DialogDescription>
            Una sede no es automáticamente un punto de acopio. El horario se publica como «horario
            declarado».
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="grid gap-2">
            <strong className="text-[17px]">Punto creado</strong>
            <DialogFooter>
              <Button onClick={() => close(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="grid gap-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!signedIn) return setProblem({ kind: "signin" });
              mutation.mutate();
            }}
          >
            <FormField label="Nombre" htmlFor="pf-name">
              <Input
                id="pf-name"
                value={f.name}
                maxLength={160}
                onChange={(e) => set({ name: e.target.value })}
              />
            </FormField>
            <FormField label="Dirección" htmlFor="pf-address">
              <Input
                id="pf-address"
                value={f.address}
                maxLength={300}
                onChange={(e) => set({ address: e.target.value })}
              />
            </FormField>
            <FormField label="Referencia para llegar (opcional)" htmlFor="pf-ref">
              <Input
                id="pf-ref"
                value={f.reference}
                maxLength={300}
                onChange={(e) => set({ reference: e.target.value })}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Ciudad del punto" htmlFor="pf-ter">
                <select
                  id="pf-ter"
                  className={nativeSelectClass}
                  value={f.ubigeo}
                  onChange={(e) => set({ ubigeo: e.target.value })}
                >
                  <option value="">Distrito, departamento</option>
                  {DEMO_TERRITORIES.map((t) => (
                    <option key={t.ubigeo} value={t.ubigeo}>
                      {t.name}, {t.departmentName}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Recibe para (destino)" htmlFor="pf-dest">
                <select
                  id="pf-dest"
                  className={nativeSelectClass}
                  value={f.destUbigeo}
                  onChange={(e) => set({ destUbigeo: e.target.value })}
                >
                  <option value="">Distrito, departamento</option>
                  {DEMO_TERRITORIES.map((t) => (
                    <option key={t.ubigeo} value={t.ubigeo}>
                      {t.name}, {t.departmentName}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Latitud" htmlFor="pf-lat" hint="Ej.: -12.0464">
                <Input
                  id="pf-lat"
                  inputMode="decimal"
                  value={f.lat}
                  onChange={(e) => set({ lat: e.target.value })}
                />
              </FormField>
              <FormField label="Longitud" htmlFor="pf-lng" hint="Ej.: -77.0428">
                <Input
                  id="pf-lng"
                  inputMode="decimal"
                  value={f.lng}
                  onChange={(e) => set({ lng: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Horario declarado" htmlFor="pf-schedule">
              <Input
                id="pf-schedule"
                value={f.schedule}
                maxLength={300}
                onChange={(e) => set({ schedule: e.target.value })}
                placeholder="Lunes a sábado, 9:00 a 17:00"
              />
            </FormField>
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-medium">Acepta</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {NEED_CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={f.accepts.includes(c)}
                      onCheckedChange={(v) =>
                        set({
                          accepts:
                            v === true ? [...f.accepts, c] : f.accepts.filter((x) => x !== c),
                        })
                      }
                    />
                    {NEED_CATEGORY_LABELS[c]}
                  </label>
                ))}
              </div>
            </fieldset>
            <FormField label="No acepta (opcional)" htmlFor="pf-no">
              <Input
                id="pf-no"
                value={f.doesNotAccept}
                maxLength={300}
                onChange={(e) => set({ doesNotAccept: e.target.value })}
              />
            </FormField>
            <FormField
              label="Contacto institucional"
              htmlFor="pf-contact"
              hint="No uses contactos personales de voluntarios."
            >
              <Input
                id="pf-contact"
                type="email"
                value={f.contact}
                onChange={(e) => set({ contact: e.target.value })}
              />
            </FormField>
            {problem && <ProblemNotice problem={problem} />}
            {!signedIn && !problem && <ProblemNotice problem={{ kind: "signin" }} />}
            <DialogFooter>
              <Button type="submit" disabled={disabled}>
                {mutation.isPending ? "Enviando…" : "Crear punto de recepción"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
