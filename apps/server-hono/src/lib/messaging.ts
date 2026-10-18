import {
  createDeterministicClimateLlm,
  dispatchDue,
  planFollowUps,
  purgeDueSubscribers,
} from "@emergency-map/application";
import type { MessagingDeps } from "@emergency-map/application";
import { DEFAULT_EMERGENCY_NUMBERS, WELCOME_MESSAGE } from "@emergency-map/domain/schemas";
import { createFieldCipher } from "@emergency-map/domain/rules";
import { createDatabaseClient } from "@emergency-map/infra-db/client";
import { MessagingRepository } from "@emergency-map/infra-db/repositories";
import {
  createOpenAiCompatibleLlm,
  createOpenMeteoForecast,
  createSenamhiNoticesSource,
  createZavuNotifier,
} from "@emergency-map/infra-messaging";
import { env } from "../env";
import { repositories } from "./container";
import { systemClock, uuidIdGenerator } from "./demo-adapters";

let cached: MessagingDeps | null = null;
let store: MessagingRepository | null = null;

export function messagingConfigurationError(): string | null {
  if (!env.FIELD_ENCRYPTION_KEY || !env.PHONE_HASH_KEY) {
    return "Faltan FIELD_ENCRYPTION_KEY y PHONE_HASH_KEY.";
  }
  return null;
}

function messagingStore(): MessagingRepository {
  if (!store) store = new MessagingRepository(createDatabaseClient(env.DATABASE_URL));
  return store;
}

export function getMessagingDeps(): MessagingDeps {
  if (cached) return cached;
  const encryptionKey = env.FIELD_ENCRYPTION_KEY;
  const hashKey = env.PHONE_HASH_KEY;
  if (!encryptionKey || !hashKey) {
    throw new Error("Messaging encryption keys are not configured.");
  }
  const indeci = env.EMERGENCY_INDECI_NUMBER ?? DEFAULT_EMERGENCY_NUMBERS.indeci.number;
  const bomberos = env.EMERGENCY_FIRE_NUMBER ?? DEFAULT_EMERGENCY_NUMBERS.bomberos.number;
  const welcomeText = WELCOME_MESSAGE.replace(
    "INDECI 119 y Bomberos 116",
    `INDECI ${indeci} y Bomberos ${bomberos}`,
  );
  const llm = env.LLM_API_KEY
    ? createOpenAiCompatibleLlm({
        apiKey: env.LLM_API_KEY,
        baseUrl: env.LLM_BASE_URL,
        model: env.LLM_MODEL,
      })
    : createDeterministicClimateLlm();

  cached = {
    store: messagingStore(),
    cipher: createFieldCipher({ encryptionKey, hashKey }),
    clock: systemClock,
    ids: uuidIdGenerator,
    notifications: createZavuNotifier({
      apiKey: env.ZAVUDEV_API_KEY ?? "",
      senderId: env.ZAVU_SENDER_ID ?? "",
      log: (line) => console.info(line),
    }),
    llm,
    forecast: createOpenMeteoForecast(),
    officialFeed: createSenamhiNoticesSource(),
    log: {
      info(message) {
        console.info(message);
      },
      error(message) {
        console.error(message);
      },
    },
    territories: repositories.territories,
    notices: repositories.notices,
    events: repositories.events,
    organizations: repositories.organizations,
    appPublicUrl: env.APP_PUBLIC_URL ?? "http://localhost:3001",
    retentionDays: numberOr(env.DATA_RETENTION_DAYS, 30),
    templatesEnabled: env.ZAVU_CAN_SEND_TEMPLATES === "true",
    maxAttempts: 3,
    minFollowUpIntervalMs: 12 * 60 * 60 * 1000,
    welcomeText,
  };
  return cached;
}

function numberOr(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function runNotificationCron(): Promise<void> {
  if (messagingConfigurationError()) return;
  const deps = getMessagingDeps();
  await purgeDueSubscribers(deps);
  await planFollowUps(deps);
  await dispatchDue(deps);
}
