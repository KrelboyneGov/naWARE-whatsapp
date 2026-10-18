import type { DataSource } from "@emergency-map/domain/schemas";
import { describe, expect, it } from "vitest";
import { FakeImporter } from "../../__tests__/fakes/repositories";
import {
  admin,
  citizen,
  hoursFromNow,
  limaRef,
  makeEvent,
  makeNotice,
  makeWorld,
  NOW,
} from "../../__tests__/fakes/fixtures";
import { importOfficialNotices, listDataSources, recordImportRun } from "..";

const source: DataSource = {
  id: "src-1",
  name: "SENAMHI warnings",
  institution: "SENAMHI",
  infoType: "weather",
  accessKind: "file",
  coverage: "National",
  originalUrl: null,
  lastPublishedAt: null,
  lastSuccessfulFetchAt: null,
  health: "stale",
  isDemo: false,
};

function raw(externalId: string, validTo: Date | null, title = "Rain") {
  const {
    id: _id,
    fetchedAt: _f,
    validity: _v,
    ...rest
  } = makeNotice(externalId, { externalId, validTo, title });
  return rest;
}

function setup(importer: FakeImporter) {
  const w = makeWorld();
  w.dataSources.seed(source);
  return { w, deps: { ...w, importers: [importer] } };
}

describe("importOfficialNotices", () => {
  it("computes validity from validTo versus the clock", async () => {
    const importer = new FakeImporter("src-1", [
      raw("a", hoursFromNow(5)),
      raw("b", hoursFromNow(-5)),
      raw("c", null),
    ]);
    const { w, deps } = setup(importer);
    const r = await importOfficialNotices(deps, { sourceId: "src-1" });
    expect(r.data).toMatchObject({ status: "success", processed: 3 });
    const validity = Object.fromEntries(
      [...w.notices.items.values()].map((n) => [n.externalId, n.validity]),
    );
    expect(validity).toEqual({ a: "active", b: "expired", c: "active" });
    expect(w.dataSources.items.get("src-1")).toMatchObject({
      health: "up_to_date",
      lastSuccessfulFetchAt: NOW,
    });
  });

  it("upserts by externalId and counts unchanged notices as duplicates avoided", async () => {
    const importer = new FakeImporter("src-1", [raw("a", hoursFromNow(5))]);
    const { w, deps } = setup(importer);
    await importOfficialNotices(deps, { sourceId: "src-1" });
    const again = await importOfficialNotices(deps, { sourceId: "src-1" });
    expect(w.notices.items.size).toBe(1);
    expect(again.data).toMatchObject({ processed: 1, duplicatesAvoided: 1 });
    importer.notices = [raw("a", hoursFromNow(5), "Rain updated")];
    await importOfficialNotices(deps, { sourceId: "src-1" });
    expect([...w.notices.items.values()][0]?.title).toBe("Rain updated");
  });

  it("an expired notice never changes an event's situationStatus (failure 2)", async () => {
    const importer = new FakeImporter("src-1", [raw("a", hoursFromNow(-48))]);
    const { w, deps } = setup(importer);
    w.events.seed(makeEvent("evt-1", { situationStatus: "recent_update" }));
    await importOfficialNotices(deps, { sourceId: "src-1" });
    expect([...w.notices.items.values()][0]?.validity).toBe("expired");
    expect(w.events.events.get("evt-1")?.situationStatus).toBe("recent_update");
  });

  it("records a failed run and keeps previous notices when the importer throws", async () => {
    const importer = new FakeImporter("src-1", [raw("a", hoursFromNow(5))]);
    const { w, deps } = setup(importer);
    await importOfficialNotices(deps, { sourceId: "src-1" });
    importer.failWith = new Error("HTML layout changed");
    const r = await importOfficialNotices(deps, { sourceId: "src-1" });
    expect(r.error).toMatchObject({ kind: "dependency_failed" });
    expect(w.notices.items.size).toBe(1);
    expect(w.dataSources.runs.at(-1)).toMatchObject({
      status: "failed",
      errorSummary: "HTML layout changed",
    });
    expect(w.dataSources.items.get("src-1")?.health).toBe("error");
    expect(w.dataSources.items.get("src-1")?.lastSuccessfulFetchAt).toEqual(NOW);
  });

  it("allows the system or an admin, not other users", async () => {
    const importer = new FakeImporter("src-1", []);
    const { deps } = setup(importer);
    expect((await importOfficialNotices(deps, { sourceId: "src-1" }, citizen())).error?.kind).toBe(
      "forbidden",
    );
    expect((await importOfficialNotices(deps, { sourceId: "src-1" }, admin())).error).toBeNull();
    expect((await importOfficialNotices(deps, { sourceId: "nope" })).error?.kind).toBe("not_found");
  });
});

describe("recordImportRun / listDataSources", () => {
  it("lists sources and stores a run", async () => {
    const { w, deps } = setup(new FakeImporter("src-1"));
    const r = await recordImportRun(deps, {
      sourceId: "src-1",
      startedAt: NOW,
      finishedAt: NOW,
      status: "partial",
      processed: 2,
      duplicatesAvoided: 0,
      errorSummary: "1 failed",
    });
    expect(r.data?.id).toBe("run-1");
    expect(w.dataSources.items.get("src-1")?.health).toBe("delayed");
    expect((await listDataSources(deps)).data).toHaveLength(1);
    expect(limaRef.ubigeo).toBe("150101");
  });
});
