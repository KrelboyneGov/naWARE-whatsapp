import { foldText } from "./opt-out";

/**
 * Hard rules for anything the bot shows a person. The system prompt repeats them;
 * `replyViolations` is the check that tests and the send path both run.
 */

export const FORBIDDEN_REPLY_PATTERNS: readonly { id: string; pattern: RegExp }[] = [
  { id: "todo_bien", pattern: /todo bien/ },
  { id: "no_hay_peligro", pattern: /no hay peligro/ },
  { id: "puedes_viajar", pattern: /puedes viajar|puede viajar|pueden viajar/ },
  { id: "es_seguro", pattern: /es seguro|esta seguro|estan seguros|zona segura/ },
  { id: "no_hay_riesgo", pattern: /no hay riesgo/ },
  { id: "alerta_oficial", pattern: /alerta oficial/ },
  { id: "sistema_alerta_temprana", pattern: /sistema de alerta temprana/ },
];

export const INFORMATIVE_DISCLAIMER = "Esto es informativo y no sustituye a INDECI ni a SENAMHI.";

export const NO_CONFIRMED_INFORMATION = "No tengo información confirmada";

export function replyViolations(text: string): string[] {
  const folded = foldText(text);
  return FORBIDDEN_REPLY_PATTERNS.filter((rule) => rule.pattern.test(folded)).map(
    (rule) => rule.id,
  );
}

export interface ReplyContractInput {
  text: string;
  /** Risk replies must carry the full formula. Clear replies still need source and time. */
  kind: "clear" | "risk" | "insufficient" | "off_topic" | "other";
  source?: string | null;
}

export function replyContractViolations(input: ReplyContractInput): string[] {
  const violations = replyViolations(input.text);
  const folded = foldText(input.text);

  if (input.kind === "insufficient" && !folded.includes(foldText(NO_CONFIRMED_INFORMATION))) {
    violations.push("missing_no_confirmed_information");
  }

  if (input.kind === "clear" || input.kind === "risk") {
    if (input.source && !folded.includes(foldText(input.source))) violations.push("missing_source");
    if (!/\b\d{1,2}:\d{2}\b/.test(input.text) && !/datos de las/.test(folded)) {
      violations.push("missing_time");
    }
    if (!folded.includes("puede cambiar")) violations.push("missing_limit");
    if (!folded.includes("indeci") && !folded.includes("senamhi"))
      violations.push("missing_official");
  }

  if (input.kind === "risk") {
    if (!folded.includes(foldText(INFORMATIVE_DISCLAIMER))) violations.push("missing_disclaimer");
    if (!folded.includes("la decision es tuya") && !folded.includes("tu decides")) {
      violations.push("missing_user_decision");
    }
  }

  if (input.kind === "off_topic") {
    if (!folded.includes("no soy un asistente")) violations.push("missing_scope_refusal");
  }

  return violations;
}
