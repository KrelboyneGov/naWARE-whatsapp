import { foldText } from "./opt-out";

/**
 * SENAMHI notices name macro-zones ("PRECIPITACIONES EN LA SIERRA NORTE Y COSTA NORTE",
 * "INCREMENTO DE VIENTO EN LA COSTA CENTRO Y SUR Y SIERRA SUR"). This maps a department to
 * the zones it belongs to, so a notice can be marked as possibly covering a place. It is an
 * approximation: the notice's own map decides, and replies must link to it.
 */
export type MacroZone = `${"costa" | "sierra" | "selva"} ${"norte" | "centro" | "sur"}`;

const DEPARTMENT_ZONES: Record<string, MacroZone[]> = {
  tumbes: ["costa norte"],
  piura: ["costa norte", "sierra norte"],
  lambayeque: ["costa norte", "sierra norte"],
  "la libertad": ["costa norte", "sierra norte"],
  cajamarca: ["sierra norte", "selva norte"],
  amazonas: ["sierra norte", "selva norte"],
  loreto: ["selva norte"],
  "san martin": ["selva norte"],
  ancash: ["costa centro", "sierra centro"],
  lima: ["costa centro", "sierra centro"],
  callao: ["costa centro"],
  huanuco: ["sierra centro", "selva centro"],
  pasco: ["sierra centro", "selva centro"],
  junin: ["sierra centro", "selva centro"],
  huancavelica: ["sierra centro", "sierra sur"],
  ucayali: ["selva centro"],
  ica: ["costa centro", "costa sur"],
  ayacucho: ["sierra centro", "sierra sur"],
  apurimac: ["sierra sur"],
  cusco: ["sierra sur", "selva sur"],
  "madre de dios": ["selva sur"],
  arequipa: ["costa sur", "sierra sur"],
  moquegua: ["costa sur", "sierra sur"],
  tacna: ["costa sur", "sierra sur"],
  puno: ["sierra sur", "selva sur"],
};

/** "Departamento de Cusco" → "Cusco", "Provincia de Lima" → "Lima". */
export function cleanRegionName(region: string): string {
  return region
    .replace(
      /^(departamento|región|region|gobierno regional|provincia constitucional del|provincia) (de |del )?/i,
      "",
    )
    .trim();
}

export function departmentZones(department: string | null | undefined): MacroZone[] {
  if (!department) return [];
  return DEPARTMENT_ZONES[foldText(cleanRegionName(department))] ?? [];
}

/** Zones a notice title names. "COSTA Y SIERRA" with no direction means all of them. */
export function noticeZones(title: string): MacroZone[] {
  const folded = foldText(title);
  const zones = new Set<MacroZone>();
  const regions = ["costa", "sierra", "selva"] as const;
  const pattern = /\b(costa|sierra|selva)\b/g;
  const hits = [...folded.matchAll(pattern)];
  hits.forEach((hit, index) => {
    const start = (hit.index ?? 0) + hit[0].length;
    const end = hits[index + 1]?.index ?? folded.length;
    const tail = folded.slice(start, end);
    const directions = (["norte", "centro", "sur"] as const).filter((direction) =>
      new RegExp(`\\b${direction}\\b`).test(tail),
    );
    const region = hit[1] as (typeof regions)[number];
    for (const direction of directions.length > 0
      ? directions
      : (["norte", "centro", "sur"] as const)) {
      zones.add(`${region} ${direction}`);
    }
  });
  return [...zones];
}

/**
 * Zones of a place: the department's zones, narrowed by altitude when it is known. Above about
 * 2000 m a place is in the sierra (Huaraz, Yura, Cusco); below 1000 m it is not (Lima, Piura).
 */
export function placeZones(
  department: string | null | undefined,
  elevationM?: number | null,
): MacroZone[] {
  const zones = departmentZones(department);
  if (elevationM == null) return zones;
  const sierra = zones.filter((zone) => zone.startsWith("sierra"));
  const lowland = zones.filter((zone) => !zone.startsWith("sierra"));
  if (elevationM >= 2000 && sierra.length > 0) return sierra;
  if (elevationM < 1000 && lowland.length > 0) return lowland;
  return zones;
}

/** True when the notice names a zone of the place. Unknown department: false. */
export function noticeMayCoverDepartment(
  title: string,
  department: string | null | undefined,
  elevationM?: number | null,
): boolean {
  const zones = placeZones(department, elevationM);
  if (zones.length === 0) return false;
  const named = noticeZones(title);
  return named.some((zone) => zones.includes(zone));
}
