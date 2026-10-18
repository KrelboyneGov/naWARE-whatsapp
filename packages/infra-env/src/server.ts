import { z } from "zod";
import { commaSeparatedList } from "./transforms";

const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: commaSeparatedList,
  BETTER_AUTH_SECRET: z.string().min(1),
  /** Zavu project key. Sends are refused when it is absent. */
  ZAVUDEV_API_KEY: optionalText,
  /**
   * WhatsApp sender id. The project default sender is SMS-only, so this is mandatory
   * for every send. Connected sender "Achalau HCO": kd7b3sknk6z3xvn5pykzgkc7a58ghwe7.
   */
  ZAVU_SENDER_ID: optionalText,
  /** Per-sender webhook secret. Header X-Zavu-Signature. */
  ZAVU_WEBHOOK_SECRET: optionalText,
  /** E.164 of the WhatsApp Business sender. Used only to build the demo wa.me link. */
  WHATSAPP_BUSINESS_NUMBER: optionalText,
  /** 32-byte key, base64. Encrypts phone and conversation memory. */
  FIELD_ENCRYPTION_KEY: optionalText,
  /** Separate HMAC key used only to look a phone up. */
  PHONE_HASH_KEY: optionalText,
  LLM_API_KEY: optionalText,
  LLM_BASE_URL: optionalText,
  LLM_MODEL: optionalText,
  APP_PUBLIC_URL: optionalText,
  DATA_RETENTION_DAYS: optionalText,
  /** "true" only after the sender reports canSendTemplates=true. Default refuses templates. */
  ZAVU_CAN_SEND_TEMPLATES: optionalText,
  INTERNAL_JOB_TOKEN: optionalText,
  /** Unverified until production. Defaults live in domain copy. */
  EMERGENCY_INDECI_NUMBER: optionalText,
  EMERGENCY_FIRE_NUMBER: optionalText,
});
