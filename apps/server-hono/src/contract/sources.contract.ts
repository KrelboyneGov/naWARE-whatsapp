import { z } from "zod";
import { oc } from "@orpc/contract";
import { dataSourceSchema } from "@emergency-map/domain/schemas";
import { apiResponseSchema } from "./shared";

export const sourcesContract = {
  list: oc
    .route({ method: "GET", path: "/sources", tags: ["sources"] })
    .input(z.object({}))
    .output(apiResponseSchema(z.array(dataSourceSchema))),
};
