import type { Actor, ImportRun, OfficialNotice } from "@emergency-map/domain/schemas";
import { err } from "@emergency-map/domain/types";
import type { NoticeValidity } from "@emergency-map/domain/constants";
import type { UseCaseResult } from "../shared/result";
import { forbidden, notFound } from "../shared/result";
import type { SourcesDeps } from "./deps";
import { recordImportRun } from "./record-import-run";

/** Validity depends only on validTo versus the clock; it says nothing about any event. */
export function computeValidity(validTo: Date | null, now: Date): NoticeValidity {
  return validTo !== null && validTo < now ? "expired" : "active";
}

/**
 * Pulls notices through the source's IOfficialNoticeImporter and upserts them by externalId.
 * Called by a scheduler (no actor) or an admin. Events are not part of the deps on purpose: an
 * expired notice cannot change any event's situationStatus (failure 2). If the importer throws,
 * a failed run is recorded and notices already stored stay as they were.
 */
export async function importOfficialNotices(
  deps: SourcesDeps,
  input: { sourceId: string },
  actor?: Actor,
): Promise<UseCaseResult<ImportRun>> {
  if (actor && actor.role !== "admin") return forbidden("Only an admin can run an import");

  const source = await deps.dataSources.findById(input.sourceId);
  if (!source) return notFound("data_source", input.sourceId);
  const importer = deps.importers.find((i) => i.sourceId === source.id);
  if (!importer) {
    return err({
      kind: "dependency_failed",
      dependency: "official_notice_importer",
      message: `No importer registered for source ${source.id}`,
    });
  }

  const startedAt = deps.clock.now();
  let raw: Awaited<ReturnType<typeof importer.fetchNotices>>;
  try {
    raw = await importer.fetchNotices();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await recordImportRun(deps, {
      sourceId: source.id,
      startedAt,
      finishedAt: deps.clock.now(),
      status: "failed",
      processed: 0,
      duplicatesAvoided: 0,
      errorSummary: message,
    });
    return err({ kind: "dependency_failed", dependency: source.id, message });
  }

  const fetchedAt = deps.clock.now();
  let processed = 0;
  let unchanged = 0;
  let failures = 0;
  let lastError: string | null = null;
  let latestIssuedAt: Date | null = null;

  for (const item of raw) {
    const notice: OfficialNotice = {
      ...item,
      sourceId: source.id,
      id: deps.ids.next("ntc"),
      fetchedAt,
      validity: computeValidity(item.validTo, fetchedAt),
    };
    try {
      const outcome = await deps.notices.upsert(notice);
      processed += 1;
      if (outcome === "unchanged") unchanged += 1;
      if (!latestIssuedAt || notice.issuedAt > latestIssuedAt) latestIssuedAt = notice.issuedAt;
    } catch (e) {
      failures += 1;
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  const status = failures === 0 ? "success" : processed > 0 ? "partial" : "failed";
  const recorded = await recordImportRun(deps, {
    sourceId: source.id,
    startedAt,
    finishedAt: deps.clock.now(),
    status,
    processed,
    duplicatesAvoided: unchanged,
    errorSummary: failures > 0 ? `${failures} notice(s) failed: ${lastError}` : null,
  });
  if (recorded.error) return recorded;

  if (latestIssuedAt && status !== "failed") {
    await deps.dataSources.update(source.id, { lastPublishedAt: latestIssuedAt });
  }
  return recorded;
}
