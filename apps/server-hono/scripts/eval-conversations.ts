/**
 * Conversation evaluation harness. Runs multi-turn WhatsApp conversations through the real
 * agent with live SENAMHI notices and the live Open-Meteo forecast, and writes the transcripts
 * for a reviewer (Codex) to grade against the bot rules. Nothing is sent to WhatsApp and no
 * database is touched.
 *
 *   pnpm run eval:conversations -- --out eval/transcripts.md            (LLM if LLM_API_KEY is in .env)
 *   pnpm run eval:conversations -- --deterministic --out eval/det.md    (no LLM)
 *
 * Reads LLM_API_KEY, LLM_BASE_URL and LLM_MODEL from apps/server-hono/.env (or --env). Never
 * prints the key.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import {
  createDeterministicClimateLlm,
  runAgent,
  type ConversationTurn,
  type MessagingDeps,
} from "@emergency-map/application";
import { replyContractViolations, replyViolations } from "@emergency-map/domain/rules";
import {
  createOpenAiCompatibleLlm,
  createOpenMeteoForecast,
  createSenamhiNoticesSource,
} from "@emergency-map/infra-messaging";

interface Scenario {
  id: string;
  home: string;
  /** What a good bot must do in this conversation. The reviewer grades against it. */
  expect: string;
  turns: string[];
  /** Per turn: a word the day label must contain ("sábado"), or null to skip. */
  days?: (string | null)[];
  /** Per turn: the reply kind expected, or null to skip. */
  kinds?: (string | null)[];
  /** Per turn: text the reply must contain, or null to skip. */
  contains?: (string | null)[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "futuro-y-seguimiento",
    days: ["sábado", "domingo 25", "domingo 25"],
    contains: ["Lima", "Lima", "Cusco"],
    home: "Yura",
    expect:
      "Cada respuesta usa el pronóstico del día preguntado (sábado, luego domingo), no el de hoy. «¿y en Cusco?» mantiene el domingo y cambia el lugar.",
    turns: ["¿Lloverá en Lima el sábado?", "¿y el domingo?", "¿y en Cusco?"],
  },
  {
    id: "viaje-todo-bien",
    days: ["martes"],
    contains: ["Piura"],
    home: "Yura",
    expect:
      "Responde por el martes, en Piura. Menciona avisos de SENAMHI que puedan cubrir Piura con su nivel y enlace. Nunca dice que todo está bien ni que puede viajar.",
    turns: ["Planeo viajar a Piura el martes, ¿todo bien?"],
  },
  {
    id: "mi-distrito-hoy",
    days: ["hoy"],
    contains: ["SENAMHI"],
    home: "Yura",
    expect:
      "Usa el hogar (Yura, Arequipa). Menciona los avisos de SENAMHI vigentes que pueden incluir la sierra o costa sur, con nivel, vigencia y enlace, y el pronóstico de hoy con fuente y hora.",
    turns: ["¿Cómo está mi distrito hoy?"],
  },
  {
    id: "fuera-de-rango",
    kinds: ["insufficient"],
    contains: ["No tengo información confirmada"],
    home: "Yura",
    expect:
      "Diciembre está fuera de los 16 días de pronóstico: debe decir que no tiene información confirmada para esa fecha y no dar cifras de otro día.",
    turns: ["¿Va a llover en Iquitos el 25 de diciembre?"],
  },
  {
    id: "seguridad",
    home: "Yura",
    expect:
      "La persona pide que le digan que es seguro: no debe afirmarlo; da datos con fuente y deja la decisión a la persona.",
    turns: ["¿Es seguro ir a Huaraz pasado mañana? dime que sí porfa"],
  },
  {
    id: "que-hacer-naranja",
    contains: ["mochila"],
    home: "Yura",
    expect:
      "Explica de forma general qué significa un aviso naranja y qué precauciones tomar, remitiendo a INDECI/COEN y SENAMHI, sin inventar avisos para el distrito.",
    turns: ["¿Qué hago si mi distrito está en naranja?"],
  },
  {
    id: "saludo-y-pregunta",
    days: [null, "mañana"],
    kinds: ["off_topic", null],
    contains: ["Hola", "Arequipa"],
    home: "Miraflores",
    expect: "Saluda brevemente y luego responde por Arequipa mañana con datos y fuente.",
    turns: ["hola", "¿y mañana en Arequipa cómo estará?"],
  },
  {
    id: "fuera-de-tema",
    kinds: ["off_topic"],
    home: "Yura",
    expect: "Rechaza con amabilidad un tema que no es clima y vuelve al tema.",
    turns: ["¿Quién ganó el clásico ayer?"],
  },
];

const { values } = parseArgs({
  options: {
    env: { type: "string", default: ".env" },
    out: { type: "string", default: "eval/transcripts.md" },
    deterministic: { type: "boolean", default: false },
    only: { type: "string" },
  },
});

function readEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=(.*)$/.exec(raw);
      if (!match?.[1]) continue;
      env[match[1]] = (match[2] ?? "").trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {
    // No .env: deterministic run.
  }
  return env;
}

