import type { Subscriber } from "@emergency-map/domain/schemas";
import { REGISTER_PROMPT, WELCOME_MESSAGE, renderTemplate } from "@emergency-map/domain/schemas";
import {
  classifyInboundKeyword,
  maskPhone,
  normalizePhone,
  redactPhones,
} from "@emergency-map/domain/rules";
import { verifyZavuSignature } from "@emergency-map/domain/rules";
import { isGreetingOnly, runAgent } from "./agent";
import type { MessagingDeps } from "./deps";
import { dispatchDue } from "./dispatch";
import { enqueueOutbound } from "./follow-up";
import { formatDayLima } from "./zone";

export interface InboundResult {
  reply: string | null;
  matched: boolean;
  toolNames: string[];
}

export async function handleInboundMessage(
  deps: MessagingDeps,
  input: { from: string; text: string; messageId: string },
): Promise<InboundResult> {
  const phone = normalizePhone(input.from);
  const subscriber = phone.ok
    ? await deps.store.findSubscriberByPhoneHash(await deps.cipher.hashPhone(phone.phone.e164))
    : null;
  const keyword = classifyInboundKeyword(input.text);
  deps.log.info(
    redactPhones(
      `inbound ${phone.ok ? maskPhone(phone.phone.e164) : "sin-telefono"} matched=${Boolean(subscriber)}`,
    ),
  );

  if (!subscriber) {
    const reply = REGISTER_PROMPT(deps.appPublicUrl);
    await deps.notifications.sendText({ to: input.from, text: reply });
    return { reply, matched: false, toolNames: [] };
  }

  const now = deps.clock.now();
  await deps.store.updateSubscriber(subscriber.id, {
    verificationStatus: "verified",
    verifiedAt: subscriber.verifiedAt ?? now,
    windowOpenedAt: now,
    updatedAt: now,
  });
  await deps.store.addMessage({
    id: deps.ids.next("msg"),
    subscriberId: subscriber.id,
    direction: "in",
    bodyCiphertext: await deps.cipher.encrypt(input.text),
    externalMessageId: input.messageId,
    createdAt: now,
  });

  if (keyword === "opt_out") {
    const reply = await optOut(deps, subscriber, now);
    await dispatchDue(deps);
    return { reply, matched: true, toolNames: [] };
  }

  if (keyword === "opt_in") {
    const reply = await optIn(deps, { ...subscriber, notificationsEnabled: true }, now);
    await dispatchDue(deps);
    return { reply, matched: true, toolNames: [] };
  }

  const fresh = (await deps.store.findSubscriberById(subscriber.id)) ?? subscriber;
  if (!fresh.notificationsEnabled) {
    const reply =
      "Tus avisos están dados de baja. Escribe ALTA para volver a recibirlos. La baja anterior sigue en pie hasta entonces.";
    await sendReply(deps, fresh, reply, `reply:${input.messageId}`);
    await dispatchDue(deps);
    return { reply, matched: true, toolNames: [] };
  }

  const welcome = deps.welcomeText ?? WELCOME_MESSAGE;
  const firstContact = subscriber.verificationStatus === "pending";
  if (firstContact && isGreetingOnly(input.text)) {
    await sendReply(deps, fresh, welcome, `reply:${input.messageId}`);
    await dispatchDue(deps);
    return { reply: welcome, matched: true, toolNames: [] };
  }

  const turn = await runAgent(deps, {
    text: input.text,
    homeDistrictName: fresh.homeDistrictName,
    homeUbigeo: fresh.homeUbigeo,
  });
  const reply = firstContact ? `${welcome}\n\n${turn.reply}` : turn.reply;
  await persistTurn(deps, fresh, reply, turn, input.messageId);
  await dispatchDue(deps);
  return { reply, matched: true, toolNames: turn.toolNames };
}

async function optOut(deps: MessagingDeps, subscriber: Subscriber, now: Date): Promise<string> {
  const erasureDueAt = new Date(now.getTime() + deps.retentionDays * 24 * 60 * 60 * 1000);
  await deps.store.updateSubscriber(subscriber.id, {
    notificationsEnabled: false,
    optedOutAt: now,
    erasureDueAt,
    updatedAt: now,
  });
  const variables = { fecha: formatDayLima(now), distrito: subscriber.homeDistrictName };
  const body = renderTemplate("confirmacion_baja", variables);
  await deps.store.addMessage({
    id: deps.ids.next("msg"),
    subscriberId: subscriber.id,
    direction: "out",
    bodyCiphertext: await deps.cipher.encrypt(body),
    externalMessageId: null,
    createdAt: now,
  });
  await enqueueOutbound(deps, {
    dedupeKey: `optout:${subscriber.id}:${now.toISOString()}`,
    subscriberId: subscriber.id,
    purpose: "confirmation",
    mode: "text",
    body,
    templateName: "confirmacion_baja",
    variables,
  });
  return body;
}

