import { OFF_TOPIC_REPLY } from "@emergency-map/domain/schemas";
import {
  INFORMATIVE_DISCLAIMER,
  absoluteDayLabel,
  NO_CONFIRMED_INFORMATION,
  foldText,
  replyContractViolations,
  replyViolations,
  cleanRegionName,
  semaphoreRank,
} from "@emergency-map/domain/rules";
import type { AlertReading, CommunityReading, HistoryReading, ResolvedPlace } from "./zone";
import { formatTimeLima } from "./zone";
import type { ForecastSnapshot, LiveOfficialNotice } from "@emergency-map/domain/repositories";

export interface CitizenFacts {
  kind: "clear" | "risk" | "insufficient" | "off_topic";
  place: string;
  /** Human label of the day asked about, e.g. "el sábado 24 de octubre". */
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
  /** Ready-made sentence with the forecast for the asked day, source and time. */
  forecastLine?: string | null;
  /** General precautions, when the person asked what to do. */
  advice?: string | null;
  /** Ready-made sentence with the current SENAMHI notices that may cover the place. */
  noticesLine?: string | null;
}

/** Current SENAMHI notices, already filtered to the ones that may cover the place on the day. */
export interface LiveNoticesReading {
  available: boolean;
  fetchedAt: string | null;
  region: string | null;
  relevant: LiveOfficialNotice[];
  reason: string | null;
}

const LIMIT = "Es un pronóstico y puede cambiar; revisa de nuevo antes de salir.";
const OFFICIAL = "Ante una emergencia sigue las indicaciones de INDECI/COEN y SENAMHI.";
const DECISION = "La decisión es tuya.";

/** "lima" → "Lima", "san juan de lurigancho" → "San Juan de Lurigancho". */
function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && /^(de|del|la|las|los|y)$/i.test(word)
        ? word.toLocaleLowerCase("es-PE")
        : word.charAt(0).toLocaleUpperCase("es-PE") + word.slice(1),
    )
    .join(" ");
}

function sentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase("es-PE");
  return lower.charAt(0).toLocaleUpperCase("es-PE") + lower.slice(1);
}

/**
 * Fallback and deterministic reply. Never says a place is safe, never shows internal codes,
 * and only attributes to a source what that source said.
 */
/** General guidance for "¿qué hago?". Not tied to a district and never says a place is safe. */
export const PRECAUTIONS_ADVICE =
  "En los avisos de SENAMHI, naranja significa que se espera un fenómeno de intensidad alta y conviene prepararse; rojo, de intensidad extrema. Qué hacer: sigue los comunicados de SENAMHI e INDECI/COEN. Si es por lluvias, evita cruzar ríos, quebradas y zonas de huaico. Si es por viento, asegura techos y objetos sueltos y aléjate de estructuras inestables. Si es por calor o frío, protégete del sol o abrígate y cuida a niños y adultos mayores. Ten lista una mochila de emergencia (agua, linterna, radio, documentos) y acuerda con tu familia un punto de reunión.";

/**
 * WhatsApp does not render Markdown links, headings or double-asterisk bold. Links become the
 * bare URL (or "label: URL"), **bold** becomes *bold*, headings lose their hashes.
 */
export function formatForWhatsApp(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label: string, url: string) =>
      /^(aqu[ií]|este enlace|el enlace|enlace|enlace aqu[ií]|m[aá]s detalles( aqu[ií])?|ver|link)$/i.test(
        label.trim(),
      )
        ? url
        : `${label}: ${url}`,
    )
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function wantsAdvice(text: string): boolean {
  return /que hago|que hacer|que debo|precauc|recomend|prepar|como me cuido/.test(foldText(text));
}

