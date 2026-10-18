import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from "@emergency-map/web-ui";
import { NEED_CATEGORIES, type NeedCategory } from "@emergency-map/domain/constants";
import { DEMO_EVENTS, DEMO_TERRITORIES } from "@emergency-map/domain/demo";
import type { CollectionPoint, Need, Organization } from "@emergency-map/domain/schemas";
import { client } from "@/lib/orpc-client";
import { NEED_CATEGORY_LABELS } from "@/lib/labels";
import { quantityText } from "../help/needs-list";
import { FormField, nativeSelectClass } from "./form-controls";
import { ProblemNotice } from "./problem-notice";
import { classifyWriteError, type WriteProblem } from "./write-errors";

const emptyForm = {
  title: "",
  description: "",
  category: "water" as NeedCategory,
  ubigeo: "",
  eventId: "",
  pointId: "",
  deadline: "",
  quantity: "",
  contact: "",
};

export function NeedFormDialog({
  open,
  onOpenChange,
  org,
  points,
  signedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: Organization;
  points: CollectionPoint[];
  signedIn: boolean;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState(emptyForm);
  const [problem, setProblem] = useState<WriteProblem | null>(null);
  const [created, setCreated] = useState<Need | null>(null);
  const set = (p: Partial<typeof emptyForm>) => setF((s) => ({ ...s, ...p }));
  const territory = DEMO_TERRITORIES.find((t) => t.ubigeo === f.ubigeo);
  const events = useMemo(() => DEMO_EVENTS.filter((e) => e.publicationStatus === "published"), []);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!territory) throw new Error("Elige la localidad destinataria");
      const res = await client.help.createNeed({
        id: org.id,
        title: f.title.trim(),
        description: f.description.trim(),
        category: f.category,
        destinationTerritory: {
          ubigeo: territory.ubigeo,
          name: territory.name,
          provinceName: territory.provinceName,
          departmentName: territory.departmentName,
        },
        eventId: f.eventId || null,
        collectionPointId: f.pointId || null,
        quantity: f.quantity.trim() || null,
        deadline: f.deadline ? new Date(`${f.deadline}T23:59:00-05:00`) : null,
      });
      if (!res.data) throw new Error(res.error?.message ?? "No pudimos crear la necesidad");
      return res.data;
    },
    onSuccess: (need) => {
      setCreated(need as unknown as Need);
      setProblem(null);
      void qc.invalidateQueries({ queryKey: ["help"] });
    },
    onError: (e) => setProblem(classifyWriteError(e)),
  });

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setF(emptyForm);
      setCreated(null);
      setProblem(null);
    }
  };

  const disabled = !f.title.trim() || !territory || !f.contact.trim() || mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Crear necesidad</DialogTitle>
          <DialogDescription>{org.name}</DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="grid gap-2">
            <strong className="text-[17px]">Necesidad creada</strong>
            <p className="m-0 text-sm text-[color:var(--text-secondary)]">
              {created.id} ya figura en el directorio de vigentes mientras no pase su fecha de
              vigencia.
            </p>
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
            <FormField label="Título" htmlFor="nf-title">
              <Input
                id="nf-title"
                value={f.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Qué se necesita, en una línea"
                maxLength={160}
              />
            </FormField>
            <FormField label="Descripción" htmlFor="nf-desc">
              <Textarea
                id="nf-desc"
                rows={3}
                value={f.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Categoría" htmlFor="nf-cat">
                <select
                  id="nf-cat"
                  className={nativeSelectClass}
                  value={f.category}
                  onChange={(e) => set({ category: e.target.value as NeedCategory })}
                >
                  {NEED_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {NEED_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Localidad destinataria" htmlFor="nf-dest">
                <select
                  id="nf-dest"
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
              <FormField label="Evento relacionado (opcional)" htmlFor="nf-event">
                <select
                  id="nf-event"
                  className={nativeSelectClass}
                  value={f.eventId}
                  onChange={(e) => set({ eventId: e.target.value })}
                >
                  <option value="">Ninguno</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.id} · {e.title}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Punto de recepción" htmlFor="nf-point">
                <select
                  id="nf-point"
                  className={nativeSelectClass}
                  value={f.pointId}
                  onChange={(e) => set({ pointId: e.target.value })}
                >
                  <option value="">Sin punto indicado</option>
                  {points.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.territory.name})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Vigencia hasta" htmlFor="nf-deadline">
                <Input
                  id="nf-deadline"
                  type="date"
                  value={f.deadline}
                  onChange={(e) => set({ deadline: e.target.value })}
                />
              </FormField>
              <FormField
                label="Cantidad (opcional)"
                htmlFor="nf-qty"
                hint="Se mostrará «según actualización de la organización»"
              >
                <Input
                  id="nf-qty"
                  value={f.quantity}
                  onChange={(e) => set({ quantity: e.target.value })}
                  placeholder="Ej.: 200 kits"
                  maxLength={100}
                />
              </FormField>
            </div>
            <FormField
              label="Contacto institucional"
              htmlFor="nf-contact"
              hint="No uses contactos personales de voluntarios."
            >
              <Input
                id="nf-contact"
                type="email"
                value={f.contact}
                onChange={(e) => set({ contact: e.target.value })}
                placeholder="Correo institucional"
              />
            </FormField>
            <div className="grid gap-1.5">
              <span className="text-[11px] font-medium tracking-wider text-[color:var(--text-secondary)] uppercase">
                Vista previa pública
              </span>
              <div className="grid gap-1 rounded-xl border border-[color:var(--border-subtle)] p-3 text-[13px]">
                <span className="text-sm font-medium">{f.title || "Título de la necesidad"}</span>
                <span className="text-[color:var(--text-secondary)]">
                  {org.name} · Destino:{" "}
                  {territory ? `${territory.name}, ${territory.departmentName}` : "—"} ·{" "}
                  {f.quantity ? quantityText(f.quantity) : "Sin cantidad declarada"}
                </span>
              </div>
            </div>
            {problem && <ProblemNotice problem={problem} />}
            {!signedIn && !problem && <ProblemNotice problem={{ kind: "signin" }} />}
            <DialogFooter>
              <Button type="submit" disabled={disabled}>
                {mutation.isPending ? "Enviando…" : "Crear necesidad"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
