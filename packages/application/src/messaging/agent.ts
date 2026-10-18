import type {
  ForecastSnapshot,
  LlmMessage,
  LlmToolCall,
  LlmToolDefinition,
} from "@emergency-map/domain/repositories";
import { AGENT_SYSTEM_PROMPT, OFF_TOPIC_REPLY } from "@emergency-map/domain/schemas";
import {
  foldText,
  noticeMayCoverDepartment,
  hasDateExpression,
  resolveFollowUpDate,
  resolveTargetDate,
  type TargetDate,
} from "@emergency-map/domain/rules";
import type { CitizenFacts, LiveNoticesReading } from "./compose";
import {
  PRECAUTIONS_ADVICE,
  composeCitizenReply,
  factsFromReadings,
  guardReply,
  wantsAdvice,
} from "./compose";
import type { MessagingDeps } from "./deps";
import {
  formatTimeLima,
  loadAlerts,
  loadCommunity,
  loadHistory,
  resolvePlace,
  type AlertReading,
  type CommunityReading,
  type HistoryReading,
  type ResolvedPlace,
} from "./zone";

const CLIMATE_WORDS = [
  "lluvia",
  "llov",
  "llue",
  "clima",
  "tiempo",
  "calor",
  "frio",
  "temperatura",
  "viento",
  "helada",
  "friaje",
  "nublado",
  "semaforo",
  "alerta",
  "viaj",
  "distrito",
  "pronostico",
  "senamhi",
  "indeci",
  "inund",
  "huaico",
  "sismo",
  "naranja",
  "rojo",
  "amarillo",
  "verde",
  "zona",
  "hogar",
  "aviso",
  "temporal",
  "hoy",
  "manana",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
  "fin de semana",
];

const KNOWN_PLACES = [
  "piura",
  "cusco",
  "cuzco",
  "lima",
  "miraflores",
  "arequipa",
  "trujillo",
  "chiclayo",
  "iquitos",
  "puno",
  "cajamarca",
  "tacna",
  "ayacucho",
  "huaraz",
  "tumbes",
];

const NOT_PLACES = new Set([
  "hoy",
  "manana",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
  "el",
  "la",
  "mi",
  "fin",
  "semana",
  "octubre",
  "noviembre",
  "diciembre",
]);

/** Reply to a bare "hola" from a verified person: short, and an example of what to ask. */
export const GREETING_REPLY =
  "¡Hola! Soy KlAimate. Pregúntame por la lluvia o el clima de tu distrito o de un viaje, por ejemplo: «¿Lloverá en Cusco el sábado?». Te respondo con la fuente y la hora del dato.";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export function isGreetingOnly(text: string): boolean {
  const folded = foldText(text)
    .replace(/[!?.,¡¿]/g, "")
    .trim();
  return /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|hi|hello|ola)$/.test(folded);
}

export function isClimateRelated(text: string): boolean {
  const folded = foldText(text);
  if (isGreetingOnly(text)) return true;
  if (KNOWN_PLACES.some((place) => folded.includes(place))) return true;
  return CLIMATE_WORDS.some((word) => folded.includes(word));
}

/** Place named in the text: a known city, or a capitalised word after "en/a/para/de/por". */
export function extractPlaceQuery(text: string): string {
  const folded = foldText(text);
  if (/mi (zona|distrito|hogar|casa)/.test(folded)) return "hogar";
  for (const name of KNOWN_PLACES) {
    if (folded.includes(name)) return name === "cuzco" ? "cusco" : name;
  }
  const named =
    /\b(?:en|a|para|de|por|hacia)\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+(?:de\s+)?[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)?)/u.exec(
      text,
    );
  if (named?.[1] && !NOT_PLACES.has(foldText(named[1]))) return named[1];
  return "hogar";
}

/** Kept for callers that only need a day word. Prefer `resolveTargetDate`. */
export function extractDayLabel(text: string): string {
  const folded = foldText(text);
  if (folded.includes("manana")) return "mañana";
  const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  for (const day of days) {
    if (folded.includes(day)) return day;
  }
  return "hoy";
}

/**
 * The day asked about. A follow-up without a day ("¿y en Cusco?") keeps the previous one, and
 * "¿y el domingo?" asked on a Sunday right after a later day means next Sunday.
 */
