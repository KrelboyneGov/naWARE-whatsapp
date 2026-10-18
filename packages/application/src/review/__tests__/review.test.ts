import { describe, expect, it } from "vitest";
import {
  admin,
  citizen,
  makeEvent,
  makeEvidence,
  makeNotice,
  makeWorld,
  moderator,
} from "../../__tests__/fakes/fixtures";
import {
  decideCorroboration,
  decideEvidenceVisibility,
  decidePublication,
  decideRelation,
  listReviewQueue,
  getReviewCase,
  reportClosure,
  reportIssue,
} from "..";

const base = { versionSeq: 1, publicReason: "reason", privateNote: null as string | null };
const corroboration = (over: Record<string, unknown> = {}) => ({
  ...base,
  eventId: "evt-1",
  decision: "corroborate_aspects" as const,
  aspectsChecked: ["two matching reports"],
  limits: "Cause unknown",
  citedEvidenceIds: [] as string[],
  officialNoticeId: null as string | null,
  ...over,
});

describe("authorization", () => {
  it("denies review use cases to plain users and anonymous callers", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1", { publicationStatus: "pending_review" }));
    const pub = { ...base, eventId: "evt-1", decision: "publish" as const };
    expect((await decidePublication(w, pub, citizen())).error?.kind).toBe("forbidden");
    expect((await decidePublication(w, pub)).error?.kind).toBe("unauthenticated");
    expect((await decideCorroboration(w, corroboration(), citizen())).error?.kind).toBe(
      "forbidden",
    );
    expect((await listReviewQueue(w, { page: 1, limit: 10 }, citizen())).error?.kind).toBe(
      "forbidden",
    );
    expect((await getReviewCase(w, { eventId: "evt-1" }, citizen())).error?.kind).toBe("forbidden");
    expect(
      (
        await reportClosure(
          w,
          { ...base, eventId: "evt-1", sourceUrl: null, sourceDescription: "x" },
          citizen(),
        )
      ).error?.kind,
    ).toBe("forbidden");
    expect(w.events.events.get("evt-1")?.publicationStatus).toBe("pending_review");
  });

  it("allows moderators and admins", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1", { publicationStatus: "pending_review" }));
    const pub = { ...base, eventId: "evt-1", decision: "publish" as const };
    expect((await decidePublication(w, pub, admin())).error).toBeNull();
    expect((await listReviewQueue(w, { page: 1, limit: 10 }, moderator())).error).toBeNull();
  });
});

describe("decidePublication", () => {
  it("publishes without touching reviewStatus (failure 1)", async () => {
    const w = makeWorld();
    w.events.seed(
      makeEvent("evt-1", {
        publicationStatus: "pending_review",
        publishedAt: null,
        reviewStatus: "unverified",
      }),
    );
    const r = await decidePublication(
      w,
      { ...base, eventId: "evt-1", decision: "publish" },
      moderator(),
    );
    expect(r.error).toBeNull();
    const e = w.events.events.get("evt-1")!;
    expect(e.publicationStatus).toBe("published");
    expect(e.reviewStatus).toBe("unverified");
    expect(e.publishedAt).not.toBeNull();
    expect(w.review.decisions).toHaveLength(1);
  });

  it("keeps a corroborated review status when withdrawn and republished", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1", { reviewStatus: "corroborated_by_review" }));
    await decidePublication(w, { ...base, eventId: "evt-1", decision: "withdraw" }, moderator());
    expect(w.events.events.get("evt-1")).toMatchObject({
      publicationStatus: "hidden",
      reviewStatus: "corroborated_by_review",
    });
  });

  it("returns stale_version when the decision targets an older version (failure 4)", async () => {
    const w = makeWorld();
    const e = makeEvent("evt-1", { publicationStatus: "pending_review" });
    e.currentVersion = { ...e.currentVersion, seq: 3 };
    w.events.seed(e);
    const r = await decidePublication(
      w,
      { ...base, versionSeq: 2, eventId: "evt-1", decision: "publish" },
      moderator(),
    );
    expect(r.error).toEqual({ kind: "stale_version", currentSeq: 3, attemptedSeq: 2 });
    expect(w.events.events.get("evt-1")?.publicationStatus).toBe("pending_review");
    expect(w.review.decisions).toHaveLength(0);
  });

  it("rejects an invalid transition", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const r = await decidePublication(
      w,
      { ...base, eventId: "evt-1", decision: "publish" },
      moderator(),
    );
    expect(r.error?.kind).toBe("invalid_transition");
  });
});

