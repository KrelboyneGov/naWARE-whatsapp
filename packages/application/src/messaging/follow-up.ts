import type { NotificationJob, Subscriber } from "@emergency-map/domain/schemas";
import { renderTemplate, type WhatsAppTemplateName } from "@emergency-map/domain/schemas";
import { semaphoreChanged, semaphoreRank } from "@emergency-map/domain/rules";
import type { MessagingDeps } from "./deps";
import { isWindowOpen } from "./dispatch";
import { loadAlerts, formatDayLima, formatTimeLima } from "./zone";

export async function enqueueOutbound(
  deps: MessagingDeps,
  input: Omit<
    NotificationJob,
    | "id"
    | "status"
    | "terminal"
    | "attempts"
    | "lastError"
    | "nextAttemptAt"
    | "createdAt"
    | "sentAt"
  >,
): Promise<"queued" | "duplicate"> {
  const now = deps.clock.now();
  return deps.store.enqueue({
    ...input,
    id: deps.ids.next("job"),
    status: "queued",
    terminal: false,
    attempts: 0,
    lastError: null,
    nextAttemptAt: now,
    createdAt: now,
    sentAt: null,
  });
}

export async function planFollowUps(deps: MessagingDeps): Promise<{ queued: number }> {
  const now = deps.clock.now();
  const subscribers = await deps.store.listNotifiable();
  let queued = 0;

  for (const subscriber of subscribers) {
    if (!subscriber.notificationsEnabled || subscriber.optedOutAt) continue;
    const home = await loadAlerts(deps, subscriber.homeUbigeo);
    if (
      semaphoreChanged({
        previousLevel: subscriber.lastHomeLevel,
        previousNoticeId: subscriber.lastHomeNoticeId,
        nextLevel: home.level,
        nextNoticeId: home.noticeId,
      }) &&
      !frequencyBlocks(subscriber.lastInformedAt, subscriber.lastHomeLevel, home.level, now, deps)
    ) {
      const result = await enqueueZoneUpdate(deps, subscriber, {
        place: subscriber.homeDistrictName,
        ubigeo: subscriber.homeUbigeo,
        level: home.level,
        noticeId: home.noticeId,
        source: home.source ?? "SENAMHI",
        updatedAt: home.updatedAt ? new Date(home.updatedAt) : now,
        template: "alerta_semaforo_zona",
      });
      if (result === "queued") {
        queued += 1;
        await deps.store.updateSubscriber(subscriber.id, {
          lastHomeLevel: home.level,
          lastHomeNoticeId: home.noticeId,
          lastInformedAt: now,
          updatedAt: now,
        });
      }
    }

    const topics = await deps.store.listTopics(subscriber.id);
    for (const topic of topics) {
      if (topic.ubigeo && topic.ubigeo === subscriber.homeUbigeo) continue;
      const reading = await loadAlerts(deps, topic.ubigeo);
      if (
        !semaphoreChanged({
          previousLevel: topic.lastInformedLevel,
          previousNoticeId: topic.lastInformedNoticeId,
          nextLevel: reading.level,
          nextNoticeId: reading.noticeId,
        })
      ) {
        continue;
      }
      const result = await enqueueZoneUpdate(deps, subscriber, {
        place: topic.placeName,
        ubigeo: topic.ubigeo,
        level: reading.level,
        noticeId: reading.noticeId,
        source: reading.source ?? "SENAMHI",
        updatedAt: reading.updatedAt ? new Date(reading.updatedAt) : now,
        template: "actualizacion_zona_consultada",
      });
      if (result === "queued") {
        queued += 1;
        await deps.store.upsertTopic({
          ...topic,
          lastInformedLevel: reading.level,
          lastInformedNoticeId: reading.noticeId,
          lastInformedAt: now,
        });
      }
    }
  }

  return { queued };
}

function frequencyBlocks(
  lastInformedAt: Date | null,
  previousLevel: string | null,
  nextLevel: string,
  now: Date,
  deps: MessagingDeps,
): boolean {
  if (!lastInformedAt) return false;
  if (semaphoreRank(nextLevel) > semaphoreRank(previousLevel)) return false;
  return now.getTime() - lastInformedAt.getTime() < deps.minFollowUpIntervalMs;
}

async function enqueueZoneUpdate(
  deps: MessagingDeps,
  subscriber: Subscriber,
  input: {
    place: string;
    ubigeo: string | null;
    level: string;
    noticeId: string | null;
    source: string;
    updatedAt: Date;
    template: WhatsAppTemplateName;
  },
): Promise<"queued" | "duplicate"> {
  const now = deps.clock.now();
  const open = isWindowOpen(subscriber, now);
  const variables: Record<string, string> = {
    distrito: input.place,
    nivel: input.level,
    fecha: `${formatDayLima(input.updatedAt)}, ${formatTimeLima(input.updatedAt)}`,
    fuente: input.source,
    enlace: `${deps.appPublicUrl}/`,
  };
  const body =
    input.template === "alerta_semaforo_zona" || input.template === "actualizacion_zona_consultada"
      ? renderTemplate(input.template, variables)
      : renderTemplate("alerta_semaforo_zona", variables);

  return enqueueOutbound(deps, {
    dedupeKey: `followup:${subscriber.id}:${input.ubigeo ?? input.place}:${input.noticeId ?? "none"}:${input.level}`,
    subscriberId: subscriber.id,
    purpose: "follow_up",
    mode: open ? "text" : "template",
    body,
    templateName: open ? null : input.template,
    variables: open ? null : variables,
  });
}

export async function purgeDueSubscribers(deps: MessagingDeps): Promise<number> {
  const now = deps.clock.now();
  const due = await deps.store.listErasureDue(now);
  for (const subscriber of due) {
    const tombstone = `erased:${subscriber.id}`;
    await deps.store.updateSubscriber(subscriber.id, {
      phoneHash: tombstone,
      phoneCiphertext: await deps.cipher.encrypt(tombstone),
      homeDistrictName: "anonimizado",
      homeUbigeo: null,
      notificationsEnabled: false,
      erasureDueAt: null,
      updatedAt: now,
    });
    await deps.store.deleteSubscriberMemory(subscriber.id);
  }
  deps.log.info(`erasure_completed ${due.length}`);
  return due.length;
}