export function resolveConversationDate(
  text: string,
  history: ConversationTurn[],
  now: Date,
): TargetDate {
  let previous: TargetDate | null = null;
  for (const turn of history) {
    if (turn.role === "user" && hasDateExpression(turn.content)) {
      previous = resolveFollowUpDate(turn.content, now, previous);
    }
  }
  if (hasDateExpression(text)) return resolveFollowUpDate(text, now, previous);
  return previous ?? resolveTargetDate(text, now);
}

/** The place asked about. A follow-up without a place ("¿y mañana?") keeps the previous place. */
export function resolveConversationPlace(text: string, history: ConversationTurn[]): string {
  const direct = extractPlaceQuery(text);
  if (direct !== "hogar" || /mi (zona|distrito|hogar|casa)/.test(foldText(text))) return direct;
  for (const turn of [...history].reverse()) {
    if (turn.role !== "user") continue;
    const previous = extractPlaceQuery(turn.content);
    if (previous !== "hogar") return previous;
  }
  return "hogar";
}

export const AGENT_TOOLS: LlmToolDefinition[] = [
  {
    name: "resolver_lugar",
    description: 'Resuelve un distrito o la zona hogar del usuario (query "hogar").',
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "pronostico",
    description:
      "Pronóstico diario de Open-Meteo para un lugar y una fecha YYYY-MM-DD (hasta 16 días). No es un aviso de SENAMHI. Devuelve también la región (departamento).",
    parameters: {
      type: "object",
      properties: {
        place: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        latitude: { type: "number" },
        longitude: { type: "number" },
      },
      required: ["place", "date"],
    },
  },
  {
    name: "avisos_senamhi_vigentes",
    description:
      "Avisos meteorológicos vigentes de SENAMHI leídos en vivo, con su nivel, vigencia y enlace. Cada aviso indica si puede incluir la región consultada.",
    parameters: {
      type: "object",
      properties: { region: { type: "string", description: "Departamento, p. ej. Arequipa" } },
    },
  },
  {
    name: "semaforo_y_alertas",
    description:
      "Avisos guardados en la base de KlAimate para un ubigeo. Pueden ser de demostración; prefiere avisos_senamhi_vigentes.",
    parameters: { type: "object", properties: { ubigeo: { type: "string" } } },
  },
  {
    name: "historico_zona",
    description: "Serie de eventos e incidentes registrados en la zona.",
    parameters: { type: "object", properties: { ubigeo: { type: "string" } } },
  },
  {
    name: "reportes_comunidad",
    description: "Reportes ciudadanos y organizaciones que cubren la zona, si existen.",
    parameters: { type: "object", properties: { ubigeo: { type: "string" } } },
  },
];

/** Tools that must have run before a reply about a place, so every reply rests on data. */
const REQUIRED_TOOLS = [
  "resolver_lugar",
  "pronostico",
  "avisos_senamhi_vigentes",
  "semaforo_y_alertas",
  "historico_zona",
  "reportes_comunidad",
] as const;

/** Execution order inside one batch: the forecast gives the region the notices need. */
const TOOL_ORDER = [
  "resolver_lugar",
  "pronostico",
  "avisos_senamhi_vigentes",
  "semaforo_y_alertas",
  "historico_zona",
  "reportes_comunidad",
];

interface LiveNoticesToolResult {
  available: boolean;
  consultado: string | null;
  region: string | null;
  motivo?: string;
  avisos: {
    numero: string;
    titulo: string;
    nivel: "amarillo" | "naranja" | "rojo";
    vigente_desde: string;
    vigente_hasta: string;
    enlace: string;
    puede_incluir_la_zona: boolean;
    vigente_en_la_fecha: boolean;
  }[];
}

interface ToolBag {
  place?: ResolvedPlace;
  alerts?: AlertReading;
  history?: HistoryReading;
  forecast?: ForecastSnapshot;
  community?: CommunityReading;
  live?: LiveNoticesToolResult;
}

export interface AgentTurn {
  reply: string;
  toolNames: string[];
  facts: CitizenFacts;
}

function isoDateArgument(value: unknown, target: TargetDate, now: Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (typeof value === "string" && value.trim()) return resolveTargetDate(value, now).iso;
  return target.iso;
}

