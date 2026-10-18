import type { OccurredAt, Place } from "@emergency-map/domain/schemas";
import { formatDateTime } from "@/lib/labels";

const dayFormat = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  dateStyle: "long",
});

/** "ocurrió" label honouring how precisely the time is known. */
export function formatOccurred(o: OccurredAt): string {
  const start = new Date(o.start);
  switch (o.precision) {
    case "exact":
      return formatDateTime(start);
    case "hour":
      return `Alrededor de ${formatDateTime(start)}`;
    case "day":
      return `El ${dayFormat.format(start)} (hora no precisada)`;
    case "interval":
      return o.end
        ? `Entre ${formatDateTime(start)} y ${formatDateTime(new Date(o.end))}`
        : `Desde ${formatDateTime(start)}`;
  }
}

/** Locality line: district, province/department without repeating equal names. */
export function formatLocality(place: Place): string {
  const t = place.territory;
  return [t.name, t.provinceName, t.departmentName]
    .filter((v, i, a): v is string => !!v && a.indexOf(v) === i)
    .join(", ");
}
