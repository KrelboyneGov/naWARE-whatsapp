import { OFF_TOPIC_REPLY } from "@emergency-map/domain/schemas";
import {
  INFORMATIVE_DISCLAIMER,
  NO_CONFIRMED_INFORMATION,
  foldText,
  replyContractViolations,
  semaphoreRank,
} from "@emergency-map/domain/rules";
import type { AlertReading, CommunityReading, HistoryReading, ResolvedPlace } from "./zone";
import { formatTimeLima } from "./zone";
import type { ForecastSnapshot } from "@emergency-map/domain/repositories";

export interface CitizenFacts {
  kind: "clear" | "risk" | "insufficient" | "off_topic";
  place: string;
  dayLabel: string;
  level: string;
  source: string | null;
  updatedAtLabel: string | null;
  cause: string | null;
  estimate: string | null;
  factual: string | null;
  missingReason: string | null;
  mentionsSutran: boolean;
  ubigeo: string | null;
  noticeId: string | null;
}

export function composeCitizenReply(facts: CitizenFacts): string {
  if (facts.kind === "off_topic") return OFF_TOPIC_REPLY;
  if (facts.kind === "insufficient") {
    return `${NO_CONFIRMED_INFORMATION} para decirte cómo estará ${facts.place} el ${facts.dayLabel}: ${facts.missingReason ?? "no hay datos de esa fecha"}. Prefiero no adivinar. Revisa el pronóstico de SENAMHI cerca de tu viaje y, si quieres, te aviso por aquí cuando haya información nueva.`;
  }

  const time = facts.updatedAtLabel ?? "00:00";
  const source = facts.source ?? "la fuente consultada";
  const limit = "Es un pronóstico y puede cambiar";
  let text: string;
  if (facts.kind === "risk") {
    text = `Ojo: según ${source}, con datos de las ${time} de hoy, ${facts.place} está en nivel ${facts.level} para ${facts.dayLabel} por ${facts.cause ?? "un aviso vigente"}. Considera otra fecha o salir temprano, y sigue las indicaciones de Defensa Civil. ${limit}. ${INFORMATIVE_DISCLAIMER} La decisión es tuya.`;
  } else {
    text = `Según ${source}, con datos de las ${time} de hoy, ${facts.place} no tiene alertas de lluvia fuertes para ${facts.dayLabel} (${facts.level}). El pronóstico puede cambiar, así que revisa de nuevo antes de salir. Consulta SENAMHI e INDECI/COEN si aparece un aviso nuevo. La decisión es tuya.`;
  }
  if (facts.factual) text += ` Dato factual: ${facts.factual}`;
  if (facts.estimate) {
    text += ` Estimación basada en el histórico, no es un pronóstico: ${facts.estimate}`;
  }
  if (facts.mentionsSutran) text += " Sutran figura en los registros de esta zona.";
  return text;
}

export function guardReply(draft: string, facts: CitizenFacts): string {
  const safe = composeCitizenReply(facts);
  const kind = facts.kind === "off_topic" ? "off_topic" : facts.kind;
  const violations = replyContractViolations({ kind, text: draft, source: facts.source });
  if (violations.length > 0) return safe;
  if (!facts.mentionsSutran && foldText(draft).includes("sutran")) return safe;
  return draft;
}

export function factsFromReadings(input: {
  place: ResolvedPlace;
  dayLabel: string;
  alerts: AlertReading;
  history: HistoryReading;
  forecast: ForecastSnapshot;
  community: CommunityReading;
}): CitizenFacts {
  const mentionsSutran =
    input.alerts.mentionsSutran || input.history.mentionsSutran || input.community.mentionsSutran;
  const forecastHeavy = (input.forecast.precipitationProbabilityMax ?? 0) >= 60;
  const officialRisk = semaphoreRank(input.alerts.level) >= semaphoreRank("naranja");

  let kind: CitizenFacts["kind"] = "insufficient";
  let source: string | null = input.alerts.source;
  let updatedAtLabel: string | null = input.alerts.updatedAt
    ? formatTimeLima(new Date(input.alerts.updatedAt))
    : null;
  let cause = input.alerts.cause;
  let level: string = input.alerts.level;

  if (!input.place.found && !input.forecast.available && input.alerts.level === "sin_informacion") {
    kind = "insufficient";
  } else if (officialRisk) {
    kind = "risk";
  } else if (input.forecast.available && forecastHeavy) {
    kind = "risk";
    source = "Open-Meteo";
    updatedAtLabel = input.forecast.fetchedAt
      ? formatTimeLima(new Date(input.forecast.fetchedAt))
      : updatedAtLabel;
    cause = input.forecast.summary ?? "probabilidad alta de precipitación";
    level = "pronóstico de lluvia";
  } else if (input.forecast.available || input.alerts.source) {
    kind = "clear";
    if (!source && input.forecast.available) {
      source = "Open-Meteo";
      updatedAtLabel = input.forecast.fetchedAt
        ? formatTimeLima(new Date(input.forecast.fetchedAt))
        : updatedAtLabel;
    }
  } else {
    kind = "insufficient";
  }

  return {
    kind,
    place: input.place.name,
    dayLabel: input.dayLabel,
    level,
    source,
    updatedAtLabel,
    cause,
    estimate: input.history.estimate,
    factual: input.alerts.factual,
    missingReason:
      input.forecast.reason ?? "no hay avisos ni pronóstico confirmados para esa fecha",
    mentionsSutran,
    ubigeo: input.place.ubigeo,
    noticeId: input.alerts.noticeId,
  };
}