async function optIn(deps: MessagingDeps, subscriber: Subscriber, now: Date): Promise<string> {
  await deps.store.updateSubscriber(subscriber.id, {
    notificationsEnabled: true,
    optedOutAt: null,
    erasureDueAt: null,
    updatedAt: now,
  });
  const variables = {
    distrito: subscriber.homeDistrictName,
    nivel: "sin información",
    fecha: formatDayLima(now),
  };
  const body = renderTemplate("confirmacion_alta", variables);
  await enqueueOutbound(deps, {
    dedupeKey: `optin:${subscriber.id}:${now.toISOString()}`,
    subscriberId: subscriber.id,
    purpose: "confirmation",
    mode: "text",
    body,
    templateName: "confirmacion_alta",
    variables,
  });
  return body;
}

async function sendReply(
  deps: MessagingDeps,
  subscriber: Subscriber,
  body: string,
  dedupeKey: string,
): Promise<void> {
  const now = deps.clock.now();
  await deps.store.addMessage({
    id: deps.ids.next("msg"),
    subscriberId: subscriber.id,
    direction: "out",
    bodyCiphertext: await deps.cipher.encrypt(body),
    externalMessageId: null,
    createdAt: now,
  });
  await enqueueOutbound(deps, {
    dedupeKey,
    subscriberId: subscriber.id,
    purpose: "reply",
    mode: "text",
    body,
    templateName: null,
    variables: null,
  });
}

async function persistTurn(
  deps: MessagingDeps,
  subscriber: Subscriber,
  body: string,
  turn: {
    facts: {
      place: string;
      dayLabel: string;
      level: string;
      ubigeo: string | null;
      noticeId: string | null;
    };
  },
  messageId: string,
): Promise<void> {
  await sendReply(deps, subscriber, body, `reply:${messageId}`);
  const now = deps.clock.now();
  await deps.store.upsertSummary(
    subscriber.id,
    await deps.cipher.encrypt(`${turn.facts.place} ${turn.facts.dayLabel}: ${turn.facts.level}`),
    now,
  );
  if (turn.facts.place) {
    await deps.store.upsertTopic({
      id: deps.ids.next("topic"),
      subscriberId: subscriber.id,
      placeName: turn.facts.place,
      ubigeo: turn.facts.ubigeo,
      consultedForDate: turn.facts.dayLabel,
      lastInformedLevel: turn.facts.level,
      lastInformedNoticeId: turn.facts.noticeId,
      lastInformedAt: now,
    });
  }
}

export async function handleZavuWebhook(
  deps: MessagingDeps,
  input: { rawBody: string; signatureHeader: string | null; secret: string },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const nowSeconds = Math.floor(deps.clock.now().getTime() / 1000);
  const signature = await verifyZavuSignature(
    input.rawBody,
    input.signatureHeader,
    input.secret,
    nowSeconds,
  );
  if (!signature.ok) {
    deps.log.error(`webhook_rejected ${signature.reason ?? "invalid"}`);
    return { status: 401, body: { error: "invalid_signature" } };
  }

  let event: {
    id?: string;
    type?: string;
    data?: {
      messageId?: string;
      from?: string;
      text?: string;
      content?: { interactiveReply?: { title?: string } };
    };
  };
  try {
    event = JSON.parse(input.rawBody) as typeof event;
  } catch {
    return { status: 400, body: { error: "invalid_json" } };
  }

  if (event.type !== "message.inbound") return { status: 200, body: { ignored: true } };
  const eventId = event.id;
  const messageId = event.data?.messageId;
  const from = event.data?.from;
  if (!eventId || !messageId || !from) return { status: 400, body: { error: "incomplete_event" } };

  const dedupe = await deps.store.recordInbound(eventId, messageId, deps.clock.now());
  if (dedupe === "duplicate") return { status: 200, body: { duplicate: true } };

  const text = event.data?.text || event.data?.content?.interactiveReply?.title || "";
  const result = await handleInboundMessage(deps, { from, text, messageId });
  return {
    status: 200,
    body: { ok: true, matched: result.matched, replied: result.reply !== null },
  };
}
