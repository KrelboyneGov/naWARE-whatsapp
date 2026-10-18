import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as demo from "../index";
import {
  collectionPointSchema,
  communitySchema,
  dataSourceSchema,
  districtLayersSchema,
  importRunSchema,
  ingestBatchSchema,
  needSchema,
  officialNoticeSchema,
  organizationSchema,
  publicEventSchema,
  territorySchema,
} from "../../schemas";

const cases: [string, unknown[], z.ZodType][] = [
  ["events", [...demo.DEMO_EVENTS, ...demo.DEMO_PENDING_EVENTS], publicEventSchema],
  ["notices", demo.DEMO_NOTICES, officialNoticeSchema],
  ["sources", demo.DEMO_SOURCES, dataSourceSchema],
  ["territories", demo.DEMO_TERRITORIES, territorySchema],
  ["organizations", demo.DEMO_ORGANIZATIONS, organizationSchema],
  ["collection points", demo.DEMO_COLLECTION_POINTS, collectionPointSchema],
  ["needs", demo.DEMO_NEEDS, needSchema],
  ["communities", demo.DEMO_COMMUNITIES, communitySchema],
  ["district layers", demo.DEMO_DISTRICT_LAYERS, districtLayersSchema],
  ["ingest runs", demo.DEMO_INGEST_RUNS, importRunSchema],
];

describe("demo fixtures match their contracts", () => {
  it.each(cases)("%s", (_name, items, schema) => {
    for (const item of items) expect(() => schema.parse(item)).not.toThrow();
  });

  it("ingest batch", () => {
    const payload = officialNoticeSchema.omit({ id: true, fetchedAt: true, validity: true });
    expect(() => ingestBatchSchema(payload).parse(demo.DEMO_INGEST_BATCH)).not.toThrow();
  });

  it("every fixture is flagged as demo", () => {
    const all = [
      ...demo.DEMO_EVENTS,
      ...demo.DEMO_NOTICES,
      ...demo.DEMO_COMMUNITIES,
      ...demo.DEMO_DISTRICT_LAYERS.flatMap((d) => d.cells),
    ];
    expect(all.every((x) => x.isDemo)).toBe(true);
  });
});

describe("layers are never aggregated (ADR 0008)", () => {
  it("a district result has no cross-layer score", () => {
    expect(Object.keys(districtLayersSchema.shape).sort()).toEqual(["cells", "territory"]);
  });

  it("each layer keeps its own level in the same district", () => {
    const huancayo = demo.DEMO_DISTRICT_LAYERS.find((d) => d.territory.ubigeo === "120101")!;
    const notice = huancayo.cells.find((c) => c.layer === "official_notices")!;
    const reports = huancayo.cells.find((c) => c.layer === "citizen_reports")!;
    expect(notice.level).toBe("orange");
    expect(reports.status).toBe("no_information");
    expect(reports.level).toBeNull();
  });
});