export async function callAgentTool(
  deps: MessagingDeps,
  name: string,
  args: Record<string, unknown>,
  home: { name: string; ubigeo: string | null },
  target: TargetDate,
  context: { region?: string | null } = {},
): Promise<unknown> {
  const now = deps.clock.now();
  if (name === "resolver_lugar") {
    const query = typeof args.query === "string" ? args.query : "hogar";
    return resolvePlace(deps, query, home);
  }
  if (name === "pronostico") {
    return deps.forecast.forecast({
      placeName: typeof args.place === "string" ? args.place : home.name,
      latitude: typeof args.latitude === "number" ? args.latitude : null,
      longitude: typeof args.longitude === "number" ? args.longitude : null,
      date: isoDateArgument(args.date, target, now),
    });
  }
  if (name === "avisos_senamhi_vigentes") {
    const region =
      (typeof args.region === "string" && args.region.trim() ? args.region : null) ??
      context.region ??
      null;
    if (!deps.officialFeed) {
      return {
        available: false,
        consultado: null,
        region,
        motivo: "sin conexión a SENAMHI",
        avisos: [],
      };
    }
    const feed = await deps.officialFeed.listCurrent();
    if (!feed.available) {
      return {
        available: false,
        consultado: feed.fetchedAt,
        region,
        motivo: feed.reason,
        avisos: [],
      };
    }
    const result: LiveNoticesToolResult = {
      available: true,
      consultado: feed.fetchedAt,
      region,
      avisos: feed.notices.map((notice) => ({
        numero: notice.number,
        titulo: notice.title,
        nivel: notice.level,
        vigente_desde: notice.validFrom,
        vigente_hasta: notice.validTo,
        enlace: notice.url,
        puede_incluir_la_zona: noticeMayCoverDepartment(notice.title, region),
        vigente_en_la_fecha: notice.validFrom <= target.iso && target.iso <= notice.validTo,
      })),
    };
    return result;
  }
  if (name === "semaforo_y_alertas") {
    const ubigeo = typeof args.ubigeo === "string" ? args.ubigeo : home.ubigeo;
    return loadAlerts(deps, ubigeo);
  }
  if (name === "historico_zona") {
    const ubigeo = typeof args.ubigeo === "string" ? args.ubigeo : home.ubigeo;
    return loadHistory(deps, ubigeo);
  }
  if (name === "reportes_comunidad") {
    const ubigeo = typeof args.ubigeo === "string" ? args.ubigeo : home.ubigeo;
    return loadCommunity(deps, ubigeo);
  }
  return { error: "unknown_tool" };
}

function bagFromMessages(messages: LlmMessage[]): ToolBag {
  const bag: ToolBag = {};
  for (const message of messages) {
    if (message.role !== "tool" || !message.name) continue;
    const parsed = JSON.parse(message.content) as never;
    if (message.name === "resolver_lugar") bag.place = parsed;
    if (message.name === "semaforo_y_alertas") bag.alerts = parsed;
    if (message.name === "historico_zona") bag.history = parsed;
    if (message.name === "pronostico") bag.forecast = parsed;
    if (message.name === "reportes_comunidad") bag.community = parsed;
    if (message.name === "avisos_senamhi_vigentes") bag.live = parsed;
  }
  return bag;
}

function emptyForecast(date: string): ForecastSnapshot {
  return {
    available: false,
    source: "Open-Meteo",
    fetchedAt: null,
    summary: null,
    precipitationProbabilityMax: null,
    forDate: date,
    precipitationSumMm: null,
    temperatureMaxC: null,
    temperatureMinC: null,
    region: null,
    reason: "No tengo información confirmada de pronóstico.",
  };
}

function liveReading(live: LiveNoticesToolResult | undefined): LiveNoticesReading | undefined {
  if (!live) return undefined;
  return {
    available: live.available,
    fetchedAt: live.consultado,
    region: live.region,
    reason: live.motivo ?? null,
    relevant: live.avisos
      .filter((notice) => notice.puede_incluir_la_zona && notice.vigente_en_la_fecha)
      .map((notice) => ({
        number: notice.numero,
        title: notice.titulo,
        level: notice.nivel,
        validFrom: notice.vigente_desde,
        validTo: notice.vigente_hasta,
        url: notice.enlace,
      })),
  };
}