export function composeCitizenReply(facts: CitizenFacts): string {
  if (facts.kind === "off_topic") return OFF_TOPIC_REPLY;
  if (facts.kind === "insufficient") {
    return `${NO_CONFIRMED_INFORMATION} para decirte cómo estará ${facts.place} ${facts.dayLabel}: ${(facts.missingReason ?? "no hay datos de esa fecha").replace(/\.+$/, "")}. Prefiero no adivinar. Vuelve a preguntarme más cerca de la fecha o revisa SENAMHI. ${OFFICIAL}`;
  }

  const stamp = facts.updatedAtLabel ? `, datos de las ${facts.updatedAtLabel}` : "";
  const source = facts.source ?? "las fuentes consultadas";
  const lines: string[] = [];
  if (facts.kind === "risk") {
    const level =
      facts.level && facts.level !== "sin_informacion"
        ? `; el más alto, nivel ${facts.level} según ${source}`
        : "";
    lines.push(
      `Atención para ${facts.place} ${facts.dayLabel}: ${facts.cause ?? "hay un aviso vigente"}${level}.`,
    );
  } else {
    lines.push(`${facts.place}, ${facts.dayLabel}.`);
  }
  if (facts.advice) lines.push(facts.advice);
  if (facts.forecastLine) lines.push(facts.forecastLine);
  if (facts.noticesLine) lines.push(facts.noticesLine);
  if (!facts.forecastLine && !facts.noticesLine) {
    const factual = (facts.factual ?? "no encontré avisos para esa zona").replace(/\.$/, "");
    lines.push(`Según ${source}${stamp}: ${factual}.`);
  } else if (facts.factual) {
    lines.push(`Dato factual: ${facts.factual}`);
  }
  if (facts.estimate) {
    lines.push(`Estimación basada en el histórico, no es un pronóstico: ${facts.estimate}`);
  }
  if (facts.mentionsSutran) lines.push("Sutran figura en los registros de esta zona.");
  lines.push(LIMIT, OFFICIAL);
  if (facts.kind === "risk") lines.push(INFORMATIVE_DISCLAIMER);
  lines.push(DECISION);
  return lines.join("\n");
}

/**
 * Adds what a model reply misses from the reply contract (source and time, limit, official
 * referral, disclaimer, decision) instead of throwing the reply away.
 */
export function completeReplyContract(draft: string, facts: CitizenFacts): string {
  const kind = facts.kind;
  const violations = new Set(replyContractViolations({ kind, text: draft, source: facts.source }));
  const additions: string[] = [];
  let text = draft.trim();
  if (violations.has("missing_no_confirmed_information")) {
    text = `${NO_CONFIRMED_INFORMATION}. ${text}`;
  }
  if ((violations.has("missing_source") || violations.has("missing_time")) && facts.source) {
    // Say what each source gave, so forecast numbers are never attributed to SENAMHI.
    const what =
      facts.source === "SENAMHI"
        ? "Avisos"
        : facts.source === "Open-Meteo"
          ? "Pronóstico"
          : "Fuente";
    additions.push(
      `${what}: ${facts.source}${facts.updatedAtLabel ? `, consultado a las ${facts.updatedAtLabel} (hora de Lima)` : ""}.`,
    );
  }
  if (violations.has("missing_limit")) additions.push("El pronóstico puede cambiar.");
  if (violations.has("missing_official")) additions.push(OFFICIAL);
  if (violations.has("missing_disclaimer")) additions.push(INFORMATIVE_DISCLAIMER);
  if (violations.has("missing_user_decision")) additions.push(DECISION);
  return additions.length > 0 ? `${text}\n\n${additions.join(" ")}` : text;
}

/**
 * The model's reply, completed to the contract. Falls back to the composed reply only when the
 * model said something forbidden, mentioned Sutran without data, or returned nothing usable.
 */
export function guardReply(draft: string, facts: CitizenFacts): string {
  const safe = composeCitizenReply(facts);
  if (!draft.trim()) return safe;
  if (replyViolations(draft).length > 0) return safe;
  if (!facts.mentionsSutran && foldText(draft).includes("sutran")) return safe;
  if (facts.kind === "off_topic") return draft;
  const completed = completeReplyContract(draft, facts);
  const remaining = replyContractViolations({
    kind: facts.kind,
    text: completed,
    source: facts.source,
  });
  return remaining.length === 0 ? completed : safe;
}