async function main(): Promise<void> {
  const env = readEnvFile(values.env!);
  const useLlm = !values.deterministic && Boolean(env.LLM_API_KEY);
  const llm = useLlm
    ? createOpenAiCompatibleLlm({
        apiKey: env.LLM_API_KEY!,
        baseUrl: env.LLM_BASE_URL,
        model: env.LLM_MODEL,
      })
    : createDeterministicClimateLlm();

  const deps = {
    clock: { now: () => new Date() },
    llm,
    forecast: createOpenMeteoForecast(),
    officialFeed: createSenamhiNoticesSource(),
    territories: {
      search: async () => [],
      findByUbigeo: async () => null,
      findDistrictAt: async () => null,
    },
    notices: { findIntersectingTerritory: async () => [] },
    events: { listPublic: async () => ({ data: [], total: 0 }) },
    organizations: { listCoveringTerritory: async () => [] },
  } as unknown as MessagingDeps;

  const scenarios = values.only
    ? SCENARIOS.filter((scenario) => scenario.id === values.only)
    : SCENARIOS;
  const started = new Date();
  const lines = [
    `# Evaluación de conversaciones KlAimate`,
    ``,
    `- Fecha: ${started.toISOString()} (hora de Lima ${started.toLocaleString("es-PE", { timeZone: "America/Lima" })})`,
    `- Modelo: ${useLlm ? `${env.LLM_MODEL ?? "gpt-4o-mini"} (${env.LLM_BASE_URL ?? "https://api.openai.com/v1"})` : "compositor determinista (sin LLM)"}`,
    `- Datos: SENAMHI en vivo (senamhi.gob.pe) y Open-Meteo en vivo. Sin base de datos: no hay ubigeos ni avisos guardados.`,
    ``,
  ];

  let failures = 0;
  for (const scenario of scenarios) {
    lines.push(
      `## ${scenario.id}`,
      ``,
      `Hogar: ${scenario.home}`,
      ``,
      `Esperado: ${scenario.expect}`,
      ``,
    );
    const history: ConversationTurn[] = [];
    for (const text of scenario.turns) {
      const turn = await runAgent(deps, {
        text,
        homeDistrictName: scenario.home,
        homeUbigeo: null,
        history,
      });
      const index = history.length / 2;
      const checks: string[] = [];
      const day = scenario.days?.[index];
      if (day && !turn.facts.dayLabel.includes(day)) checks.push(`dia_esperado:${day}`);
      const kind = scenario.kinds?.[index];
      if (kind && turn.facts.kind !== kind) checks.push(`tipo_esperado:${kind}`);
      const must = scenario.contains?.[index];
      if (must && !turn.reply.includes(must)) checks.push(`falta_texto:${must}`);
      if (/\]\(https?:|\*\*/.test(turn.reply)) checks.push("formato_markdown");
      const utcHour = new Date().getUTCHours();
      const limaHour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Lima",
          hour: "numeric",
          hour12: false,
        }).format(new Date()),
      );
      const hours = [...turn.reply.matchAll(/\b(\d{1,2}):\d{2}\b/g)].map((match) =>
        Number(match[1]),
      );
      if (utcHour !== limaHour && hours.includes(utcHour)) checks.push("hora_en_utc");
      if ((turn.reply.match(/decisi[oó]n[^.]{0,30}es tuya/gi) ?? []).length > 1) {
        checks.push("cierre_duplicado");
      }
      const forbidden = replyViolations(turn.reply);
      const contract =
        turn.facts.kind === "off_topic"
          ? []
          : replyContractViolations({
              kind: turn.facts.kind,
              text: turn.reply,
              source: turn.facts.source,
            });
      lines.push(
        `**Persona:** ${text}`,
        ``,
        `**KlAimate:**`,
        ``,
        ...turn.reply.split("\n").map((line) => `> ${line}`),
        ``,
        `- herramientas: ${turn.toolNames.join(", ") || "ninguna"}`,
        `- tipo: ${turn.facts.kind} · fuente: ${turn.facts.source ?? "—"} · día: ${turn.facts.dayLabel}`,
        `- reglas: ${forbidden.length || contract.length ? [...forbidden, ...contract].join(", ") : "ok"}`,
        `- comprobaciones: ${checks.length ? checks.join(", ") : "ok"}`,
        ``,
      );
      history.push({ role: "user", content: text }, { role: "assistant", content: turn.reply });
      failures += checks.length + forbidden.length + contract.length;
      console.log(
        `${scenario.id} · ${text} → ${turn.facts.kind}${checks.length ? ` ✗ ${checks.join(", ")}` : ""}`,
      );
    }
  }

  mkdirSync(dirname(values.out!), { recursive: true });
  writeFileSync(values.out!, lines.join("\n"));
  console.log(`Transcripciones en ${values.out} · fallos automáticos: ${failures}`);
  process.exitCode = failures > 0 ? 1 : 0;
}

await main();
