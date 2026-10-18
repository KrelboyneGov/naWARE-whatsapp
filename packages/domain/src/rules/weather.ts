/**
 * Turns forecast numbers into plain language. This is context from a weather model (forecast
 * layer, ADR 0008), never an official warning: the copy says so and there is no combined score.
 * UV bands follow the WHO UV index scale, the same one SENAMHI uses for Lima.
 */

export interface WeatherReading {
  temperatureC: number;
  apparentTemperatureC: number;
  uvIndex: number | null;
  observedAt: Date;
}

export type UvBand = "low" | "moderate" | "high" | "very_high" | "extreme";
export type ThermalBand = "cold" | "cool" | "mild" | "warm" | "hot";

export interface WeatherExplanation {
  headline: string;
  /** What the number means for a person outside right now. */
  meaning: string;
  actions: string[];
  thermalBand: ThermalBand;
  uvBand: UvBand | null;
}

export function uvBand(uv: number): UvBand {
  if (uv < 3) return "low";
  if (uv < 6) return "moderate";
  if (uv < 8) return "high";
  if (uv < 11) return "very_high";
  return "extreme";
}

/** Bands on the "feels like" temperature, which is what the body reacts to. */
export function thermalBand(apparentC: number): ThermalBand {
  if (apparentC < 12) return "cold";
  if (apparentC < 18) return "cool";
  if (apparentC < 26) return "mild";
  if (apparentC < 32) return "warm";
  return "hot";
}

const UV_TEXT: Record<UvBand, { label: string; meaning: string; actions: string[] }> = {
  low: {
    label: "Radiación UV baja",
    meaning: "El sol no representa un riesgo importante ahora.",
    actions: [],
  },
  moderate: {
    label: "Radiación UV moderada",
    meaning: "La piel sin protección puede irritarse si pasas mucho rato al sol.",
    actions: ["Usa bloqueador si vas a estar afuera más de una hora."],
  },
  high: {
    label: "Radiación UV alta",
    meaning: "La piel sin protección puede quemarse en unos 30 minutos.",
    actions: ["Usa bloqueador, gorro y lentes de sol.", "Busca sombra al mediodía."],
  },
  very_high: {
    label: "Radiación UV muy alta",
    meaning: "La piel sin protección puede quemarse en unos 15 minutos.",
    actions: [
      "Evita el sol directo entre las 10:00 y las 16:00.",
      "Usa bloqueador FPS 50 y renuévalo cada 3 horas.",
      "Protege a niños y adultos mayores primero.",
    ],
  },
  extreme: {
    label: "Radiación UV extrema",
    meaning: "La piel sin protección puede quemarse en menos de 10 minutos.",
    actions: [
      "Quédate bajo sombra o techo entre las 10:00 y las 16:00.",
      "Usa bloqueador FPS 50, gorro de ala ancha, lentes y ropa que cubra.",
    ],
  },
};

const THERMAL_TEXT: Record<ThermalBand, { label: string; meaning: string; actions: string[] }> = {
  cold: {
    label: "Hace frío en tu zona",
    meaning: "El cuerpo pierde calor rápido, sobre todo en niños y adultos mayores.",
    actions: ["Abrígate por capas y cubre cabeza y cuello."],
  },
  cool: {
    label: "Está fresco en tu zona",
    meaning: "Temperatura cómoda con abrigo ligero.",
    actions: [],
  },
  mild: {
    label: "Temperatura agradable",
    meaning: "No hay estrés por calor ni por frío.",
    actions: [],
  },
  warm: {
    label: "Hace calor en tu zona",
    meaning: "El cuerpo trabaja más para enfriarse; cansa más caminar o hacer esfuerzo al sol.",
    actions: ["Toma agua aunque no tengas sed."],
  },
  hot: {
    label: "Hace mucho calor en tu zona",
    meaning:
      "Hay riesgo de golpe de calor si haces esfuerzo al sol, sobre todo para niños, adultos mayores y personas con enfermedades crónicas.",
    actions: [
      "Toma agua cada hora y evita el esfuerzo físico al mediodía.",
      "Busca lugares frescos o con sombra.",
    ],
  },
};

const round = (n: number) => Math.round(n);

export function explainWeather(r: WeatherReading): WeatherExplanation {
  const thermal = thermalBand(r.apparentTemperatureC);
  const uv = r.uvIndex === null ? null : uvBand(r.uvIndex);
  const t = THERMAL_TEXT[thermal];
  const feels =
    Math.abs(r.apparentTemperatureC - r.temperatureC) >= 2
      ? ` Marca ${round(r.temperatureC)} °C, pero se siente como ${round(r.apparentTemperatureC)} °C.`
      : ` Marca ${round(r.temperatureC)} °C.`;

  // UV leads when it is the bigger concern (typical Lima summer: mild air, very high UV).
  const uvLeads = uv === "very_high" || uv === "extreme" || (uv === "high" && thermal === "mild");
  if (uv && uvLeads) {
    const u = UV_TEXT[uv];
    return {
      headline: `${u.label} (${round(r.uvIndex!)})`,
      meaning: `${u.meaning}${feels}`,
      actions: [...u.actions, ...t.actions],
      thermalBand: thermal,
      uvBand: uv,
    };
  }
  return {
    headline: t.label,
    meaning: `${t.meaning}${feels}`,
    actions: [...t.actions, ...(uv ? UV_TEXT[uv].actions : [])],
    thermalBand: thermal,
    uvBand: uv,
  };
}
