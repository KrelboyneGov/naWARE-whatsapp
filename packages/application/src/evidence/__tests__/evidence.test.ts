import { describe, expect, it } from "vitest";
import {
  citizen,
  makeEvent,
  makeEvidence,
  makeWorld,
  moderator,
} from "../../__tests__/fakes/fixtures";
import { addEvidence, listEvidenceForEvent, requestUploadUrl } from "..";

const photo = (fileSha256: string | null) => ({
  eventId: "evt-1",
  type: "photo" as const,
  description: "photo of the road",
  storageKey: "evidence/x.jpg",
  fileSha256,
  url: null,
  observedPersonally: true,
  ownsImage: true,
  declaredCapturedAt: null,
});

describe("addEvidence", () => {
  it("queues new_evidence and never changes the event review status (failure 1)", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1", { reviewStatus: "unverified" }));
    const r = await addEvidence(w, photo("hash-a"), citizen("u1"));
    expect(r.error).toBeNull();
    expect(r.data).toMatchObject({
      visibility: "pending",
      isDemo: false,
      duplicateOfEvidenceId: null,
    });
    expect(w.review.queue.at(-1)).toMatchObject({ eventId: "evt-1", reason: "new_evidence" });
    expect(w.events.events.get("evt-1")?.reviewStatus).toBe("unverified");
  });

  it("flags the same file hash as a duplicate that is not an independent contribution (failure 3)", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const first = await addEvidence(w, photo("same-hash"), citizen("u1"));
    const second = await addEvidence(w, photo("same-hash"), citizen("u2"));
    expect(second.data?.duplicateOfEvidenceId).toBe(first.data?.id);

    // Both become public: only the original counts.
    await w.evidence.update(first.data!.id, { visibility: "public" });
    await w.evidence.update(second.data!.id, { visibility: "public" });
    expect(await w.evidence.countIndependent("evt-1")).toBe(1);
  });

  it("requires an actor and a visible event", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1", { publicationStatus: "pending_review", authorId: "someone" }));
    expect((await addEvidence(w, photo(null))).error?.kind).toBe("unauthenticated");
    expect((await addEvidence(w, photo(null), citizen("u1"))).error?.kind).toBe("not_found");
  });

  it("rejects a photo without an uploaded file", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    const r = await addEvidence(w, { ...photo(null), storageKey: null }, citizen());
    expect(r.error?.kind).toBe("validation");
  });
});

describe("listEvidenceForEvent", () => {
  it("shows public items only to visitors and everything to moderators, without author ids", async () => {
    const w = makeWorld();
    w.events.seed(makeEvent("evt-1"));
    w.evidence.seed(makeEvidence("e1", "evt-1"));
    w.evidence.seed(makeEvidence("e2", "evt-1", { visibility: "pending" }));
    const pub = await listEvidenceForEvent(w, { eventId: "evt-1" });
    expect(pub.data?.map((e) => e.id)).toEqual(["e1"]);
    expect(JSON.stringify(pub.data)).not.toContain("authorId");
    const mod = await listEvidenceForEvent(w, { eventId: "evt-1" }, moderator());
    expect(mod.data).toHaveLength(2);
  });
});

describe("requestUploadUrl", () => {
  it("returns a key scoped to the user and the storage's simulated flag", async () => {
    const w = makeWorld();
    const r = await requestUploadUrl(
      w,
      { fileName: "my photo.jpg", contentType: "image/jpeg", sizeBytes: 1000 },
      citizen("u1"),
    );
    expect(r.data?.storageKey).toMatch(/^evidence\/u1\/file-1-my_photo\.jpg$/);
    expect(r.data?.simulated).toBe(true);
  });

  it("rejects oversized files and anonymous callers", async () => {
    const w = makeWorld();
    const input = { fileName: "a.jpg", contentType: "image/jpeg" as const, sizeBytes: 99_000_000 };
    expect((await requestUploadUrl(w, input, citizen())).error?.kind).toBe("validation");
    expect((await requestUploadUrl(w, { ...input, sizeBytes: 10 })).error?.kind).toBe(
      "unauthenticated",
    );
  });
});