function factsFromBag(bag: ToolBag, homeName: string, target: TargetDate): CitizenFacts {
  return factsFromReadings({
    place: bag.place ?? { found: false, name: homeName, ubigeo: null, lat: null, lng: null },
    dayLabel: target.label,
    alerts: bag.alerts ?? {
      level: "sin_informacion",
      source: null,
      updatedAt: null,
      noticeId: null,
      cause: null,
      mentionsSutran: false,
      factual: "No hay un aviso guardado para esa zona.",
    },
    history: bag.history ?? { estimate: null, mentionsSutran: false },
    forecast: bag.forecast ?? emptyForecast(target.iso),
    community: bag.community ?? { summary: "", mentionsSutran: false },
    live: liveReading(bag.live),
  });
}

function argumentsFor(
  tool: string,
  placeQuery: string,
  target: TargetDate,
  home: { name: string },
  place: ResolvedPlace | undefined,
): Record<string, unknown> {
  if (tool === "resolver_lugar") return { query: placeQuery };
  if (tool === "pronostico") {
    return {
      place: place?.name ?? (placeQuery === "hogar" ? home.name : placeQuery),
      date: target.iso,
      ...(place?.lat != null && place.lng != null
        ? { latitude: place.lat, longitude: place.lng }
        : {}),
    };
  }
  if (tool === "avisos_senamhi_vigentes") return {};
  return { ubigeo: place?.ubigeo };
}

/** Runs one batch of calls in dependency order and appends the assistant + tool messages. */
async function runToolBatch(
  deps: MessagingDeps,
  messages: LlmMessage[],
  calls: LlmToolCall[],
  home: { name: string; ubigeo: string | null },
  target: TargetDate,
  toolNames: string[],
): Promise<void> {
  messages.push({ role: "assistant", content: "", toolCalls: calls });
  const ordered = [...calls].sort(
    (left, right) => TOOL_ORDER.indexOf(left.name) - TOOL_ORDER.indexOf(right.name),
  );
  let region = bagFromMessages(messages).forecast?.region ?? null;
  for (const call of ordered) {
    const result = await callAgentTool(deps, call.name, call.arguments, home, target, { region });
    if (call.name === "pronostico") {
      region = (result as ForecastSnapshot).region ?? region;
    }
    toolNames.push(call.name);
    messages.push({
      role: "tool",
      name: call.name,
      toolCallId: call.id,
      content: JSON.stringify(result),
    });
  }
}

function offTopicFacts(
  home: { name: string; ubigeo: string | null },
  target: TargetDate,
): CitizenFacts {
  return {
    kind: "off_topic",
    place: home.name,
    dayLabel: target.label,
    level: "sin_informacion",
    source: null,
    updatedAtLabel: null,
    cause: null,
    estimate: null,
    factual: null,
    missingReason: null,
    mentionsSutran: false,
    ubigeo: home.ubigeo,
    noticeId: null,
  };
}

function contextLine(now: Date, home: { name: string }): string {
  const today = resolveTargetDate("hoy", now);
  return `Contexto: hoy es ${today.label} (${today.iso}), hora de Lima ${formatTimeLima(now)}. Distrito del hogar de la persona: ${home.name}.`;
}

