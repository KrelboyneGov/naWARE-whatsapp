import type { TemplatePolicyInput } from "../rules/template-policy";

export interface WhatsAppTemplateButton {
  type: "quick_reply";
  text: "BAJA";
}

export interface WhatsAppTemplate extends TemplatePolicyInput {
  buttons: readonly WhatsAppTemplateButton[];
  examples: Readonly<Record<string, string>>;
  /** What the template is for. One template per notice type. */
  purpose: "home_level" | "consulted_zone" | "daily_digest" | "opt_in" | "opt_out";
}

const BAJA_BUTTON = { type: "quick_reply", text: "BAJA" } as const;

/**
 * Utility templates in Peruvian Spanish. Variable names stay stable; example
 * values are what Meta reviews. `enlace` is a placeholder — the submit script
 * replaces its example with APP_PUBLIC_URL when that env var is set.
 */
export const WHATSAPP_TEMPLATES = [
  {
    name: "alerta_semaforo_zona",
    purpose: "home_level",
    language: "es",
    category: "UTILITY",
    body: "Hola, te avisamos que el semáforo de lluvias en {{distrito}} subió a nivel {{nivel}} el {{fecha}}. Fuente: {{fuente}}. Revisa el detalle y qué hacer aquí: {{enlace}}. Para dejar de recibir avisos, responde BAJA.",
    variables: ["distrito", "nivel", "fecha", "fuente", "enlace"],
    buttons: [BAJA_BUTTON],
    examples: {
      distrito: "Piura",
      nivel: "naranja",
      fecha: "18 oct, 6:30 p. m.",
      fuente: "SENAMHI",
      enlace: "https://klaimate.example/piura",
    },
  },
  {
    name: "actualizacion_zona_consultada",
    purpose: "consulted_zone",
    language: "es",
    category: "UTILITY",
    body: "Hola, actualizamos la zona que consultaste: {{distrito}} está en nivel {{nivel}} según {{fuente}} al {{fecha}}. Este dato puede cambiar, así que vuelve a consultar antes de salir. Para no recibir más avisos, responde BAJA.",
    variables: ["distrito", "nivel", "fuente", "fecha"],
    buttons: [BAJA_BUTTON],
    examples: {
      distrito: "Piura",
      nivel: "amarillo",
      fuente: "SENAMHI",
      fecha: "18 oct, 8:00 a. m.",
    },
  },
  {
    name: "resumen_diario_hogar",
    purpose: "daily_digest",
    language: "es",
    category: "UTILITY",
    body: "Buen día. Resumen del clima en {{distrito}} para hoy {{fecha}}: semáforo en nivel {{nivel}}. {{resumen}}. Fuente: {{fuente}}. Para dejar de recibir este resumen, responde BAJA.",
    variables: ["distrito", "fecha", "nivel", "resumen", "fuente"],
    buttons: [BAJA_BUTTON],
    examples: {
      distrito: "Miraflores",
      fecha: "18 oct",
      nivel: "verde",
      resumen: "No se esperan lluvias fuertes en el día",
      fuente: "SENAMHI",
    },
  },
  {
    name: "confirmacion_alta",
    purpose: "opt_in",
    language: "es",
    category: "UTILITY",
    body: "Listo, ya estás registrado en KlAimate. Hoy {{distrito}} está en nivel {{nivel}} y te avisaremos cuando cambie a naranja o rojo. Registro hecho el {{fecha}}. Si no fuiste tú o quieres salir, responde BAJA.",
    variables: ["distrito", "nivel", "fecha"],
    buttons: [BAJA_BUTTON],
    examples: {
      distrito: "Piura",
      nivel: "amarillo",
      fecha: "18 oct",
    },
  },
  {
    name: "confirmacion_baja",
    purpose: "opt_out",
    language: "es",
    category: "UTILITY",
    body: "Listo, ya no recibirás avisos de KlAimate en este número desde el {{fecha}}. Dejamos de enviarte alertas de {{distrito}}. Si quieres volver, escribe ALTA por este chat y te registramos de nuevo.",
    variables: ["fecha", "distrito"],
    buttons: [BAJA_BUTTON],
    examples: {
      fecha: "18 oct",
      distrito: "Piura",
    },
  },
] as const satisfies readonly WhatsAppTemplate[];

export type WhatsAppTemplateName = (typeof WHATSAPP_TEMPLATES)[number]["name"];

export function findTemplate(name: string): WhatsAppTemplate | undefined {
  return WHATSAPP_TEMPLATES.find((template) => template.name === name);
}

export function renderTemplate(
  name: WhatsAppTemplateName,
  variables: Readonly<Record<string, string>>,
): string {
  const template = findTemplate(name);
  if (!template) throw new Error(`Unknown template ${name}`);
  return template.body.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => {
    const value = variables[key];
    if (value === undefined) throw new Error(`Missing variable ${key} for ${name}`);
    return value;
  });
}
