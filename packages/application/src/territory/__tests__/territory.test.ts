import { describe, expect, it } from "vitest";
import {
  districtPlace,
  exactPlace,
  limaRef,
  luriganchoRef,
  makeCollectionPoint,
  makeEvent,
  makeNeed,
  makeNotice,
  makeOrganization,
  makeTerritory,
  makeWorld,
  hoursFromNow,
} from "../../__tests__/fakes/fixtures";
import { getLocalityOverview, getTerritory, listNearby, searchTerritories } from "..";

function worldWithTerritories() {
  const w = makeWorld();
  w.territories.seed(makeTerritory(luriganchoRef, -11.9367, -76.6975));
  w.territories.seed(makeTerritory(limaRef, -12.0464, -77.0428));
  w.territories.neighbours.set("150118", ["150101"]);
  return w;
}

describe("search and get", () => {
  it("searches by name and reports not_found for unknown ubigeo", async () => {
    const w = worldWithTerritories();
    const r = await searchTerritories(w, { query: "luri", limit: 10 });
    expect(r.data?.map((t) => t.ubigeo)).toEqual(["150118"]);
    expect((await getTerritory(w, { ubigeo: "999999" })).error?.kind).toBe("not_found");
    expect((await getTerritory(w, { ubigeo: "150118" })).data?.name).toBe("Lurigancho");
  });
});

describe("getLocalityOverview", () => {
  it("says noInformation when nothing is found, never 'safe' (failure 9)", async () => {
    const w = worldWithTerritories();
    const r = await getLocalityOverview(w, { ubigeo: "150118" });
    expect(r.data).toMatchObject({
      noInformation: true,
      events: [],
      nearbyEvents: [],
      notices: [],
    });
  });

  it("keeps inside events apart from nearby ones", async () => {
    const w = worldWithTerritories();
    w.events.seed(makeEvent("evt-in"));
    w.events.seed(
      makeEvent("evt-near", { place: exactPlace({ lat: -12.04, lng: -77.04 }, limaRef) }),
    );
    const r = await getLocalityOverview(w, { ubigeo: "150118" });
    expect(r.data?.events.map((e) => e.id)).toEqual(["evt-in"]);
    expect(r.data?.nearbyEvents.map((e) => e.id)).toEqual(["evt-near"]);
    expect(r.data?.noInformation).toBe(false);
  });

  it("excludes expired notices and past-deadline needs, and merged events", async () => {
    const w = worldWithTerritories();
    w.notices.seed(makeNotice("n-active"));
    w.notices.seed(makeNotice("n-expired", { validTo: hoursFromNow(-1), validity: "active" }));
    w.notices.coverage.set("150118", [
      { id: "n-active", partialOverlap: true },
      { id: "n-expired", partialOverlap: false },
    ]);
    w.organizations.seed(makeOrganization("org-1"));
    w.needs.seed(makeNeed("need-ok", "org-1"));
    w.needs.seed(makeNeed("need-late", "org-1", { deadline: hoursFromNow(-3) }));
    w.events.seed(makeEvent("evt-m", { publicationStatus: "merged", mergedIntoEventId: "x" }));
    const r = await getLocalityOverview(w, { ubigeo: "150118" });
    expect(r.data?.notices.map((n) => [n.id, n.partialOverlap])).toEqual([["n-active", true]]);
    expect(r.data?.needs.map((n) => n.id)).toEqual(["need-ok"]);
    expect(r.data?.events).toEqual([]);
  });
});

describe("listNearby", () => {
  const center = { lat: -11.94, lng: -76.7 };

  it("gives district-precision events no distance and a territorial match (failure 10)", async () => {
    const w = worldWithTerritories();
    w.events.seed(makeEvent("evt-exact"));
    w.events.seed(makeEvent("evt-district", { place: districtPlace() }));
    const r = await listNearby(w, {
      center,
      centerSource: "gps",
      radiusKm: 5 as never,
      kind: "events",
    });
    const byId = Object.fromEntries(r.data!.map((i) => [i.event!.id, i]));
    expect(byId["evt-district"]).toMatchObject({ approxDistanceKm: null, territorialMatch: true });
    expect(byId["evt-exact"]?.territorialMatch).toBe(false);
    expect(byId["evt-exact"]?.approxDistanceKm).toBeGreaterThanOrEqual(0);
  });

  it("drops events beyond the radius and splits road incidents into their own kind", async () => {
    const w = worldWithTerritories();
    w.events.seed(makeEvent("evt-far", { place: exactPlace({ lat: -12.5, lng: -77.2 }, limaRef) }));
    w.events.seed(makeEvent("evt-road"));
    const road = w.events.events.get("evt-road")!;
    w.events.events.set("evt-road", {
      ...road,
      currentVersion: { ...road.currentVersion, category: "road_incident" },
    });
    const events = await listNearby(w, {
      center,
      centerSource: "manual",
      radiusKm: 5 as never,
      kind: "events",
    });
    expect(events.data).toEqual([]);
    const roads = await listNearby(w, {
      center,
      centerSource: "manual",
      radiusKm: 5 as never,
      kind: "road_incidents",
    });
    expect(roads.data?.map((i) => i.event?.id)).toEqual(["evt-road"]);
  });

  it("lists collection points by distance and never withdrawn ones", async () => {
    const w = worldWithTerritories();
    w.collectionPoints.seed(makeCollectionPoint("cp-ok", "org-1"));
    w.collectionPoints.seed(makeCollectionPoint("cp-gone", "org-1", { status: "withdrawn" }));
    const r = await listNearby(w, {
      center,
      centerSource: "gps",
      radiusKm: 5 as never,
      kind: "help",
    });
    expect(r.data?.map((i) => i.collectionPoint?.id)).toEqual(["cp-ok"]);
  });
});
