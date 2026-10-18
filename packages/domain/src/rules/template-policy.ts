/**
 * Meta rejects utility templates that start or end with a variable, stick two
 * variables together, use a shortener, or shout. Bodies stay within 300 characters.
 */

export interface TemplatePolicyInput {
  name: string;
  language: string;
  category: string;
  body: string;
  variables: readonly string[];
  buttons: readonly { type: string; text?: string }[];
}

const SHORTENERS = ["bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd", "cutt.ly"];
const ALLOWED_SHOUTS = new Set(["BAJA", "ALTA", "SENAMHI", "INDECI", "SIGRID", "COEN"]);

export function templatePolicyViolations(template: TemplatePolicyInput): string[] {
  const violations: string[] = [];
  if (!/^[a-z0-9_]+$/.test(template.name)) violations.push("name");
  if (template.category !== "UTILITY") violations.push("category");
  if (template.language !== "es") violations.push("language");
  if (template.body.length > 300) violations.push("length");
  if (/^\s*\{\{/.test(template.body)) violations.push("starts_with_variable");
  if (/\}\}\s*[.!]?\s*$/.test(template.body)) violations.push("ends_with_variable");
  if (/\}\}\s*\{\{/.test(template.body)) violations.push("adjacent_variables");

  const placeholders = [...template.body.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)].map(
    (match) => match[1] ?? "",
  );
  if (placeholders.some((name) => !template.variables.includes(name))) {
    violations.push("unknown_placeholder");
  }
  if (template.variables.some((name) => !placeholders.includes(name))) {
    violations.push("unused_variable");
  }

  const lower = template.body.toLowerCase();
  if (SHORTENERS.some((host) => lower.includes(host))) violations.push("shortened_link");
  if (/!{2,}/.test(template.body)) violations.push("repeated_exclamation");

  const shouts = template.body.match(/\b[A-ZÁÉÍÓÚÑ]{4,}\b/g) ?? [];
  if (shouts.some((word) => !ALLOWED_SHOUTS.has(word))) violations.push("repeated_caps");

  const quick = template.buttons.filter((button) => button.type === "quick_reply");
  if (!quick.some((button) => button.text === "BAJA")) violations.push("baja_button");
  if (template.buttons.length > 3) violations.push("too_many_buttons");

  return violations;
}