export async function runAgent(
  deps: MessagingDeps,
  input: {
    text: string;
    homeDistrictName: string;
    homeUbigeo: string | null;
    /** Earlier turns, oldest first. Lets the agent follow "¿y en Cusco?" or "¿y mañana?". */
    history?: ConversationTurn[];
  },
): Promise<AgentTurn> {
  const now = deps.clock.now();
  const history = (input.history ?? []).slice(-8);
  const home = { name: input.homeDistrictName, ubigeo: input.homeUbigeo };
  const target = resolveConversationDate(input.text, history, now);
  const placeQuery = resolveConversationPlace(input.text, history);

  if (isGreetingOnly(input.text)) {
    return { reply: GREETING_REPLY, toolNames: [], facts: offTopicFacts(home, target) };
  }
  if (!isClimateRelated(input.text) && history.length === 0) {
    const facts: CitizenFacts = {
      kind: "off_topic",
      place: home.name,
      dayLabel: target.label,
      level: "sin_informacion",
      source: null,
      updatedAtLabel: null,
      cause: null,
      estimate: null,
      factual: null,
      missingReason: null,
      mentionsSutran: false,
      ubigeo: home.ubigeo,
      noticeId: null,
    };
    return { reply: OFF_TOPIC_REPLY, toolNames: [], facts };
  }

  const suggestedPlace = placeQuery === "hogar" ? `${home.name} (hogar)` : placeQuery;
  const messages: LlmMessage[] = [
    { role: "system", content: `${AGENT_SYSTEM_PROMPT}\n\n${contextLine(now, home)}` },
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    {
      role: "user",
      content: `${input.text}\n\n[Contexto automático: fecha consultada ${target.label} (${target.iso}); lugar consultado: ${suggestedPlace}.]`,
    },
  ];
  const toolNames: string[] = [];

  for (let step = 0; step < 6; step += 1) {
    const completion = await deps.llm.complete({ messages, tools: AGENT_TOOLS });

    if (completion.kind === "tool_calls" && completion.calls.length > 0) {
      await runToolBatch(deps, messages, completion.calls, home, target, toolNames);
      continue;
    }

    const called = new Set(toolNames);
    const missing = REQUIRED_TOOLS.filter((name) => !called.has(name));
    const text = completion.kind === "message" ? completion.text : "";
    const offTopicReply = foldText(text).includes("no soy un asistente");
    if (missing.length > 0 && !offTopicReply && step < 5) {
      const bag = bagFromMessages(messages);
      const forced = missing.map((name, index) => ({
        id: `forzado_${step}_${index}`,
        name,
        arguments: argumentsFor(name, placeQuery, target, home, bag.place),
      }));
      await runToolBatch(deps, messages, forced, home, target, toolNames);
      continue;
    }

    const facts = offTopicReply
      ? {
          ...factsFromBag(bagFromMessages(messages), home.name, target),
          kind: "off_topic" as const,
        }
      : {
          ...factsFromBag(bagFromMessages(messages), home.name, target),
          advice: wantsAdvice(input.text) ? PRECAUTIONS_ADVICE : null,
        };
    return { reply: guardReply(text, facts), toolNames, facts };
  }

  const facts = {
    ...factsFromBag(bagFromMessages(messages), home.name, target),
    advice: wantsAdvice(input.text) ? PRECAUTIONS_ADVICE : null,
  };
  return { reply: composeCitizenReply(facts), toolNames, facts };
}

/**
 * Deterministic tool-calling stand-in, used when there is no LLM key and in tests. No network:
 * it asks for every tool in one batch, then writes the composed reply from the results.
 */
export function createDeterministicClimateLlm(): MessagingDeps["llm"] {
  return {
    async complete({ messages }) {
      const system = messages.find((message) => message.role === "system")?.content ?? "";
      const user =
        [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
      if (!system.includes("KlAimate")) return { kind: "message", text: OFF_TOPIC_REPLY };
      const asked = user.split("\n\n[Contexto automático:")[0] ?? user;
      const hasHistory = messages.some(
        (message) => message.role === "assistant" && !message.toolCalls,
      );
      if (!isClimateRelated(asked) && !hasHistory)
        return { kind: "message", text: OFF_TOPIC_REPLY };

      if (!messages.some((message) => message.role === "tool")) {
        // Let runAgent force every required tool in one ordered batch.
        return { kind: "message", text: "" };
      }
      const iso = /\((\d{4}-\d{2}-\d{2})\); lugar consultado/.exec(user)?.[1];
      const label = /fecha consultada (.+?) \(\d{4}-\d{2}-\d{2}\)/.exec(user)?.[1] ?? "hoy";
      const bag = bagFromMessages(messages);
      const facts = factsFromBag(bag, bag.place?.name ?? "la zona", {
        iso: iso ?? new Date().toISOString().slice(0, 10),
        label,
        daysAhead: 0,
      });
      return {
        kind: "message",
        text: composeCitizenReply({
          ...facts,
          advice: wantsAdvice(asked) ? PRECAUTIONS_ADVICE : null,
        }),
      };
    },
  };
}
