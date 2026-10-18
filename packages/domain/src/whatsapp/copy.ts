/**
 * Emergency numbers are configurable and unverified. Do not treat them as checked
 * against INDECI or the fire service before production.
 */
export interface EmergencyNumber {
  label: string;
  number: string;
  verified: false;
  note: "verificar antes de producción";
}

export const DEFAULT_EMERGENCY_NUMBERS = {
  indeci: {
    label: "INDECI",
    number: "119",
    verified: false,
    note: "verificar antes de producción",
  },
  bomberos: {
    label: "Bomberos",
    number: "116",
    verified: false,
    note: "verificar antes de producción",
  },
} as const satisfies Record<string, EmergencyNumber>;

export const CONSENT_VERSION = "2026-10-18";

export const CONSENT_LABEL =
  "Soy mayor de edad y acepto recibir avisos informativos de clima por WhatsApp, que KlAimate guarde la memoria de la conversación, y que esos datos se transfieran a proveedores fuera del Perú (Meta y Zavu) para enviar los mensajes. Leí la política de privacidad.";

export const WELCOME_MESSAGE = [
  "Hola, soy KlAimate. Te cuento cómo ver el estado de lluvias de tu zona con datos de SENAMHI, SIGRID e INDECI.",
  "Puedes escribirme, por ejemplo: «¿Cómo está el semáforo en Piura?», «Planeo viajar a Cusco el sábado, ¿cómo está el pronóstico?», «¿Qué hago si mi distrito está en naranja?».",
  "Te respondo con la fuente y la hora del dato. Soy una guía informativa y no reemplazo a Defensa Civil ni a las autoridades. Esto es informativo y no sustituye a INDECI ni a SENAMHI.",
  "Para dejar de recibir avisos, escribe BAJA cuando quieras. Para volver a recibirlos, escribe ALTA.",
  "Números de referencia, verificar antes de producción: INDECI 119 y Bomberos 116.",
].join(" ");

export const OFF_TOPIC_REPLY =
  "Solo puedo ayudarte con el clima y las alertas de lluvias y eventos naturales en el Perú. No soy un asistente de inteligencia artificial general. Si quieres, pregúntame por un distrito o por un viaje.";

export const REGISTER_PROMPT = (signupUrl: string) =>
  `No encuentro este número en KlAimate. Entra a ${signupUrl}, crea tu cuenta con este mismo teléfono y acepta el aviso de privacidad. Cuando termines, escríbeme Hola desde este chat: ese mensaje abre la ventana de 24 horas y confirma tu número.`;

export const AGENT_SYSTEM_PROMPT = `Eres KlAimate, un guía informativo del clima y de eventos naturales en el Perú, por WhatsApp. No eres un asistente de inteligencia artificial general. Si el tema no es clima, lluvias, avisos, distritos o un viaje dentro del Perú, recházalo con amabilidad y vuelve al tema.

Reglas duras, sin excepción:
- Nunca digas "puedes viajar", "es seguro", "está seguro", "no hay riesgo", "no hay peligro", "está todo bien" ni "zona segura".
- Nunca uses las expresiones "alerta oficial" ni "sistema de alerta temprana". Di que el mensaje es informativo y no sustituye a INDECI ni a SENAMHI.
- Toda respuesta sobre un lugar lleva: el dato, la fuente, la hora de actualización, el límite "es un pronóstico y puede cambiar", la remisión a INDECI/COEN y SENAMHI, y que la decisión es de la persona.
- Si no hay dato o la fuente no responde, di exactamente "No tengo información confirmada" y no completes el hueco.
- Separa el dato factual (fuente y hora) de una estimación basada en el histórico. La estimación no es un pronóstico.
- Menciona Sutran solo si una herramienta devolvió datos de Sutran para esa consulta.
- No inventes niveles, fechas ni enlaces. No afirmes seguridad absoluta.
- Los números 119 (INDECI) y 116 (Bomberos) están marcados "verificar antes de producción".
- BAJA da de baja al instante. ALTA vuelve a activar los avisos.`;
