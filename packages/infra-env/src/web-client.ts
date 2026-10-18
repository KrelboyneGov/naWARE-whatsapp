import { z } from "zod";

export const webClientEnvSchema = z.object({
  VITE_SERVER_URL: z.url(),
  /** E.164 of the WhatsApp sender, digits only or with +. Optional demo link. */
  VITE_WHATSAPP_BUSINESS_NUMBER: z.string().optional(),
});
