import { describe, expect, it } from "vitest";
import type {
  ForecastQuery,
  LlmCompletion,
  LlmMessage,
  LiveOfficialNotices,
} from "@emergency-map/domain/repositories";
import { replyViolations } from "@emergency-map/domain/rules";
import { createDeterministicClimateLlm, runAgent } from "../agent";
import type { MessagingDeps } from "../deps";

// Sunday 18 October 2026, 18:30 in Lima.
const NOW = new Date("2026-10-18T23:30:00.000Z");

const FEED: LiveOfficialNotices = {
  available: true,
  fetchedAt: NOW.toISOString(),
  notices: [
    {
      number: "423",
      title: "INCREMENTO DE VIENTO EN LA COSTA CENTRO Y SUR Y SIERRA SUR",
      level: "naranja",
      validFrom: "2026-10-18",
      validTo: "2026-10-20",
      url: "https://www.senamhi.gob.pe/?p=aviso-meteorologico-vigente&b=29288",
    },
    {
      number: "421",
      title: "PRECIPITACIONES EN LA SIERRA NORTE Y COSTA NORTE",
      level: "naranja",
      validFrom: "2026-10-17",
      validTo: "2026-10-19",
      url: "https://www.senamhi.gob.pe/?p=aviso-meteorologico-vigente&b=29267",
    },
  ],
};

function agentDeps(llm: MessagingDeps["llm"]) {
  const forecasts: ForecastQuery[] = [];
  const deps = {
    clock: { now: () => NOW },
    llm,
    forecast: {
      async forecast(query: ForecastQuery) {
        forecasts.push(query);
        const region = /arequipa|yura/i.test(query.placeName)
          ? "Arequipa"
          : /cusco/i.test(query.placeName)
            ? "Cusco"
            : "Lima";
        return {
          available: true,
          source: "Open-Meteo" as const,
          fetchedAt: NOW.toISOString(),
          summary: `probabilidad máxima de lluvia 30 % el ${query.date}.`,
          precipitationProbabilityMax: 30,
          forDate: query.date,
          precipitationSumMm: 1.2,
          temperatureMaxC: 20,
          temperatureMinC: 9,
          region,
          reason: null,
        };
      },
    },
    officialFeed: { listCurrent: async () => FEED },
    territories: {
      search: async () => [],
      findByUbigeo: async () => null,
      findDistrictAt: async () => null,
    },
    notices: { findIntersectingTerritory: async () => [] },
    events: { listPublic: async () => ({ data: [], total: 0 }) },
    organizations: { listCoveringTerritory: async () => [] },
  } as unknown as MessagingDeps;
  return { deps, forecasts };
}

describe("runAgent dates", () => {
  it("asks the forecast for the day in the question, not today", async () => {
    const { deps, forecasts } = agentDeps(createDeterministicClimateLlm());

    const turn = await runAgent(deps, {
      text: "¿Lloverá en Lima el sábado?",
      homeDistrictName: "Yura",
      homeUbigeo: null,
    });

    expect(forecasts.map((query) => query.date)).toEqual(["2026-10-24"]);
    expect(turn.reply).toContain("sábado 24 de octubre");
    expect(turn.reply).not.toContain("sin_informacion");
    expect(replyViolations(turn.reply)).toEqual([]);
  });

  it("keeps the previous place and date on a follow-up", async () => {
    const { deps, forecasts } = agentDeps(createDeterministicClimateLlm());

    await runAgent(deps, {
      text: "¿y mañana?",
      homeDistrictName: "Yura",
      homeUbigeo: null,
      history: [
        { role: "user", content: "¿Cómo estará Cusco el sábado?" },
        { role: "assistant", content: "Cusco, el sábado 24 de octubre…" },
      ],
    });
    await runAgent(deps, {
      text: "¿y en Arequipa?",
      homeDistrictName: "Yura",
      homeUbigeo: null,
      history: [{ role: "user", content: "¿Cómo estará Cusco el sábado?" }],
    });

    expect(forecasts[0]).toMatchObject({ placeName: "cusco", date: "2026-10-19" });
    expect(forecasts[1]).toMatchObject({ placeName: "arequipa", date: "2026-10-24" });
  });
});

describe("runAgent out of the forecast range", () => {
  it("says there is no confirmed information and keeps the reason", async () => {
    const { deps } = agentDeps(createDeterministicClimateLlm());
    deps.forecast = {
      async forecast(query) {
        return {
          available: false,
          source: "Open-Meteo",
          fetchedAt: NOW.toISOString(),
          summary: null,
          precipitationProbabilityMax: null,
          forDate: query.date,
          precipitationSumMm: null,
          temperatureMaxC: null,
          temperatureMinC: null,
          region: null,
          reason: `Open-Meteo no tiene pronóstico para ${query.date}: solo cubre los próximos 16 días.`,
        };
      },
    };

    const turn = await runAgent(deps, {
      text: "¿Va a llover en Iquitos el 25 de diciembre?",
      homeDistrictName: "Yura",
      homeUbigeo: null,
    });

    expect(turn.facts.kind).toBe("insufficient");
    expect(turn.reply).toContain("No tengo información confirmada");
    expect(turn.reply).toContain("16 días");
    expect(turn.reply).not.toContain(": .");
  });
});