export function factsFromReadings(input: {
  place: ResolvedPlace;
  dayLabel: string;
  alerts: AlertReading;
  history: HistoryReading;
  forecast: ForecastSnapshot;
  community: CommunityReading;
  /** Live SENAMHI notices. When present they replace the stored notices as the official source. */
  live?: LiveNoticesReading;
}): CitizenFacts {
  const { forecast, live } = input;
  const mentionsSutran =
    input.alerts.mentionsSutran || input.history.mentionsSutran || input.community.mentionsSutran;
  const forecastTime = forecast.fetchedAt ? formatTimeLima(new Date(forecast.fetchedAt)) : null;
  const liveTime = live?.fetchedAt ? formatTimeLima(new Date(live.fetchedAt)) : null;

  const placeName = titleCase(input.place.name);
  const forecastLine = forecast.available
    ? `Pronóstico de Open-Meteo para ${input.dayLabel}${forecastTime ? ` (consultado a las ${forecastTime})` : ""}: ${forecast.summary ?? "sin datos de lluvia"}`
    : `${NO_CONFIRMED_INFORMATION} del pronóstico para ${input.dayLabel}: ${forecast.reason ?? "Open-Meteo no respondió"}`;
  const relevant = [...(live?.relevant ?? [])].sort(
    (a, b) => semaphoreRank(b.level) - semaphoreRank(a.level),
  );

  let noticesLine: string | null = null;
  if (live?.available) {
    const zone = live.region ? cleanRegionName(live.region) : placeName;
    noticesLine =
      relevant.length > 0
        ? relevant
            .slice(0, 2)
            .map(
              (notice) =>
                `SENAMHI tiene vigente el aviso N° ${notice.number} «${sentenceCase(notice.title)}», nivel ${notice.level} según SENAMHI, vigente del ${absoluteDayLabel(notice.validFrom)} al ${absoluteDayLabel(notice.validTo)}. Revisa si incluye tu zona: ${notice.url}`,
            )
            .join("\n") + ` (SENAMHI, consultado a las ${liveTime ?? "--:--"}).`
        : `En los avisos vigentes de SENAMHI (consultados a las ${liveTime ?? "--:--"}) no encontré uno vigente para esa fecha que pueda incluir la zona de ${zone}. Eso no descarta lluvias.`;
  } else if (live) {
    noticesLine = `No pude consultar los avisos de SENAMHI (${live.reason ?? "sin respuesta"}).`;
  }

  const topNotice = live?.available ? relevant[0] : undefined;
  const useStored = !live?.available;
  const storedRisk = useStored && semaphoreRank(input.alerts.level) >= semaphoreRank("naranja");
  const forecastHeavy = (forecast.precipitationProbabilityMax ?? 0) >= 60;

  let kind: CitizenFacts["kind"];
  let source: string | null = null;
  let updatedAtLabel: string | null = null;
  let cause: string | null = null;
  let level = "sin_informacion";

  if (topNotice && semaphoreRank(topNotice.level) >= semaphoreRank("naranja")) {
    kind = "risk";
    source = "SENAMHI";
    updatedAtLabel = liveTime;
    // A macro-zone match is not district coverage: say "may include", never "Yura is in".
    cause = `hay avisos de SENAMHI que pueden incluir la zona de ${live?.region ? cleanRegionName(live.region) : placeName}`;
    level = topNotice.level;
  } else if (storedRisk) {
    kind = "risk";
    source = input.alerts.source;
    updatedAtLabel = input.alerts.updatedAt
      ? formatTimeLima(new Date(input.alerts.updatedAt))
      : null;
    cause = input.alerts.cause;
    level = input.alerts.level;
  } else if (forecast.available && forecastHeavy) {
    kind = "risk";
    source = "Open-Meteo";
    updatedAtLabel = forecastTime;
    cause = `pronóstico de lluvia (${forecast.precipitationProbabilityMax} % de probabilidad)`;
  } else if (forecast.available || relevant.length > 0 || (useStored && input.alerts.source)) {
    kind = "clear";
    if (forecast.available) {
      source = "Open-Meteo";
      updatedAtLabel = forecastTime;
    } else if (live?.available) {
      source = "SENAMHI";
      updatedAtLabel = liveTime;
    } else {
      source = input.alerts.source;
      updatedAtLabel = input.alerts.updatedAt
        ? formatTimeLima(new Date(input.alerts.updatedAt))
        : null;
    }
  } else {
    kind = "insufficient";
  }

  return {
    kind,
    place: placeName,
    dayLabel: input.dayLabel,
    level,
    source,
    updatedAtLabel,
    cause,
    estimate: input.history.estimate,
    // Stored notices are only quoted when they are the official source in use.
    factual: useStored && input.alerts.source ? input.alerts.factual : null,
    missingReason: forecast.reason ?? "no hay avisos ni pronóstico confirmados para esa fecha",
    mentionsSutran,
    ubigeo: input.place.ubigeo,
    noticeId: topNotice?.number ?? input.alerts.noticeId,
    forecastLine,
    noticesLine,
  };
}
