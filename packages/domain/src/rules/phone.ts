/**
 * One E.164 form for every accepted phone number. Peru numbers without a country
 * code gain +51. Anything else must already be international E.164.
 */

export interface NormalizedPhone {
  e164: string;
  /** Digits of the country calling code, without '+'. */
  countryCallingCode: string;
}

export type PhoneNormalization =
  | { ok: true; phone: NormalizedPhone }
  | { ok: false; reason: string };

const E164 = /^\+[1-9]\d{7,14}$/;

/** Peru's national numbering plan is 9 digits (mobile and geographic). */
const PERU_NATIONAL_LENGTH = 9;

export function normalizePhone(input: string): PhoneNormalization {
  const compact = input.trim().replace(/[\s().-]/g, "");
  if (compact === "") return { ok: false, reason: "Ingresa un número de teléfono." };
  if (/[a-z]/i.test(compact)) {
    return { ok: false, reason: "El teléfono solo puede tener dígitos y el prefijo +." };
  }

  let candidate = compact;
  if (candidate.startsWith("00")) candidate = `+${candidate.slice(2)}`;

  if (!candidate.startsWith("+")) {
    if (/^51\d{9}$/.test(candidate)) candidate = `+${candidate}`;
    else if (/^\d{9}$/.test(candidate)) candidate = `+51${candidate}`;
    else {
      return {
        ok: false,
        reason: "Usa formato internacional (+ y código de país) o un celular de Perú de 9 dígitos.",
      };
    }
  }

  if (!E164.test(candidate)) {
    return { ok: false, reason: "El número no cumple el formato E.164." };
  }

  if (candidate.startsWith("+51")) {
    const national = candidate.slice(3);
    if (national.length !== PERU_NATIONAL_LENGTH) {
      return {
        ok: false,
        reason: "Un número de Perú lleva el código +51 y 9 dígitos.",
      };
    }
  }

  const countryCallingCode = callingCode(candidate);
  return { ok: true, phone: { e164: candidate, countryCallingCode } };
}

function callingCode(e164: string): string {
  if (e164.startsWith("+51")) return "51";
  if (e164.startsWith("+1")) return "1";
  const digits = e164.slice(1);
  return digits.slice(0, Math.min(3, digits.length));
}
