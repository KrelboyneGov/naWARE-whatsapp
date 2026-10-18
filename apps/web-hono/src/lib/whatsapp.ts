import { env } from "@/env/client";

/** Digits of the WhatsApp Business line, from the deploy. Never hard-coded in the repository. */
export const whatsappDigits = (env.VITE_WHATSAPP_BUSINESS_NUMBER ?? "").replace(/\D/g, "");

/** wa.me link that opens a chat with "Hola" typed. Null when the deploy has no number. */
export const whatsappHolaLink = whatsappDigits
  ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent("Hola")}`
  : null;