describe("decideCorroboration", () => {
  it("corroborate_aspects requires aspects checked and limits", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const noAspects = await decideCorroboration(
      w,
      corroboration({ aspectsChecked: [] }),
      moderator(),
    );
    expect(noAspects.error).toMatchObject({ kind: "validation", field: "aspectsChecked" });
    const noLimits = await decideCorroboration(w, corroboration({ limits: "  " }), moderator());
    expect(noLimits.error).toMatchObject({ kind: "validation", field: "limits" });
    expect(w.events.events.get("evt-1")?.reviewStatus).toBe("unverified");
  });

  it("corroborate_aspects sets corroborated_by_review and records what was checked", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const r = await decideCorroboration(w, corroboration(), moderator());
    expect(r.error).toBeNull();
    expect(w.events.events.get("evt-1")?.reviewStatus).toBe("corroborated_by_review");
    expect(r.data?.details).toMatchObject({
      aspectsChecked: ["two matching reports"],
      limits: "Cause unknown",
    });
  });

  it("link_official_backing requires an existing official notice", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const link = (id: string | null) =>
      corroboration({ decision: "link_official_backing", officialNoticeId: id });
    expect((await decideCorroboration(w, link(null), moderator())).error?.kind).toBe("validation");
    expect((await decideCorroboration(w, link("missing"), moderator())).error?.kind).toBe(
      "not_found",
    );
    w.notices.seed(makeNotice("ntc-1"));
    const ok = await decideCorroboration(w, link("ntc-1"), moderator());
    expect(ok.error).toBeNull();
    expect(w.events.events.get("evt-1")?.reviewStatus).toBe("officially_backed");
  });

  it("record_contributions counts independent public contributions and is not corroboration", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const input = corroboration({
      decision: "record_contributions",
      aspectsChecked: [],
      limits: null,
    });
    expect((await decideCorroboration(w, input, moderator())).error?.kind).toBe("validation");

    w.evidence.seed(makeEvidence("e1", "evt-1", { authorId: "a" }));
    w.evidence.seed(makeEvidence("e2", "evt-1", { authorId: "b" }));
    w.evidence.seed(makeEvidence("e3", "evt-1", { authorId: "c", duplicateOfEvidenceId: "e1" }));
    const r = await decideCorroboration(w, input, moderator());
    expect(r.error).toBeNull();
    expect(w.events.events.get("evt-1")).toMatchObject({
      reviewStatus: "with_contributions",
      contributionCount: 2,
    });
  });

  it("rejects cited evidence from another event", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    w.evidence.seed(makeEvidence("e-other", "evt-2"));
    const r = await decideCorroboration(
      w,
      corroboration({ citedEvidenceIds: ["e-other"] }),
      moderator(),
    );
    expect(r.error).toMatchObject({ kind: "validation", field: "citedEvidenceIds" });
  });

  it("returns stale_version before applying anything", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const r = await decideCorroboration(w, corroboration({ versionSeq: 5 }), moderator());
    expect(r.error?.kind).toBe("stale_version");
  });
});

