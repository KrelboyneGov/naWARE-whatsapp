import {
  EVIDENCE_ALLOWED_MIME_TYPES,
  EVIDENCE_MAX_FILE_BYTES,
} from "@emergency-map/domain/constants";
import type { Actor, RequestUploadUrlInput, UploadUrl } from "@emergency-map/domain/schemas";
import { ok } from "@emergency-map/domain/types";
import type { UseCaseResult } from "../shared/result";
import { unauthenticated, validation } from "../shared/result";
import type { EvidenceDeps } from "./deps";

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);

export async function requestUploadUrl(
  deps: Pick<EvidenceDeps, "storage" | "clock" | "ids">,
  input: RequestUploadUrlInput,
  actor?: Actor,
): Promise<UseCaseResult<UploadUrl>> {
  if (!actor) return unauthenticated();
  if (!(EVIDENCE_ALLOWED_MIME_TYPES as readonly string[]).includes(input.contentType)) {
    return validation("contentType", "File type not allowed");
  }
  if (input.sizeBytes < 1 || input.sizeBytes > EVIDENCE_MAX_FILE_BYTES) {
    return validation("sizeBytes", "File size out of range");
  }

  const key = `evidence/${actor.userId}/${deps.ids.next("file")}-${safeName(input.fileName)}`;
  const signed = await deps.storage.createUploadUrl({
    key,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });
  return ok({
    storageKey: key,
    uploadUrl: signed.uploadUrl,
    expiresAt: signed.expiresAt,
    simulated: signed.simulated,
  });
}
