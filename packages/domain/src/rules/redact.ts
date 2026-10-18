const PHONE_PATTERN = /\+\d{8,15}/g;

/** Masks E.164 numbers so logs never keep a full phone. */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/[^\d]/g, "");
  if (digits.length < 4) return "[telefono]";
  return `+${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function redactPhones(text: string): string {
  return text.replace(PHONE_PATTERN, (match) => maskPhone(match));
}

export function assertNoRawPhone(text: string, sample: string): boolean {
  return !text.includes(sample);
}
