import type {
  IConversationMemoryPort,
  MemorySubject,
  MemoryWriteResult,
  RememberedItem,
} from "@emergency-map/domain/repositories";
import type { Subscriber } from "@emergency-map/domain/schemas";
import {
  MEMORY_TEXT_MAX,
  checkMemoryCandidate,
  foldText,
  type MemoryCandidateCheck,
  type MemoryCommand,
} from "@emergency-map/domain/rules";
import type { MessagingDeps } from "./deps";

/** Used when no provider is configured. The assistant answers the same, without memory. */
export const disabledConversationMemory: IConversationMemoryPort = {
  async recall() {
    return { status: "disabled" };
  },
  async list() {
    return { status: "disabled" };
  },
  async remember() {
    return { status: "disabled" };
  },
  async forget() {
    return { status: "disabled" };
  },
  async forgetAll() {
    return { status: "disabled" };
  },
};

export function memoryOf(deps: Pick<MessagingDeps, "memory">): IConversationMemoryPort {
  return deps.memory ?? disabledConversationMemory;
}

/** One subject per subscriber row. A new registration after erasure starts empty. */
export function memorySubjectFor(subscriber: Pick<Subscriber, "id">): MemorySubject {
  return `klaimate:subscriber:${subscriber.id}` as MemorySubject;
}

const NOT_A_WARNING = "Es lo que me pediste recordar, no un aviso.";
const DISABLED_REPLY =
  "La memoria de conversaciones no está activada en este servicio. No guardé nada; sigo respondiendo con los datos de las fuentes.";
const UNAVAILABLE_REPLY =
  "No pude confirmar la operación de memoria. Consulta QUÉ RECUERDAS o vuelve a intentar OLVIDA más tarde.";

function rejectionReply(reason: Exclude<MemoryCandidateCheck, { ok: true }>["reason"]): string {
  switch (reason) {
    case "empty":
      return "Escribe qué quieres que recuerde después de RECUERDA. Por ejemplo: RECUERDA prefiero respuestas por puntos.";
    case "too_long":
      return `Es muy largo para recordarlo. Resúmelo en menos de ${MEMORY_TEXT_MAX} caracteres.`;
    case "sensitive":
      return "No guardo números, documentos, direcciones, correos ni datos de salud. No se guardó nada.";
    case "unsupported":
      return "Puedo recordar el formato de respuesta. Escribe RECUERDA prefiero respuestas por puntos, o RECUERDA prefiero respuestas en párrafos.";
    case "warning":
      return "No guardo avisos ni niveles de alerta: cambian, y siempre los consulto en la fuente al responderte. No se guardó nada.";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

function describeItem(item: RememberedItem): string {
  return item.text;
}

/** WhatsApp RECUERDA / QUÉ RECUERDAS / OLVIDA. Returns the reply text. */
export async function handleMemoryCommand(
  deps: MessagingDeps,
  subscriber: Subscriber,
  command: MemoryCommand,
): Promise<string> {
  const memory = memoryOf(deps);
  const subject = memorySubjectFor(subscriber);

  if (command.kind === "remember") {
    const saved = await rememberPreference(deps, subscriber, command.text);
    if (saved.status === "rejected") return rejectionReply(saved.reason);
    if (saved.status === "disabled") return DISABLED_REPLY;
    if (saved.status === "unavailable") return UNAVAILABLE_REPLY;
    return `Listo, lo recordaré en próximas conversaciones: «${saved.text}». ${NOT_A_WARNING} Escribe QUÉ RECUERDAS para verlo u OLVIDA para borrarlo.`;
  }

  if (command.kind === "list") {
    const read = await memory.list({ subject });
    if (read.status === "disabled") return DISABLED_REPLY;
    if (read.status === "unavailable") {
      deps.log.error(`assistant_memory_unavailable list ${read.reason}`);
      return "No pude consultar la memoria en este momento. Inténtalo más tarde.";
    }
    if (read.items.length === 0) {
      return "No tengo nada guardado de nuestras conversaciones. Escribe RECUERDA y tu preferencia para guardar algo.";
    }
    const lines = read.items.map((item) => `• ${describeItem(item)}`).join("\n");
    return `Esto es lo que recuerdo de nuestras conversaciones:\n${lines}\n${NOT_A_WARNING} Escribe OLVIDA para borrarlo todo.`;
  }

  const removed = await memory.forgetAll({ subject });
  if (removed.status === "disabled") return DISABLED_REPLY;
  if (removed.status === "unavailable") {
    deps.log.error(`assistant_memory_unavailable forget_all ${removed.reason}`);
    return UNAVAILABLE_REPLY;
  }
  return "Listo, borré lo que recordaba de nuestras conversaciones. Tus avisos siguen igual; para dejar de recibirlos escribe BAJA.";
}

export type RememberOutcome =
  | { status: "saved"; text: string }
  | { status: "rejected"; reason: Exclude<MemoryCandidateCheck, { ok: true }>["reason"] }
  | { status: "disabled" }
  | { status: "unavailable" };

/** Validates an explicit WhatsApp request and skips exact duplicates. */
export async function rememberPreference(
  deps: MessagingDeps,
  subscriber: Subscriber,
  candidate: string,
): Promise<RememberOutcome> {
  const check = checkMemoryCandidate(candidate);
  if (!check.ok) return { status: "rejected", reason: check.reason };
  const memory = memoryOf(deps);
  const subject = memorySubjectFor(subscriber);
  const existing = await memory.list({ subject });
  if (existing.status === "disabled") return { status: "disabled" };
  if (existing.status === "unavailable") {
    deps.log.error(`assistant_memory_unavailable remember ${existing.reason}`);
    return { status: "unavailable" };
  }
  const same = existing.items.some(
    (item) => item.kind === "preference" && foldText(item.text) === foldText(check.text),
  );
  if (same) return { status: "saved", text: check.text };
  const written = await memory.remember({ subject, kind: "preference", text: check.text });
  return writeOutcome(deps, written, check.text);
}

function writeOutcome(
  deps: MessagingDeps,
  written: MemoryWriteResult,
  text: string,
): RememberOutcome {
  if (written.status === "saved") return { status: "saved", text };
  if (written.status === "disabled") return { status: "disabled" };
  deps.log.error(`assistant_memory_unavailable write ${written.reason}`);
  return { status: "unavailable" };
}

export interface TurnMemory {
  preferences: RememberedItem[];
}

const EMPTY_TURN_MEMORY: TurnMemory = { preferences: [] };

/** Bounded recall before an agent turn. Any failure means "no memory", never a failed reply. */
export async function recallForTurn(
  deps: MessagingDeps,
  subscriber: Subscriber,
): Promise<TurnMemory> {
  const read = await memoryOf(deps).list({ subject: memorySubjectFor(subscriber) });
  if (read.status === "disabled") return EMPTY_TURN_MEMORY;
  if (read.status === "unavailable") {
    deps.log.error(`assistant_memory_unavailable recall ${read.reason}`);
    return EMPTY_TURN_MEMORY;
  }
  return {
    preferences: read.items.filter((item) => item.kind === "preference").slice(0, 2),
  };
}

/** Changes only presentation. Every sentence from the guarded, sourced reply is preserved. */
export function formatRememberedReply(reply: string, memory: TurnMemory): string {
  if (!memory.preferences.some((item) => item.text === "prefiero respuestas por puntos"))
    return reply;
  return reply
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/u)
    .map((sentence) => `• ${sentence}`)
    .join("\n");
}
