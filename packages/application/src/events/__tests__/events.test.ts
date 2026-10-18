import type { SubmitReportInput } from "@emergency-map/domain/schemas";
import { DUPLICATE_MAX_SUGGESTIONS } from "@emergency-map/domain/constants";
import { describe, expect, it } from "vitest";
import {
  citizen,
  districtPlace,
  exactPlace,
  hoursFromNow,
  makeEvent,
  makeEvidence,
  makeWorld,
  moderator,
  NOW,
} from "../../__tests__/fakes/fixtures";
import {
  findPossibleDuplicates,
  getEvent,
  listActivity,
  listEvents,
  shareSummary,
  submitReport,
} from "..";

const reportInput = (over: Partial<SubmitReportInput> = {}): SubmitReportInput => ({
  category: "landslide",
  title: "  Huaico en la quebrada  ",
  description: "Bloquea el camino",
  observedPersonally: "yes",
  sourceUrl: null,
  place: exactPlace(),
  privateLocation: { lat: -11.9401, lng: -76.7001 },
  occurredAt: { precision: "exact", start: NOW, end: null },
  dismissedDuplicateIds: [],
  ...over,
});

describe("submitReport", () => {
  it("requires an actor", async () => {
    const w = makeWorld();
    const r = await submitReport(w, reportInput());
    expect(r.error).toEqual({ kind: "unauthenticated" });
  });

  it("creates a pending, unverified citizen event at version 1 and queues it", async () => {
    const w = makeWorld();
    const r = await submitReport(w, reportInput(), citizen());
    expect(r.error).toBeNull();
    const event = w.events.events.get(r.data!.id)!;
    expect(event).toMatchObject({
      origin: "citizen",
      publicationStatus: "pending_review",
      reviewStatus: "unverified",
      isDemo: false,
      authorId: "user-1",
      privateLocation: { lat: -11.9401, lng: -76.7001 },
      lastUpdatedAt: NOW,
    });
    expect(event.currentVersion).toMatchObject({ seq: 1, title: "Huaico en la quebrada" });
    expect(w.review.queue).toEqual([
      { eventId: event.id, reason: "new_report", versionSeq: 1, at: NOW },
    ]);
    expect(w.events.activity).toHaveLength(1);
    expect(w.events.activity[0]).toMatchObject({ type: "new_report", isDemo: false });
  });

  it("queues as possible_duplicate when a candidate exists and was not dismissed", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-old"));
    const r = await submitReport(w, reportInput(), citizen());
    expect(w.review.queue[0]?.reason).toBe("possible_duplicate");
    expect(r.data).not.toBeNull();
  });

  it("queues as new_report when the user dismissed the suggestions", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-old"));
    await submitReport(w, reportInput({ dismissedDuplicateIds: ["evt-old"] }), citizen());
    expect(w.review.queue[0]?.reason).toBe("new_report");
  });

  it("rejects a district-precision place that carries a point", async () => {
    const w = makeWorld();
    const place = { ...districtPlace(), point: { lat: -11.9, lng: -76.7 } };
    const r = await submitReport(w, reportInput({ place }), citizen());
    expect(r.error?.kind).toBe("validation");
    expect(w.events.events.size).toBe(0);
  });
});

describe("findPossibleDuplicates", () => {
  const search = {
    category: "landslide" as const,
    place: exactPlace(),
    occurredAt: { precision: "exact" as const, start: NOW, end: null },
  };

  it("returns at most 3, ignoring pending and merged events", async () => {
    const w = makeWorld();
    for (let i = 0; i < 5; i++)
      w.events.seed(makeEvent(`evt-${i}`, { occurred: hoursFromNow(-i) }));
    w.events.seed(makeEvent("evt-pending", { publicationStatus: "pending_review" }));
    w.events.seed(
      makeEvent("evt-merged", { publicationStatus: "merged", mergedIntoEventId: "evt-0" }),
    );
    const r = await findPossibleDuplicates(w, search);
    expect(r.data).toHaveLength(DUPLICATE_MAX_SUGGESTIONS);
    const ids = r.data!.map((c) => c.event.id);
    expect(ids).not.toContain("evt-pending");
    expect(ids).not.toContain("evt-merged");
  });

  it("gives no distance when either side is district-precision (failure 10)", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-district", { place: districtPlace() }));
    w.events.seed(makeEvent("evt-exact"));
    const r = await findPossibleDuplicates(w, search);
    const byId = Object.fromEntries(r.data!.map((c) => [c.event.id, c]));
    expect(byId["evt-district"]?.approxDistanceKm).toBeNull();
    expect(byId["evt-exact"]?.approxDistanceKm).not.toBeNull();
  });

  it("ignores events outside the time window", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-far", { occurred: hoursFromNow(-100) }));
    const r = await findPossibleDuplicates(w, search);
    expect(r.data).toEqual([]);
  });
});

