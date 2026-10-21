import type { RememberedKind } from "../repositories/messaging";
import { replyViolations } from "./agent-safety";
import { foldText } from "./opt-out";

/**
 * What the WhatsApp assistant may keep between conversations: a short preference the person
 * asked it to remember. Never a warning level, because a
 * remembered level would read as the current one; levels always come from the sources.
 */

export const MEMORY_TEXT_MAX = 160;

export type MemoryCommand =
  | { kind: "remember"; text: string }
  | { kind: "list" }
  | { kind: "forget_all" };

const REMEMBER = /^\s*(?:recu[eé]rda(?:me)?|recordar)(?=[\s:,.-]|$)[\s:,.-]*(?:que\s+)?(.*)$/iu;
const LIST = new Set(["que recuerdas", "que recuerdas de mi", "memoria", "mi memoria"]);
const FORGET = new Set(["olvida", "olvidame", "olvida todo", "olvidar", "borra mi memoria"]);

/** Recognizes RECUERDA <texto>, QUÉ RECUERDAS and OLVIDA. Anything else goes to the agent. */
export function parseMemoryCommand(input: string): MemoryCommand | null {
  const folded = foldText(input)
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (folded === "") return null;
  if (LIST.has(folded)) return { kind: "list" };
  if (FORGET.has(folded)) return { kind: "forget_all" };
  const match = REMEMBER.exec(input);
  if (match) return { kind: "remember", text: (match[1] ?? "").trim() };
  return null;
}

export type MemoryCandidateCheck =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "too_long" | "sensitive" | "warning" | "unsupported" };

const SENSITIVE_PATTERNS: readonly RegExp[] = [
  /\d/,
  /@/,
  /https?:|www\./,
  /\b(contrasena|clave|password|pin|dni|pasaporte|tarjeta|cuenta bancaria|cci)\b/,
  /\b(salud|enfermedad|diagnostic\w*|medicament\w*|embaraz\w*|discapacidad|religi\w*|sexual|politic\w*)\b/,
  /\b(direccion|domicilio|calle|jiron|avenida|av)\b/,
];

const WARNING_PATTERN =
  /\b(alerta\w*|aviso\w*|nivel\w*|semaforo|rojo|naranja|amarillo|verde|senamhi|indeci|coen|peligro\w*|riesgo\w*|segur\w*|evacu\w*)\b/;

/** Short, non-sensitive and free of warning levels, or it is not stored. */
export function checkMemoryCandidate(input: string): MemoryCandidateCheck {
  const text = input.replace(/\s+/g, " ").trim();
  if (text.length < 3) return { ok: false, reason: "empty" };
  if (text.length > MEMORY_TEXT_MAX) return { ok: false, reason: "too_long" };
  const folded = foldText(text);
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(folded))) {
    return { ok: false, reason: "sensitive" };
  }
  if (WARNING_PATTERN.test(folded) || replyViolations(text).length > 0) {
    return { ok: false, reason: "warning" };
  }
  if (folded === "prefiero respuestas por puntos")
    return { ok: true, text: "prefiero respuestas por puntos" };
  if (folded === "prefiero respuestas en parrafos")
    return { ok: true, text: "prefiero respuestas en párrafos" };
  return { ok: false, reason: "unsupported" };
}

const PREFIXES: Record<RememberedKind, string> = {
  preference: "Preferencia de la persona: ",
};

/** Stored content. The prefix keeps the kind readable in search and in the provider console. */
export function memoryContent(kind: RememberedKind, text: string): string {
  return `${PREFIXES[kind]}${text}`;
}

/** Reads back content written by `memoryContent`. Content without our prefix is ignored. */
export function parseMemoryContent(content: string): { kind: RememberedKind; text: string } | null {
  for (const kind of ["preference"] as const) {
    const prefix = PREFIXES[kind];
    if (content.startsWith(prefix)) {
      const text = content.slice(prefix.length).trim();
      return checkMemoryCandidate(text).ok ? { kind, text } : null;
    }
  }
  return null;
}
