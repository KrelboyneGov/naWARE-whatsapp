import { z } from "zod";
import {
  EVIDENCE_ALLOWED_MIME_TYPES,
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_TYPES,
  EVIDENCE_VISIBILITIES,
  REVIEW_STATUSES,
} from "../constants";
import { occurredAtSchema, publicAuthorSchema } from "./common";

export const evidenceSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  type: z.enum(EVIDENCE_TYPES),
  authorId: z.string(),
  author: publicAuthorSchema,
  description: z.string().max(1000),
  /** Object storage key for photos; null for links and testimonies. */
  storageKey: z.string().nullable(),
  url: z.url().nullable(),
  /** Declarations are separate fields and never proof (design doc 05). */
  observedPersonally: z.boolean().nullable(),
  ownsImage: z.boolean().nullable(),
  declaredCapturedAt: occurredAtSchema.nullable(),
  receivedAt: z.date(),
  reviewStatus: z.enum(REVIEW_STATUSES),
  visibility: z.enum(EVIDENCE_VISIBILITIES),
  /** Set when the same file hash was already uploaded; does not count as independent. */
  duplicateOfEvidenceId: z.string().nullable(),
  isDemo: z.boolean(),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const publicEvidenceSchema = evidenceSchema.omit({ authorId: true });
export type PublicEvidence = z.infer<typeof publicEvidenceSchema>;

export const addEvidenceInputSchema = z.object({
  eventId: z.string(),
  type: z.enum(EVIDENCE_TYPES),
  description: z.string().trim().min(1).max(1000),
  storageKey: z.string().nullable(),
  fileSha256: z.string().nullable(),
  url: z.url().nullable(),
  observedPersonally: z.boolean().nullable(),
  ownsImage: z.boolean().nullable(),
  declaredCapturedAt: occurredAtSchema.nullable(),
});
export type AddEvidenceInput = z.infer<typeof addEvidenceInputSchema>;

export const requestUploadUrlInputSchema = z.object({
  fileName: z.string().max(200),
  contentType: z.enum(EVIDENCE_ALLOWED_MIME_TYPES),
  sizeBytes: z.number().int().min(1).max(EVIDENCE_MAX_FILE_BYTES),
});
export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlInputSchema>;

export const uploadUrlSchema = z.object({
  storageKey: z.string(),
  uploadUrl: z.url(),
  expiresAt: z.date(),
  /** True when the storage adapter is the demo one and nothing is really uploaded. */
  simulated: z.boolean(),
});
export type UploadUrl = z.infer<typeof uploadUrlSchema>;