describe("getEvent", () => {
  it("never exposes the private location or the author id (failure 6)", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const r = await getEvent(w, { eventId: "evt-1" });
    const json = JSON.stringify(r.data);
    expect(json).not.toContain("privateLocation");
    expect(json).not.toContain("authorId");
    expect(json).not.toContain("-76.7001");
  });

  it("hides non-published events except from the author and moderators", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-p", { publicationStatus: "pending_review", authorId: "user-1" }));
    expect((await getEvent(w, { eventId: "evt-p" })).error?.kind).toBe("not_found");
    expect((await getEvent(w, { eventId: "evt-p" }, citizen("other"))).error?.kind).toBe(
      "not_found",
    );
    expect((await getEvent(w, { eventId: "evt-p" }, citizen("user-1"))).error).toBeNull();
    expect((await getEvent(w, { eventId: "evt-p" }, moderator())).error).toBeNull();
  });

  it("returns mergedIntoEventId for a merged event", async () => {
    const w = makeWorld();
    w.events.seed(
      makeEvent("evt-m", { publicationStatus: "merged", mergedIntoEventId: "evt-main" }),
    );
    const r = await getEvent(w, { eventId: "evt-m" });
    expect(r.data?.mergedIntoEventId).toBe("evt-main");
  });

  it("returns only public evidence and public decisions", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    w.evidence.seed(makeEvidence("e-pub", "evt-1"));
    w.evidence.seed(makeEvidence("e-pending", "evt-1", { visibility: "pending" }));
    await w.review.recordDecision({
      id: "d1",
      eventId: "evt-1",
      versionSeq: 1,
      kind: "publication",
      decision: "publish",
      actorId: "mod-1",
      publicReason: "ok",
      privateNote: "secret note",
      details: {},
      decidedAt: NOW,
    });
    const r = await getEvent(w, { eventId: "evt-1" });
    expect(r.data?.evidence.map((e) => e.id)).toEqual(["e-pub"]);
    expect(JSON.stringify(r.data)).not.toContain("secret note");
    expect(JSON.stringify(r.data)).not.toContain("mod-1");
  });
});

describe("listEvents / listActivity", () => {
  it("lists only published, non-merged events (failure 5)", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-ok"));
    w.events.seed(makeEvent("evt-hidden", { publicationStatus: "hidden" }));
    w.events.seed(
      makeEvent("evt-merged", { publicationStatus: "merged", mergedIntoEventId: "evt-ok" }),
    );
    const r = await listEvents(w, {
      page: 1,
      limit: 20,
      sort: "last_updated",
      dateField: "occurred",
      includeDemo: true,
    });
    expect(r.data?.data.map((e) => e.id)).toEqual(["evt-ok"]);
    expect(r.data?.meta).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it("paginates the activity feed", async () => {
    const w = makeWorld();
    await submitReport(w, reportInput(), citizen());
    const r = await listActivity(w, {
      page: 1,
      limit: 10,
      dateField: "occurred",
      includeDemo: true,
    });
    expect(r.data?.data).toHaveLength(1);
  });
});

describe("shareSummary", () => {
  it("returns labels as English keys, a url path and the demo flag, with no location", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1", { isDemo: true, reviewStatus: "with_contributions" }));
    const r = await shareSummary(w, { eventId: "evt-1" });
    expect(r.data).toMatchObject({
      title: "Event evt-1",
      reviewLabel: "with_contributions",
      publicationLabel: "published",
      urlPath: "/eventos/evt-1",
      isDemo: true,
    });
    expect(JSON.stringify(r.data)).not.toMatch(/-76\.7|lat|lng|privateLocation/);
  });

  it("does not share an unpublished event", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-p", { publicationStatus: "pending_review" }));
    expect((await shareSummary(w, { eventId: "evt-p" })).error?.kind).toBe("not_found");
  });
});
