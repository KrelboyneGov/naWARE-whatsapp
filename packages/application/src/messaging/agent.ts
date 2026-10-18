import type {
  ForecastSnapshot,
  LlmMessage,
  LlmToolDefinition,
} from "@emergency-map/domain/repositories";
import { AGENT_SYSTEM_PROMPT, OFF_TOPIC_REPLY } from "@emergency-map/domain/schemas";
import { foldText } from "@emergency-map/domain/rules";
import type { CitizenFacts } from "./compose";
import { composeCitizenReply, factsFromReadings, guardReply } from "./compose";
import type { MessagingDeps } from "./deps";
import {
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
  "clima",
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
  "piura",
  "cusco",
  "cuzco",
  "lima",
  "zona",
  "hogar",
  "aviso",
  "temporal",
  "martes",
  "sabado",
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

export function isGreetingOnly(text: string): boolean {
  const folded = foldText(text)
    .replace(/[!?.,]/g, "")
    .trim();
  return /^(hola|buenas|buenos dias|hey|hi|hello|ola)$/.test(folded);
}

export function isClimateRelated(text: string): boolean {
  const folded = foldText(text);
  if (isGreetingOnly(text)) return true;
  return CLIMATE_WORDS.some((word) => folded.includes(word));
}

export function extractPlaceQuery(text: string): string {
  const folded = foldText(text);
  if (/mi (zona|distrito|hogar|casa)/.test(folded)) return "hogar";
  for (const name of KNOWN_PLACES) {
    if (folded.includes(name)) return name === "cuzco" ? "cusco" : name;
  }
  return "hogar";
}

export function extractDayLabel(text: string): string {
  const folded = foldText(text);
  if (folded.includes("manana")) return "mañana";
  const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  for (const day of days) {
    if (folded.includes(day)) return day;
  }
  return "hoy";
}

export const AGENT_TOOLS: LlmToolDefinition[] = [
  {
    name: "resolver_lugar",
    description: "Resuelve un distrito o la zona hogar del usuario.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "semaforo_y_alertas",
    description: "Avisos vigentes del distrito, cada uno con el nivel de su emisor.",
    parameters: { type: "object", properties: { ubigeo: { type: "string" } } },
  },
  {
    name: "historico_zona",
    description: "Serie de eventos e incidentes registrados en la zona.",
    parameters: { type: "object", properties: { ubigeo: { type: "string" } } },
  },
  {
    name: "pronostico",
    description: "Pronóstico de Open-Meteo. No es un aviso de SENAMHI.",
    parameters: {
      type: "object",
      properties: {
        place: { type: "string" },
        date: { type: "string" },
        latitude: { type: "number" },
        longitude: { type: "number" },
      },
    },
  },
  {
    name: "reportes_comunidad",
    description: "Reportes ciudadanos y organizaciones que cubren la zona, si existen.",
    parameters: { type: "object", properties: { ubigeo: { type: "string" } } },
  },
];

const REQUIRED_TOOLS = [
  "resolver_lugar",
  "semaforo_y_alertas",
  "historico_zona",
  "pronostico",
  "reportes_comunidad",
] as const;

interface ToolBag {
  place?: ResolvedPlace;
  alerts?: AlertReading;
  history?: HistoryReading;
  forecast?: ForecastSnapshot;
  community?: CommunityReading;
}

export interface AgentTurn {
  reply: string;
  toolNames: string[];
  facts: CitizenFacts;
}

export async function callAgentTool(
  deps: MessagingDeps,
  name: string,
  args: Record<string, unknown>,
  home: { name: string; ubigeo: string | null },
  dayLabel: string,
): Promise<unknown> {
  if (name === "resolver_lugar") {
    const query = typeof args.query === "string" ? args.query : "hogar";
    return resolvePlace(deps, query, home);
  }
  if (name === "semaforo_y_alertas") {
    const ubigeo = typeof args.ubigeo === "string" ? args.ubigeo : home.ubigeo;
    return loadAlerts(deps, ubigeo);
  }
  if (name === "historico_zona") {
    const ubigeo = typeof args.ubigeo === "string" ? args.ubigeo : home.ubigeo;
    return loadHistory(deps, ubigeo);
  }
  if (name === "pronostico") {
    return deps.forecast.forecast({
      placeName: typeof args.place === "string" ? args.place : home.name,
      latitude: typeof args.latitude === "number" ? args.latitude : null,
      longitude: typeof args.longitude === "number" ? args.longitude : null,
      date: typeof args.date === "string" ? args.date : dayLabel,
    });
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
  }
  return bag;
}

function emptyForecast(): ForecastSnapshot {
  return {
    available: false,
    source: "Open-Meteo",
    fetchedAt: null,
    summary: null,
    precipitationProbabilityMax: null,
    reason: "No tengo información confirmada de pronóstico.",
  };
}

export async function runAgent(
  deps: MessagingDeps,
  input: { text: string; homeDistrictName: string; homeUbigeo: string | null },
): Promise<AgentTurn> {
  const dayLabel = extractDayLabel(input.text);
  const home = { name: input.homeDistrictName, ubigeo: input.homeUbigeo };
  if (!isClimateRelated(input.text)) {
    const facts: CitizenFacts = {
      kind: "off_topic",
      place: home.name,
      dayLabel,
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

  const messages: LlmMessage[] = [
    { role: "system", content: AGENT_SYSTEM_PROMPT },
    {
      role: "user",
      content: `${input.text}\nHogar: ${home.name}. Día consultado: ${dayLabel}.`,
    },
  ];
  const toolNames: string[] = [];

  for (let step = 0; step < 8; step += 1) {
    const completion = await deps.llm.complete({ messages, tools: AGENT_TOOLS });
    const called = new Set(toolNames);

    if (completion.kind === "tool_calls") {
      for (const call of completion.calls) {
        const result = await callAgentTool(deps, call.name, call.arguments, home, dayLabel);
        toolNames.push(call.name);
        messages.push({ role: "tool", name: call.name, content: JSON.stringify(result) });
      }
      continue;
    }

    const missing = REQUIRED_TOOLS.filter((name) => !called.has(name));
    if (missing.length > 0) {
      const next = missing[0] ?? "resolver_lugar";
      const bag = bagFromMessages(messages);
      const args = argumentsFor(next, input.text, dayLabel, bag.place);
      const result = await callAgentTool(deps, next, args, home, dayLabel);
      toolNames.push(next);
      messages.push({ role: "tool", name: next, content: JSON.stringify(result) });
      continue;
    }

    const bag = bagFromMessages(messages);
    const facts = factsFromReadings({
      place: bag.place ?? {
        found: false,
        name: home.name,
        ubigeo: home.ubigeo,
        lat: null,
        lng: null,
      },
      dayLabel,
      alerts: bag.alerts ?? {
        level: "sin_informacion",
        source: null,
        updatedAt: null,
        noticeId: null,
        cause: null,
        mentionsSutran: false,
        factual: "No hay un aviso vigente registrado para esa zona.",
      },
      history: bag.history ?? { estimate: null, mentionsSutran: false },
      forecast: bag.forecast ?? emptyForecast(),
      community: bag.community ?? {
        summary: "No hay reportes de comunidades registrados para esa zona.",
        mentionsSutran: false,
      },
    });
    return { reply: guardReply(completion.text, facts), toolNames, facts };
  }

  const fallback = composeCitizenReply({
    kind: "insufficient",
    place: home.name,
    dayLabel,
    level: "sin_informacion",
    source: null,
    updatedAtLabel: null,
    cause: null,
    estimate: null,
    factual: null,
    missingReason: "no pude completar la consulta",
    mentionsSutran: false,
    ubigeo: home.ubigeo,
    noticeId: null,
  });
  return {
    reply: fallback,
    toolNames,
    facts: {
      kind: "insufficient",
      place: home.name,
      dayLabel,
      level: "sin_informacion",
      source: null,
      updatedAtLabel: null,
      cause: null,
      estimate: null,
      factual: null,
      missingReason: "no pude completar la consulta",
      mentionsSutran: false,
      ubigeo: home.ubigeo,
      noticeId: null,
    },
  };
}

function argumentsFor(
  tool: string,
  text: string,
  dayLabel: string,
  place: ResolvedPlace | undefined,
): Record<string, unknown> {
  if (tool === "resolver_lugar") return { query: extractPlaceQuery(text) };
  return {
    ubigeo: place?.ubigeo,
    place: place?.name,
    date: dayLabel,
    latitude: place?.lat,
    longitude: place?.lng,
    query: extractPlaceQuery(text),
  };
}

/** Deterministic tool-calling stand-in. No network. The real adapter speaks to an LLM. */
export function createDeterministicClimateLlm(): MessagingDeps["llm"] {
  return {
    async complete({ messages }) {
      const system = messages.find((message) => message.role === "system")?.content ?? "";
      const user =
        [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
      if (!system.includes("KlAimate") || !isClimateRelated(user)) {
        return { kind: "message", text: OFF_TOPIC_REPLY };
      }
      const called = new Set(
        messages.filter((message) => message.role === "tool").map((message) => message.name),
      );
      const placeQuery = extractPlaceQuery(user);
      const dayLabel = extractDayLabel(user);
      if (!called.has("resolver_lugar")) {
        return {
          kind: "tool_calls",
          calls: [{ id: "t1", name: "resolver_lugar", arguments: { query: placeQuery } }],
        };
      }
      const place = JSON.parse(
        messages.find((message) => message.name === "resolver_lugar")?.content ?? "{}",
      ) as ResolvedPlace;
      if (!called.has("semaforo_y_alertas")) {
        return {
          kind: "tool_calls",
          calls: [{ id: "t2", name: "semaforo_y_alertas", arguments: { ubigeo: place.ubigeo } }],
        };
      }
      if (!called.has("historico_zona")) {
        return {
          kind: "tool_calls",
          calls: [{ id: "t3", name: "historico_zona", arguments: { ubigeo: place.ubigeo } }],
        };
      }
      if (!called.has("pronostico")) {
        return {
          kind: "tool_calls",
          calls: [
            {
              id: "t4",
              name: "pronostico",
              arguments: {
                place: place.name,
                date: dayLabel,
                latitude: place.lat,
                longitude: place.lng,
              },
            },
          ],
        };
      }
      if (!called.has("reportes_comunidad")) {
        return {
          kind: "tool_calls",
          calls: [{ id: "t5", name: "reportes_comunidad", arguments: { ubigeo: place.ubigeo } }],
        };
      }
      const bag = bagFromMessages(messages);
      const facts = factsFromReadings({
        place: bag.place ?? { found: false, name: "la zona", ubigeo: null, lat: null, lng: null },
        dayLabel,
        alerts: bag.alerts ?? {
          level: "sin_informacion",
          source: null,
          updatedAt: null,
          noticeId: null,
          cause: null,
          mentionsSutran: false,
          factual: "No hay un aviso vigente registrado para esa zona.",
        },
        history: bag.history ?? { estimate: null, mentionsSutran: false },
        forecast: bag.forecast ?? emptyForecast(),
        community: bag.community ?? {
          summary: "No hay reportes de comunidades registrados para esa zona.",
          mentionsSutran: false,
        },
      });
      return { kind: "message", text: composeCitizenReply(facts) };
    },
  };
}
