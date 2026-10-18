import { useMemo, useState } from "react";
import { Button } from "@emergency-map/web-ui";
import type { Territory } from "@emergency-map/domain/schemas";
import { cn } from "@/lib/utils";

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary";

const uniq = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "es"));

/**
 * Department / province / district cascade. No GPS: the visitor picks any locality and it is
 * kept on this device only.
 */
export function LocalityPicker({
  territories,
  initialUbigeo,
  onSave,
  onCancel,
}: {
  territories: Territory[];
  initialUbigeo: string | null;
  onSave: (ubigeo: string) => void;
  onCancel?: () => void;
}) {
  const districts = useMemo(() => territories.filter((t) => t.level === "district"), [territories]);
  const initial = districts.find((t) => t.ubigeo === initialUbigeo) ?? districts[0];
  const [dept, setDept] = useState(initial?.departmentName ?? "");
  const [prov, setProv] = useState(initial?.provinceName ?? "");
  const [ubigeo, setUbigeo] = useState(initial?.ubigeo ?? "");

  const depts = uniq(districts.map((t) => t.departmentName));
  const provs = uniq(
    districts.filter((t) => t.departmentName === dept).map((t) => t.provinceName ?? t.name),
  );
  const dists = districts.filter(
    (t) => t.departmentName === dept && (t.provinceName ?? t.name) === prov,
  );

  const changeDept = (v: string) => {
    const first = districts.find((t) => t.departmentName === v);
    setDept(v);
    setProv(first?.provinceName ?? first?.name ?? "");
    setUbigeo(first?.ubigeo ?? "");
  };
  const changeProv = (v: string) => {
    const first = districts.find(
      (t) => t.departmentName === dept && (t.provinceName ?? t.name) === v,
    );
    setProv(v);
    setUbigeo(first?.ubigeo ?? "");
  };

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ubigeo) onSave(ubigeo);
      }}
    >
      <div className="grid gap-1">
        <h1 className="font-heading text-[28px] font-semibold tracking-tight">
          Elige tu localidad
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Departamento, provincia y distrito. Puedes elegir cualquier localidad; no usamos tu
          ubicación real ni pedimos GPS. Se guarda en este dispositivo.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Departamento" id="pick-dept">
          <select
            id="pick-dept"
            className={selectClass}
            value={dept}
            onChange={(e) => changeDept(e.target.value)}
          >
            {depts.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Provincia" id="pick-prov">
          <select
            id="pick-prov"
            className={selectClass}
            value={prov}
            onChange={(e) => changeProv(e.target.value)}
          >
            {provs.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Distrito" id="pick-dist">
          <select
            id="pick-dist"
            className={selectClass}
            value={ubigeo}
            onChange={(e) => setUbigeo(e.target.value)}
          >
            {dists.map((t) => (
              <option key={t.ubigeo} value={t.ubigeo}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className={cn("flex gap-2")}>
        <Button type="submit" disabled={!ubigeo}>
          Guardar localidad
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
