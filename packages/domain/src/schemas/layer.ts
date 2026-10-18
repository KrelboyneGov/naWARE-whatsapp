import { z } from "zod";
import { CELL_STATUSES, LAYERS } from "../constants";
import { territoryRefSchema } from "./common";

/**
 * SemaforoCell: the state of ONE layer in ONE district (ADR 0008).
 *
 * A district has one cell per layer. Cells are never combined: an earthquake with a low
 * magnitude and a landslide with a high level are two cells, and neither changes the other.
 * The color comes from the issuing source's own legend; the product never re-grades it.
 */
export const semaforoCellSchema = z.object({
  territory: territoryRefSchema,
  layer: z.enum(LAYERS),
  sourceId: z.string(),
  status: z.enum(CELL_STATUSES),
  /** Highest level currently published by this source for this district, verbatim (e.g. "orange"). */
  level: z.string().nullable(),
  /** The source's own legend for `level`, shown next to the color. */
  legend: z.string().nullable(),
  /** Color token resolved from the source's legend; null when status is not "has_data". */
  colorToken: z.string().nullable(),
  /** Records behind this cell (notice, event or point ids), so the UI can list them. */
  recordIds: z.array(z.string()),
  /** When the source published the newest record in this cell. */
  sourcePublishedAt: z.date().nullable(),
  /** When we last fetched the source successfully. Never shown as a publication time. */
  fetchedAt: z.date().nullable(),
  /** Validity window of the newest record, when the source declares one. */
  validFrom: z.date().nullable(),
  validTo: z.date().nullable(),
  isDemo: z.boolean(),
});
export type SemaforoCell = z.infer<typeof semaforoCellSchema>;

/** All layer cells of one district, side by side. Deliberately has no aggregate field. */
export const districtLayersSchema = z.object({
  territory: territoryRefSchema,
  cells: z.array(semaforoCellSchema),
});
export type DistrictLayers = z.infer<typeof districtLayersSchema>;
