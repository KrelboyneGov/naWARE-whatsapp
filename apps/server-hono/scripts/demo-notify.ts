/**
 * Live demo: sends one WhatsApp notification with real data to a registered account.
 *
 *   pnpm run demo:notify -- --email you@example.com                      (dry run, prints the message)
 *   pnpm run demo:notify -- --email you@example.com --send --api https://<api-host>
 *
 * Data: the highest current SENAMHI rain notice (issuer's own level, link to the notice).
 * When SENAMHI has none or does not answer, the Open-Meteo forecast for the person's home
 * district, labelled as a forecast. The message never says a place is safe.
 *
 * Delivery: inside the 24 h window opened by the person's "Hola" the job is free text.
 * Outside it, a template job is only queued when ZAVU_CAN_SEND_TEMPLATES=true.
 * The job goes to emergency_map_notification_job and is sent by the API's dispatch endpoint.
 * Reads apps/server-hono/.env (or --env). Never prints secrets or the full phone number.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { INFORMATIVE_DISCLAIMER, replyViolations } from "@emergency-map/domain/rules";
import {
  createOpenMeteoForecast,
  createSenamhiNoticesSource,
  isRainNotice,
  sortByLevel,
  type SenamhiNotice,
} from "@emergency-map/infra-messaging";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    api: { type: "string", default: "http://localhost:3000" },
    env: { type: "string", default: ".env" },
    send: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
  },
});

function readEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=(.*)$/.exec(raw);
    if (!match?.[1]) continue;
    env[match[1]] = (match[2] ?? "").trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return env;
}

function limaDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function limaIsoDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(date);
}

function sentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase("es-PE");
  return lower.charAt(0).toLocaleUpperCase("es-PE") + lower.slice(1);
}

function noticeMessage(notice: SenamhiNotice, district: string, fetchedAt: string): string {
  return [
    `KlAimate · Aviso meteorológico de SENAMHI`,
    `SENAMHI tiene vigente el aviso N° ${notice.number}: «${sentenceCase(notice.title)}», nivel ${notice.level.toUpperCase()} según SENAMHI, del ${notice.validFrom} al ${notice.validTo}.`,
    `El aviso abarca zonas amplias; revisa en el detalle si incluye ${district}: ${notice.url}`,
    `Fuente: SENAMHI (senamhi.gob.pe), consultado el ${limaDateTime(fetchedAt)}. El aviso puede actualizarse.`,
    `Ante una emergencia sigue las indicaciones de INDECI/COEN y SENAMHI; cómo actuar lo decides tú. ${INFORMATIVE_DISCLAIMER}`,
    `Para dejar de recibir avisos, responde BAJA.`,
  ].join("\n");
}

function forecastMessage(input: {
  district: string;
  date: string;
  summary: string;
  fetchedAt: string;
  senamhiNote: string;
}): string {
  return [
    `KlAimate · Pronóstico de lluvia para ${input.district}`,
    input.senamhiNote,
    `Pronóstico para hoy ${input.date}: ${input.summary}`,
    `Fuente: Open-Meteo (pronóstico, no es un aviso de SENAMHI), consultado el ${limaDateTime(input.fetchedAt)}. Es un pronóstico y puede cambiar.`,
    `Ante una emergencia sigue las indicaciones de INDECI/COEN y SENAMHI; cómo actuar lo decides tú. ${INFORMATIVE_DISCLAIMER}`,
    `Para dejar de recibir avisos, responde BAJA.`,
  ].join("\n");
}

async function main(): Promise<number> {
  if (!values.email) {
    console.error("Falta --email <correo de la cuenta registrada>.");
    return 2;
  }
  const env = readEnvFile(values.env!);
  if (!env.DATABASE_URL) {
    console.error(`DATABASE_URL no está en ${values.env}.`);
    return 2;
  }
  // The infra-db client reads DATABASE_URL at import time.
  process.env.DATABASE_URL = env.DATABASE_URL;
  const { createDatabaseClient } = await import("@emergency-map/infra-db/client");
  const { notificationJobTable, subscriberTable, userTable } =
    await import("@emergency-map/infra-db/schemas");
  const { eq, sql } = await import("drizzle-orm");
  const db = createDatabaseClient(env.DATABASE_URL);

  const email = values.email.trim().toLowerCase();
  const [user] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(sql`lower(${userTable.email})`, email));
  if (!user) {
    console.error("No hay una cuenta con ese correo. Regístrate primero en la web.");
    return 1;
  }
  const [subscriber] = await db
    .select()
    .from(subscriberTable)
    .where(eq(subscriberTable.userId, user.id));
  if (!subscriber) {
    console.error(
      "La cuenta no tiene número de WhatsApp registrado (falta el paso de onboarding).",
    );
    return 1;
  }
  if (subscriber.verificationStatus !== "verified") {
    console.error("El número aún no está verificado: escribe «Hola» al número del negocio.");
    return 1;
  }
  if (!subscriber.notificationsEnabled || subscriber.optedOutAt) {
    console.error("La persona se dio de baja (BAJA). No se envía nada.");
    return 1;
  }

  const now = new Date();
  const windowOpen =
    subscriber.windowOpenedAt !== null &&
    now.getTime() - subscriber.windowOpenedAt.getTime() < 24 * 60 * 60 * 1000;
  const templatesEnabled = env.ZAVU_CAN_SEND_TEMPLATES === "true";
  if (!windowOpen && !templatesEnabled) {
    console.error(
      "La ventana de 24 h está cerrada y las plantillas no están habilitadas. Escribe «Hola» de nuevo y repite.",
    );
    return 1;
  }

  const district = subscriber.homeDistrictName;
  const senamhi = await createSenamhiNoticesSource().listCurrent();
  const rain = senamhi.available ? sortByLevel(senamhi.notices.filter(isRainNotice)) : [];
  const notice = rain[0];

  let body: string;
  let dataKey: string;
  let templateVariables: Record<string, string> | null = null;
  if (notice) {
    body = noticeMessage(notice, district, senamhi.fetchedAt);
    dataKey = `senamhi:${notice.number}:${notice.level}`;
    templateVariables = {
      distrito: district,
      nivel: notice.level,
      fecha: limaDateTime(senamhi.fetchedAt),
      fuente: `SENAMHI, aviso N° ${notice.number}`,
      enlace: notice.url,
    };
  } else {
    const senamhiNote = senamhi.available
      ? `SENAMHI no tiene avisos de lluvia vigentes en su portal a las ${limaDateTime(senamhi.fetchedAt)}.`
      : `No pude consultar los avisos de SENAMHI (${senamhi.reason}).`;
    const today = limaIsoDate(now);
    const forecast = await createOpenMeteoForecast().forecast({
      placeName: district,
      latitude: null,
      longitude: null,
      date: today,
    });
    if (!forecast.available || !forecast.summary || !forecast.fetchedAt) {
      console.error(`Sin dato real disponible: ${senamhiNote} Open-Meteo: ${forecast.reason}`);
      return 1;
    }
    body = forecastMessage({
      district,
      date: today,
      summary: forecast.summary,
      fetchedAt: forecast.fetchedAt,
      senamhiNote,
    });
    dataKey = `open-meteo:${today}`;
  }

  const violations = replyViolations(body);
  if (violations.length > 0) {
    console.error(
      `El mensaje incumple las reglas del bot (${violations.join(", ")}). No se envía.`,
    );
    return 1;
  }

  const mode = windowOpen ? "text" : "template";
  console.log(`Fuente: ${notice ? `SENAMHI aviso N° ${notice.number}` : "Open-Meteo (respaldo)"}`);
  console.log(
    `Modo: ${mode === "text" ? "texto libre (ventana abierta)" : "plantilla alerta_semaforo_zona"}`,
  );
  console.log("---\n" + body + "\n---");
  if (!values.send) {
    console.log("Ensayo: no se encoló nada. Añade --send para enviarlo.");
    return 0;
  }
  if (!env.INTERNAL_JOB_TOKEN) {
    console.error("INTERNAL_JOB_TOKEN no está en el .env.");
    return 2;
  }

  const dedupeKey = `demo:${subscriber.id}:${dataKey}${values.force ? `:${now.getTime()}` : ""}`;
  const [existing] = await db
    .select({ id: notificationJobTable.id })
    .from(notificationJobTable)
    .where(eq(notificationJobTable.dedupeKey, dedupeKey));
  if (existing) {
    console.error("Este dato ya se envió a esta persona. Usa --force para repetir la demo.");
    return 1;
  }

  const jobId = randomUUID();
  await db.insert(notificationJobTable).values({
    id: jobId,
    dedupeKey,
    subscriberId: subscriber.id,
    purpose: "follow_up",
    mode,
    body,
    templateName: mode === "template" ? "alerta_semaforo_zona" : null,
    variablesJson: mode === "template" ? JSON.stringify(templateVariables) : null,
    status: "queued",
    terminal: false,
    attempts: 0,
    lastError: null,
    nextAttemptAt: now,
    createdAt: now,
    sentAt: null,
  });
  console.log(`Encolado ${jobId}. Despachando con ${values.api}…`);

  const response = await fetch(
    new URL("/api/v1/internal/notifications/dispatch", values.api).toString(),
    { method: "POST", headers: { Authorization: `Bearer ${env.INTERNAL_JOB_TOKEN}` } },
  );
  console.log(`dispatch → HTTP ${response.status} ${await response.text()}`);

  const [job] = await db
    .select({
      status: notificationJobTable.status,
      lastError: notificationJobTable.lastError,
      sentAt: notificationJobTable.sentAt,
    })
    .from(notificationJobTable)
    .where(eq(notificationJobTable.id, jobId));
  if (job?.status === "sent") {
    console.log(`Enviado a WhatsApp a las ${limaDateTime(job.sentAt!.toISOString())}.`);
    return 0;
  }
  console.error(
    `No se envió: estado ${job?.status ?? "desconocido"}, ${job?.lastError ?? "sin detalle"}`,
  );
  return 1;
}

process.exitCode = await main();
