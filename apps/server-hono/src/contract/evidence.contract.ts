import { z } from "zod";
import { oc } from "@orpc/contract";
import {
  addEvidenceInputSchema,
  publicEvidenceSchema,
  requestUploadUrlInputSchema,
  uploadUrlSchema,
} from "@emergency-map/domain/schemas";
import { apiResponseSchema } from "./shared";

export const evidenceContract = {
  listForEvent: oc
    .route({ method: "GET", path: "/events/{id}/evidence", tags: ["evidence"] })
    .input(z.object({ id: z.string() }))
    .output(apiResponseSchema(z.array(publicEvidenceSchema))),

  add: oc
    .route({
      method: "POST",
      path: "/events/{id}/evidence",
      successStatus: 201,
      tags: ["evidence"],
    })
    .input(addEvidenceInputSchema.omit({ eventId: true }).extend({ id: z.string() }))
    .output(apiResponseSchema(publicEvidenceSchema)),

  requestUploadUrl: oc
    .route({ method: "POST", path: "/evidence/upload-url", tags: ["evidence"] })
    .input(requestUploadUrlInputSchema)
    .output(apiResponseSchema(uploadUrlSchema)),
};
