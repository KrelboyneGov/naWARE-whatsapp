import type { Severity, TerritoryRef } from "@emergency-map/domain/schemas";

export interface SeverityColumns {
  severityLevel: string | null;
  severityIssuer: string | null;
  severityLegend: string | null;
}

export const severityFromRow = (row: SeverityColumns): Severity | null =>
  row.severityLevel === null
    ? null
    : {
        level: row.severityLevel,
        issuer: row.severityIssuer ?? "",
        legend: row.severityLegend ?? "",
      };

export const severityToColumns = (severity: Severity | null): SeverityColumns => ({
  severityLevel: severity?.level ?? null,
  severityIssuer: severity?.issuer ?? null,
  severityLegend: severity?.legend ?? null,
});

export const territoryRef = (
  ubigeo: string,
  name: string,
  provinceName: string | null,
  departmentName: string,
): TerritoryRef => ({ ubigeo, name, provinceName, departmentName });
