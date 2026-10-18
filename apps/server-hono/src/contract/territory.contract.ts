import { z } from "zod";
import { oc } from "@orpc/contract";
import {
  localityOverviewSchema,
  nearbyInputSchema,
  nearbyItemSchema,
  searchTerritoriesInputSchema,
  territorySchema,
} from "@emergency-map/domain/schemas";
import { apiResponseSchema } from "./shared";

const ubigeoParam = z.object({ ubigeo: z.string().regex(/^\d{2}(\d{2}(\d{2})?)?$/) });

export const territoryContract = {
  search: oc
    .route({ method: "GET", path: "/territories/search", tags: ["territory"] })
    .input(searchTerritoriesInputSchema)
    .output(apiResponseSchema(z.array(territorySchema))),

  get: oc
    .route({ method: "GET", path: "/territories/{ubigeo}", tags: ["territory"] })
    .input(ubigeoParam)
    .output(apiResponseSchema(territorySchema)),

  overview: oc
    .route({ method: "GET", path: "/territories/{ubigeo}/overview", tags: ["territory"] })
    .input(ubigeoParam)
    .output(apiResponseSchema(localityOverviewSchema)),

  nearby: oc
    .route({ method: "POST", path: "/nearby", tags: ["territory"] })
    .input(nearbyInputSchema)
    .output(apiResponseSchema(z.array(nearbyItemSchema))),
};
