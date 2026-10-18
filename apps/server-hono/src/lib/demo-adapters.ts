import { DEMO_NOTICES, DEMO_SOURCES } from "@emergency-map/domain/demo";
import type {
  IClock,
  IFileStorage,
  IIdGenerator,
  IOfficialNoticeImporter,
} from "@emergency-map/domain/repositories";

export const systemClock: IClock = { now: () => new Date() };

export const uuidIdGenerator: IIdGenerator = {
  next: (prefix) => `${prefix}_${crypto.randomUUID()}`,
};

const UPLOAD_URL_TTL_MS = 15 * 60 * 1000;

/**
 * Demo storage: nothing is uploaded. It answers with a URL that looks like an upload target
 * and says `simulated: true` so the UI can tell the person the file was not stored.
 */
export const demoFileStorage: IFileStorage = {
  async createUploadUrl({ key }) {
    return {
      uploadUrl: `https://uploads.demo.invalid/${encodeURIComponent(key)}`,
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_MS),
      simulated: true,
    };
  },
  publicUrl: () => null,
};

/** File-based importer: serves the demo notices as if a source had returned them. */
export const demoNoticeImporter: IOfficialNoticeImporter = {
  sourceId: DEMO_SOURCES[0]?.id ?? "SRC-DEMO-SENAMHI",
  async fetchNotices() {
    return DEMO_NOTICES.map(
      ({ id: _id, fetchedAt: _fetchedAt, validity: _validity, ...notice }) => ({
        ...notice,
      }),
    );
  },
};
