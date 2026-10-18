import { describe, expect, it } from "vitest";
import {
  admin,
  citizen,
  hoursFromNow,
  limaRef,
  luriganchoRef,
  makeCollectionPoint,
  makeNeed,
  makeOrganization,
  makeWorld,
  orgMember,
} from "../../__tests__/fakes/fixtures";
import {
  addOrganizationMember,
  createCollectionPoint,
  createNeed,
  createOrganization,
  getOrganizationProfile,
  listCollectionPoints,
  listNeeds,
  updateNeedStatus,
} from "..";

const needInput = (over: Record<string, unknown> = {}) => ({
  organizationId: "org-1",
  eventId: null,
  title: "Water",
  description: "",
  category: "water" as const,
  destinationTerritory: luriganchoRef,
  collectionPointId: null,
  quantity: null,
  deadline: null as Date | null,
  ...over,
});

function seeded() {
  const w = makeWorld();
  w.organizations.seed(makeOrganization("org-1"));
  return w;
}

describe("organizations", () => {
  it("creates an organization pending review and makes the creator owner", async () => {
    const w = makeWorld();
    const r = await createOrganization(
      w,
      { name: " Cruz ", description: "", coverage: [limaRef], contacts: [] },
      citizen("u1"),
    );
    expect(r.data).toMatchObject({ name: "Cruz", identityReview: "pending", isDemo: false });
    expect(w.organizations.members).toEqual([
      { organizationId: r.data!.id, userId: "u1", role: "owner" },
    ]);
    expect(
      (await createOrganization(w, { name: "x", description: "", coverage: [], contacts: [] }))
        .error?.kind,
    ).toBe("unauthenticated");
  });

  it("adds members only for members of the organization or admins", async () => {
    const w = seeded();
    const input = { organizationId: "org-1", userId: "new", role: "editor" as const };
    expect((await addOrganizationMember(w, input, citizen())).error?.kind).toBe("forbidden");
    expect((await addOrganizationMember(w, input, orgMember("org-1"))).error).toBeNull();
    expect((await addOrganizationMember(w, input, admin())).error).toBeNull();
    expect(w.organizations.members).toHaveLength(2);
  });
});

describe("needs", () => {
  it("createNeed requires membership and a future deadline", async () => {
    const w = seeded();
    expect((await createNeed(w, needInput(), citizen())).error?.kind).toBe("forbidden");
    expect((await createNeed(w, needInput())).error?.kind).toBe("unauthenticated");
    expect(
      (await createNeed(w, needInput({ deadline: hoursFromNow(-1) }), orgMember("org-1"))).error
        ?.kind,
    ).toBe("validation");
    const ok = await createNeed(w, needInput({ deadline: hoursFromNow(5) }), orgMember("org-1"));
    expect(ok.data).toMatchObject({ status: "open", isDemo: false });
  });

  it("updateNeedStatus is scoped to the owning organization", async () => {
    const w = seeded();
    w.needs.seed(makeNeed("need-1", "org-1"));
    const input = { needId: "need-1", status: "covered" as const, note: "Delivered" };
    expect((await updateNeedStatus(w, input, orgMember("org-2"))).error?.kind).toBe("forbidden");
    const r = await updateNeedStatus(w, input, orgMember("org-1"));
    expect(r.data).toMatchObject({ status: "covered", statusNote: "Delivered" });
    expect((await updateNeedStatus(w, input, orgMember("org-1"))).error?.kind).toBe(
      "invalid_transition",
    );
  });

  it("listNeeds onlyActive excludes covered, expired and past-deadline needs (failure 8)", async () => {
    const w = seeded();
    w.needs.seed(makeNeed("n-open", "org-1"));
    w.needs.seed(makeNeed("n-covered", "org-1", { status: "covered" }));
    w.needs.seed(makeNeed("n-expired", "org-1", { status: "expired" }));
    w.needs.seed(makeNeed("n-late", "org-1", { deadline: hoursFromNow(-2) }));
    w.needs.seed(makeNeed("n-soon", "org-1", { deadline: hoursFromNow(2) }));
    const active = await listNeeds(w, { onlyActive: true });
    expect(active.data?.map((n) => n.id).sort()).toEqual(["n-open", "n-soon"]);
    const all = await listNeeds(w, { onlyActive: false });
    expect(all.data?.find((n) => n.id === "n-late")?.status).toBe("expired");
  });
});

describe("collection points", () => {
  const pointInput = (over: Record<string, unknown> = {}) => {
    const {
      id: _id,
      status: _s,
      isDemo: _d,
      updatedAt: _u,
      ...rest
    } = makeCollectionPoint("x", "org-1");
    return { ...rest, ...over };
  };

  it("createCollectionPoint requires membership and starts active", async () => {
    const w = seeded();
    expect((await createCollectionPoint(w, pointInput(), citizen())).error?.kind).toBe("forbidden");
    const r = await createCollectionPoint(w, pointInput(), orgMember("org-1"));
    expect(r.data).toMatchObject({ status: "active", isDemo: false });
  });

  it("never lists a withdrawn point as operating (failure 8)", async () => {
    const w = seeded();
    w.collectionPoints.seed(makeCollectionPoint("cp-ok", "org-1"));
    w.collectionPoints.seed(makeCollectionPoint("cp-gone", "org-1", { status: "withdrawn" }));
    w.collectionPoints.seed(
      makeCollectionPoint("cp-closed", "org-1", { status: "temporarily_closed" }),
    );
    const r = await listCollectionPoints(w, {});
    expect(r.data?.map((x) => x.point.id).sort()).toEqual(["cp-closed", "cp-ok"]);
  });
});

describe("getOrganizationProfile", () => {
  it("returns active needs and non-withdrawn points", async () => {
    const w = seeded();
    w.needs.seed(makeNeed("n1", "org-1"));
    w.needs.seed(makeNeed("n2", "org-1", { deadline: hoursFromNow(-1) }));
    w.collectionPoints.seed(makeCollectionPoint("cp1", "org-1"));
    w.collectionPoints.seed(makeCollectionPoint("cp2", "org-1", { status: "withdrawn" }));
    const r = await getOrganizationProfile(w, { organizationId: "org-1" });
    expect(r.data?.needs.map((n) => n.id)).toEqual(["n1"]);
    expect(r.data?.collectionPoints.map((p) => p.id)).toEqual(["cp1"]);
    expect((await getOrganizationProfile(w, { organizationId: "nope" })).error?.kind).toBe(
      "not_found",
    );
  });
});
