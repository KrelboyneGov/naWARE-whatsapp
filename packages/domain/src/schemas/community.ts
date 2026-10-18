import { z } from "zod";
import { COMMUNITY_KINDS, ORGANIZATION_REVIEW_STATUSES } from "../constants";
import { territoryRefSchema } from "./common";
import { publicContactSchema } from "./help";

/**
 * A group people can discover and join (volunteers, neighbours). It is not a territory and
 * not an exposed population: those are `Territory`. Joining happens outside the product.
 */
export const communitySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(160),
  description: z.string().max(1000),
  kind: z.enum(COMMUNITY_KINDS),
  /** Districts the group works in or with. */
  coverage: z.array(territoryRefSchema),
  /** Public link to join (group page, form). Demo links use the .invalid TLD. */
  joinUrl: z.url().nullable(),
  contacts: z.array(publicContactSchema),
  /** Organization responsible for the group, when there is one. */
  organizationId: z.string().nullable(),
  /** The link and contacts were checked by the team, with the date. */
  linkReview: z.enum(ORGANIZATION_REVIEW_STATUSES),
  linkReviewedAt: z.date().nullable(),
  isDemo: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Community = z.infer<typeof communitySchema>;

export const createCommunityInputSchema = communitySchema.pick({
  name: true,
  description: true,
  kind: true,
  coverage: true,
  joinUrl: true,
  contacts: true,
  organizationId: true,
});
export type CreateCommunityInput = z.infer<typeof createCommunityInputSchema>;