describe("decideRelation", () => {
  it("merge keeps both rows, marks the merged one and records a decision on both", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    w.events.seed(makeEvent("evt-2"));
    w.evidence.seed(makeEvidence("e1", "evt-1"));
    const r = await decideRelation(
      w,
      { ...base, eventId: "evt-1", decision: "merge", otherEventId: "evt-2", evidenceIds: [] },
      moderator(),
    );
    expect(r.error).toBeNull();
    expect(w.events.events.get("evt-1")).toMatchObject({
      publicationStatus: "merged",
      mergedIntoEventId: "evt-2",
    });
    expect(w.events.events.get("evt-2")?.publicationStatus).toBe("published");
    expect(w.evidence.items.get("e1")?.eventId).toBe("evt-1"); // nothing moved
    expect(w.review.decisions.map((d) => d.eventId).sort()).toEqual(["evt-1", "evt-2"]);
  });

  it("does not merge into an event that is already merged", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    w.events.seed(makeEvent("evt-2", { publicationStatus: "merged", mergedIntoEventId: "evt-3" }));
    const r = await decideRelation(
      w,
      { ...base, eventId: "evt-1", decision: "merge", otherEventId: "evt-2", evidenceIds: [] },
      moderator(),
    );
    expect(r.error?.kind).toBe("conflict");
  });

  it("split requires evidence of the event and moves only that evidence", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    w.events.seed(makeEvent("evt-2"));
    w.evidence.seed(makeEvidence("e1", "evt-1"));
    w.evidence.seed(makeEvidence("e2", "evt-1"));
    const input = { ...base, eventId: "evt-1", decision: "split" as const, otherEventId: "evt-2" };
    expect((await decideRelation(w, { ...input, evidenceIds: [] }, moderator())).error?.kind).toBe(
      "validation",
    );
    const r = await decideRelation(w, { ...input, evidenceIds: ["e1"] }, moderator());
    expect(r.error).toBeNull();
    expect(w.evidence.items.get("e1")?.eventId).toBe("evt-2");
    expect(w.evidence.items.get("e2")?.eventId).toBe("evt-1");
  });

  it("link records the relation without changing statuses", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    w.events.seed(makeEvent("evt-2"));
    await decideRelation(
      w,
      { ...base, eventId: "evt-1", decision: "link", otherEventId: "evt-2", evidenceIds: [] },
      moderator(),
    );
    expect(w.events.events.get("evt-1")?.publicationStatus).toBe("published");
    expect(w.review.decisions).toHaveLength(2);
  });
});

describe("reportClosure", () => {
  const closure = (over: Record<string, unknown> = {}) => ({
    ...base,
    eventId: "evt-1",
    sourceUrl: null as string | null,
    sourceDescription: "Municipal bulletin of 17 Oct",
    ...over,
  });

  it("requires a source", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const r = await reportClosure(w, closure({ sourceDescription: "  " }), moderator());
    expect(r.error?.kind).toBe("validation");
    expect(w.events.events.get("evt-1")?.situationStatus).toBe("recent_update");
  });

  it("sets closure_reported and records the source", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const r = await reportClosure(w, closure(), moderator());
    expect(r.error).toBeNull();
    expect(w.events.events.get("evt-1")?.situationStatus).toBe("closure_reported");
    expect(r.data?.details).toMatchObject({ sourceDescription: "Municipal bulletin of 17 Oct" });
  });
});

describe("reportIssue", () => {
  it("lets any signed-in user flag a visible event and queues it", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const input = {
      eventId: "evt-1",
      type: "wrong_location" as const,
      explanation: "Not here",
      url: null,
    };
    expect((await reportIssue(w, input)).error?.kind).toBe("unauthenticated");
    const r = await reportIssue(w, input, citizen());
    expect(r.data).toMatchObject({ status: "open", reporterId: "user-1" });
    expect(w.review.issues).toHaveLength(1);
    expect(w.review.queue.at(-1)?.reason).toBe("issue_reported");
    expect(w.events.events.get("evt-1")?.reviewStatus).toBe("unverified");
  });
});

describe("decideEvidenceVisibility", () => {
  it("makes evidence public and refreshes the independent count", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    w.evidence.seed(makeEvidence("e1", "evt-1", { visibility: "pending" }));
    const r = await decideEvidenceVisibility(
      w,
      { evidenceId: "e1", visibility: "public" },
      moderator(),
    );
    expect(r.data?.contributionCount).toBe(1);
    expect(w.events.events.get("evt-1")).toMatchObject({
      contributionCount: 1,
      reviewStatus: "unverified",
    });
    expect(
      (await decideEvidenceVisibility(w, { evidenceId: "e1", visibility: "public" }, citizen()))
        .error?.kind,
    ).toBe("forbidden");
  });
});