describe("runAgent official notices", () => {
  it("quotes only the SENAMHI notices that may cover the region, with SENAMHI's level", async () => {
    const { deps } = agentDeps(createDeterministicClimateLlm());

    const turn = await runAgent(deps, {
      text: "¿Cómo está mi distrito hoy?",
      homeDistrictName: "Yura",
      homeUbigeo: null,
    });

    expect(turn.reply).toContain("N° 423");
    expect(turn.reply).not.toContain("N° 421");
    expect(turn.reply).toContain("naranja según SENAMHI");
    expect(turn.facts.kind).toBe("risk");
  });
});

describe("runAgent with a tool-calling model", () => {
  it("sends each tool result after the assistant message that asked for it, with its id", async () => {
    const seen: LlmMessage[][] = [];
    const llm: MessagingDeps["llm"] = {
      async complete({ messages }): Promise<LlmCompletion> {
        seen.push(messages.map((message) => ({ ...message })));
        if (!messages.some((message) => message.role === "tool")) {
          return {
            kind: "tool_calls",
            calls: [
              { id: "call_a", name: "avisos_senamhi_vigentes", arguments: {} },
              { id: "call_b", name: "pronostico", arguments: { place: "Lima", date: "sábado" } },
            ],
          };
        }
        return {
          kind: "message",
          text: "En Lima el sábado 24 hay 30 % de probabilidad de lluvia según Open-Meteo.",
        };
      },
    };
    const { deps, forecasts } = agentDeps(llm);

    const turn = await runAgent(deps, {
      text: "¿Lloverá en Lima el sábado?",
      homeDistrictName: "Yura",
      homeUbigeo: null,
    });

    const second = seen[1] ?? [];
    const assistant = second.find((message) => message.role === "assistant");
    expect(assistant?.toolCalls?.map((call) => call.id)).toEqual(["call_a", "call_b"]);
    const results = second.filter((message) => message.role === "tool");
    expect(results.map((message) => message.toolCallId).sort()).toEqual(["call_a", "call_b"]);
    // "sábado" from the model becomes the ISO date of next Saturday.
    expect(forecasts[0]?.date).toBe("2026-10-24");
    // The model's own words survive; the contract pieces it missed are appended.
    expect(turn.reply).toContain("30 % de probabilidad");
    expect(turn.reply).toContain("puede cambiar");
    expect(turn.reply).toMatch(/INDECI/);
  });

  it("falls back to the composed reply when the model says a place is safe", async () => {
    const llm: MessagingDeps["llm"] = {
      async complete({ messages }): Promise<LlmCompletion> {
        if (!messages.some((message) => message.role === "tool")) {
          return { kind: "tool_calls", calls: [{ id: "c1", name: "pronostico", arguments: {} }] };
        }
        return { kind: "message", text: "Tranquilo, es seguro viajar, no hay riesgo." };
      },
    };
    const { deps } = agentDeps(llm);

    const turn = await runAgent(deps, {
      text: "¿Viajo a Lima mañana?",
      homeDistrictName: "Yura",
      homeUbigeo: null,
    });

    expect(replyViolations(turn.reply)).toEqual([]);
    expect(turn.reply).toContain("Open-Meteo");
  });
});

describe("WhatsApp formatting", () => {
  it("turns Markdown links and bold into WhatsApp text", async () => {
    const { formatForWhatsApp } = await import("../compose");
    expect(
      formatForWhatsApp(
        "Revisa [aquí](https://senamhi.gob.pe/a) y **N° 423**.\n\n\n## Nota\n[Aviso 423](https://senamhi.gob.pe/b)",
      ),
    ).toBe(
      "Revisa https://senamhi.gob.pe/a y *N° 423*.\n\nNota\nAviso 423: https://senamhi.gob.pe/b",
    );
  });
});

describe("reply contract closing", () => {
  it("accepts 'la decisión de viajar es tuya' so the closing is not added twice", async () => {
    const { replyContractViolations } = await import("@emergency-map/domain/rules");
    const violations = replyContractViolations({
      kind: "risk",
      source: "SENAMHI",
      text: "Aviso de SENAMHI a las 09:48. Puede cambiar. Consulta INDECI. Esto es informativo y no sustituye a INDECI ni a SENAMHI. La decisión de viajar es tuya.",
    });
    expect(violations).not.toContain("missing_user_decision");
  });
});
