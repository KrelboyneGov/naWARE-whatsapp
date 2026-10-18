import { getTableColumns } from "drizzle-orm";
import type { DataSource, ImportRun, OfficialNotice } from "@emergency-map/domain/schemas";
import { dataSourceTable, importRunTable, officialNoticeTable } from "../schema";
import { geoJson, parseArea } from "../utils/postgis";
import { severityFromRow, severityToColumns } from "./shared.mapper";

export const noticeSelection = {
  ...getTableColumns(officialNoticeTable),
  geometry: geoJson(officialNoticeTable.geometry),
};

type NoticeRow = Omit<typeof officialNoticeTable.$inferSelect, "geometry"> & {
  geometry: string | null;
};

export function mapNoticeToDomain(row: NoticeRow): OfficialNotice {
  return {
    id: row.id,
    sourceId: row.sourceId,
    externalId: row.externalId,
    institution: row.institution,
    title: row.title,
    category: row.category,
    severity: severityFromRow(row),
    url: row.url,
    issuedAt: row.issuedAt,
    validFrom: row.validFrom,
    validTo: row.validTo,
    validity: row.validity,
    geometry: parseArea(row.geometry),
    territories: row.territories,
    fetchedAt: row.fetchedAt,
    isDemo: row.isDemo,
  };
}

export const toNoticeInsert = (n: OfficialNotice): typeof officialNoticeTable.$inferInsert => ({
  id: n.id,
  sourceId: n.sourceId,
  externalId: n.externalId,
  institution: n.institution,
  title: n.title,
  category: n.category,
  ...severityToColumns(n.severity),
  url: n.url,
  issuedAt: n.issuedAt,
  validFrom: n.validFrom,
  validTo: n.validTo,
  validity: n.validity,
  geometry: n.geometry,
  territories: n.territories,
  fetchedAt: n.fetchedAt,
  isDemo: n.isDemo,
});

export const mapSourceToDomain = (row: typeof dataSourceTable.$inferSelect): DataSource => ({
  id: row.id,
  name: row.name,
  institution: row.institution,
  infoType: row.infoType,
  accessKind: row.accessKind,
  coverage: row.coverage,
  originalUrl: row.originalUrl,
  lastPublishedAt: row.lastPublishedAt,
  lastSuccessfulFetchAt: row.lastSuccessfulFetchAt,
  health: row.health,
  isDemo: row.isDemo,
});

export const mapImportRunToDomain = (row: typeof importRunTable.$inferSelect): ImportRun => ({
  id: row.id,
  sourceId: row.sourceId,
  startedAt: row.startedAt,
  finishedAt: row.finishedAt,
  status: row.status,
  processed: row.processed,
  duplicatesAvoided: row.duplicatesAvoided,
  errorSummary: row.errorSummary,
});
