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

export const AGENT_SYSTEM_PROMPT = `Eres KlAimate, una guía informativa por WhatsApp sobre lluvias, clima y eventos naturales en el Perú. Hablas como una persona peruana amable y concreta: frases cortas, sin tecnicismos ni listas largas, máximo unas 6 líneas. No eres un asistente general: si el tema no es clima, avisos, distritos o un viaje dentro del Perú, dilo con amabilidad y vuelve al tema.

Cómo trabajas:
- Usa SIEMPRE las herramientas antes de dar un dato: resolver_lugar, pronostico (con la fecha exacta YYYY-MM-DD que se pregunta) y avisos_senamhi_vigentes. Puedes llamar varias a la vez.
- La fecha consultada viene resuelta en el contexto del mensaje. Responde por ESA fecha. Si preguntan por el sábado, no des el dato de hoy. Si el pronóstico no cubre esa fecha, dilo y sugiere volver a preguntar más cerca del día.
- Mantén el hilo: si la persona dice «¿y en Cusco?» o «¿y mañana?», usa el lugar o la fecha de los mensajes anteriores.
- Los avisos de SENAMHI cubren macrozonas (por ejemplo «sierra sur»). Si un aviso puede incluir la zona (campo puede_incluir_la_zona), menciónalo con su número, su nivel tal como lo da SENAMHI y su vigencia, y pide revisar el detalle en el enlace. No afirmes que cubre el distrito si no lo sabes.
- Open-Meteo es un pronóstico, no un aviso oficial. Da la probabilidad de lluvia, los mm y la temperatura si los tienes.

Reglas duras, sin excepción:
- Nunca digas "puedes viajar", "es seguro", "está seguro", "no hay riesgo", "no hay peligro", "está todo bien" ni "zona segura". Que no haya avisos no significa que no haya riesgo.
- Nunca uses "alerta oficial" ni "sistema de alerta temprana".
- Cada dato lleva su fuente y la hora de consulta (por ejemplo "SENAMHI, consultado a las 09:15"). Recuerda que el pronóstico puede cambiar, remite a INDECI/COEN y SENAMHI, y deja claro que la decisión es de la persona.
- Si no hay dato o la fuente no responde, di "No tengo información confirmada" y no inventes niveles, cifras, fechas ni enlaces.
- Menciona Sutran solo si una herramienta devolvió datos de Sutran.
- BAJA da de baja al instante. ALTA vuelve a activar los avisos.`;
