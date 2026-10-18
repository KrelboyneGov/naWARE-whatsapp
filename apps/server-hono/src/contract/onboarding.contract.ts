import { z } from "zod";
import { oc } from "@orpc/contract";

const errorSchema = z.object({ message: z.string() });

const onboardingResultSchema = z.object({
  id: z.string(),
  homeDistrictName: z.string(),
  verificationStatus: z.enum(["pending", "verified"]),
  consentVersion: z.string(),
});

export const onboardingContract = {
  register: oc
    .route({ method: "POST", path: "/onboarding", successStatus: 201 })
    .input(
      z.object({
        phone: z.string().min(1),
        districtName: z.string(),
        ubigeo: z.string().nullish(),
        point: z
          .object({
            lat: z.number().gte(-90).lte(90),
            lng: z.number().gte(-180).lte(180),
          })
          .nullish(),
        consentAccepted: z.boolean(),
        adultConfirmed: z.boolean(),
      }),
    )
    .output(
      z.object({
        data: onboardingResultSchema.nullable(),
        error: errorSchema.nullable(),
      }),
    ),
};
