import { describe, expect, it } from "vitest";
import type { Event, OfficialNotice, Territory } from "@emergency-map/domain/schemas";
import type { INotificationPort, NotificationSendResult } from "@emergency-map/domain/repositories";
import {
  TEST_ENCRYPTION_KEY,
  TEST_HASH_KEY,
  createFieldCipher,
  replyContractViolations,
} from "@emergency-map/domain/rules";
import { WELCOME_MESSAGE } from "@emergency-map/domain/schemas";
import { createDeterministicClimateLlm } from "../agent";
import { composeCitizenReply, guardReply, type CitizenFacts } from "../compose";
import type { MessagingDeps } from "../deps";
import { dispatchDue } from "../dispatch";
import { planFollowUps, purgeDueSubscribers } from "../follow-up";
import { handleInboundMessage, handleZavuWebhook } from "../inbound";
import { createMemoryMessagingStore } from "../memory-store";
import { registerSubscriber } from "../register-subscriber";

const NOW = new Date("2026-10-18T23:30:00.000Z");
const PHONE = "+51987654321";

function territory(name: string, ubigeo: string): Territory {
  return {
    ubigeo,
    name,
    provinceName: name,
    departmentName: name,
    level: "district",
    parentUbigeo: ubigeo.slice(0, 4),
    centroid: { lat: -5.2, lng: -80.6 },
    geometry: null,
  };
}

function notice(id: string, level: string, institution = "SENAMHI"): OfficialNotice {
  return {
    id,
    sourceId: "senamhi",
    externalId: id,
    institution,
    title: "Lluvias intensas",
    category: "heavy_rain",
    severity: { level, issuer: institution, legend: level },
    url: null,
    issuedAt: NOW,
    validFrom: NOW,
    validTo: null,
    validity: "active",
    geometry: null,
    territories: [],
    fetchedAt: NOW,
    isDemo: true,
  };
}

function harness(options?: {
  templatesEnabled?: boolean;
  templateResult?: NotificationSendResult;
}) {
  let now = new Date(NOW);
  const store = createMemoryMessagingStore();
  const sent: { kind: "text" | "template"; to: string; body: string; templateName?: string }[] = [];
  const logs: string[] = [];
  const notices = new Map<string, { notice: OfficialNotice; partialOverlap: boolean }[]>();
  const piura = territory("Piura", "200101");
  const notifications: INotificationPort = {
    async sendText(input) {
      sent.push({ kind: "text", to: input.to, body: input.text });
      return { status: "sent", providerMessageId: `text-${sent.length}` };
    },
    async sendTemplate(input) {
      if (options?.templateResult) return options.templateResult;
      sent.push({
        kind: "template",
        to: input.to,
        body: input.templateName,
        templateName: input.templateName,
      });
      return { status: "sent", providerMessageId: `tpl-${sent.length}` };
    },
  };
  const deps: MessagingDeps = {
    store,
    cipher: createFieldCipher({ encryptionKey: TEST_ENCRYPTION_KEY, hashKey: TEST_HASH_KEY }),
    clock: { now: () => now },
    ids: {
      next: (prefix) =>
        `${prefix}-${logs.length}-${sent.length}-${Math.random().toString(16).slice(2)}`,
    },
    notifications,
    llm: createDeterministicClimateLlm(),
    forecast: {
      async forecast(query) {
        return {
          available: true,
          source: "Open-Meteo",
          fetchedAt: now.toISOString(),
          summary: "probabilidad de lluvia baja",
          precipitationProbabilityMax: 10,
          forDate: query.date,
          precipitationSumMm: 0,
          temperatureMaxC: 30,
          temperatureMinC: 22,
          region: "Piura",
          reason: null,
        };
      },
    },
    log: {
      info(message) {
        logs.push(message);
      },
      error(message) {
        logs.push(message);
      },
    },
    territories: {
      async search(query) {
        return query.toLowerCase().includes("piura") ? [piura] : [];
      },
      async findByUbigeo(ubigeo) {
        return ubigeo === piura.ubigeo ? piura : null;
      },
      async findDistrictAt() {
        return piura;
      },
    },
    notices: {
      async findIntersectingTerritory(ubigeo) {
        return notices.get(ubigeo) ?? [];
      },
    },
    events: {
      async listPublic() {
        return { data: [] as Event[], total: 0 };
      },
    },
    organizations: {
      async listCoveringTerritory() {
        return [];
      },
    },
    appPublicUrl: "https://klaimate.example",
    retentionDays: 30,
    templatesEnabled: options?.templatesEnabled ?? false,
    maxAttempts: 3,
    minFollowUpIntervalMs: 12 * 60 * 60 * 1000,
  };

  return {
    deps,
    store,
    sent,
    logs,
    notices,
    setNow(value: Date) {
      now = value;
    },
    piura,
  };
}

async function registered(env = harness()) {
  const result = await registerSubscriber(env.deps, {
    userId: "user-1",
    phone: "987 654 321",
    districtName: "Piura",
    ubigeo: "200101",
    consentAccepted: true,
    adultConfirmed: true,
  });
  if (!result.data) throw new Error(result.error?.kind);
  return { ...env, subscriber: result.data };
}

const clearFacts: CitizenFacts = {
  kind: "clear",
  place: "Piura",
  dayLabel: "martes",
  level: "sin_informacion",
  source: "Open-Meteo",
  updatedAtLabel: "18:30",
  cause: null,
  estimate: null,
  factual: "No hay un aviso vigente registrado para esa zona.",
  missingReason: null,
  mentionsSutran: false,
  ubigeo: "200101",
  noticeId: null,
};

describe("registerSubscriber", () => {
  it("refuses to store a person who did not accept the consent checkbox", async () => {
    const env = harness();
    const result = await registerSubscriber(env.deps, {
      userId: "user-1",
      phone: "+51987654321",
      districtName: "Piura",
      consentAccepted: false,
      adultConfirmed: true,
    });
    expect(result.error).toMatchObject({ kind: "validation", field: "consent" });
    expect(await env.store.findSubscriberByUserId("user-1")).toBeNull();
  });

  it("stores a normalized phone as ciphertext plus a stable hash", async () => {
    const env = await registered();
    expect(env.subscriber.phoneCiphertext).not.toContain("987654321");
    expect(await env.deps.cipher.decrypt(env.subscriber.phoneCiphertext)).toBe(PHONE);
    const again = await env.deps.cipher.hashPhone(PHONE);
    expect(env.subscriber.phoneHash).toBe(again);
    expect(env.subscriber.verificationStatus).toBe("pending");
    expect(env.subscriber.homeDistrictName).toBe("Piura");
  });
});

describe("composeCitizenReply", () => {
  it("never promises safety and keeps source, time and the limit", () => {
    const clear = composeCitizenReply(clearFacts);
    const risk = composeCitizenReply({
      ...clearFacts,
      kind: "risk",
      level: "naranja",
      source: "SENAMHI",
      cause: "Lluvias intensas",
    });
    const missing = composeCitizenReply({
      ...clearFacts,
      kind: "insufficient",
      source: null,
      missingReason: "Open-Meteo no respondió",
    });
    expect(replyContractViolations({ kind: "clear", source: "Open-Meteo", text: clear })).toEqual(
      [],
    );
    expect(replyContractViolations({ kind: "risk", source: "SENAMHI", text: risk })).toEqual([]);
    expect(replyContractViolations({ kind: "insufficient", text: missing })).toEqual([]);
    expect(clear.toLowerCase()).not.toContain("sutran");
    expect(risk.toLowerCase()).not.toContain("sutran");
    expect(guardReply("Puedes viajar, está todo bien y es seguro.", clearFacts)).toBe(clear);
  });
});

describe("inbound WhatsApp", () => {
  it("verifies the account when the registered number writes, with free text and no template", async () => {
    const env = await registered();
    const result = await handleInboundMessage(env.deps, {
      from: "51 987 654 321",
      text: "Hola",
      messageId: "msg-hola",
    });
    const stored = await env.store.findSubscriberByUserId("user-1");
    expect(stored?.verificationStatus).toBe("verified");
    expect(stored?.windowOpenedAt).toEqual(NOW);
    expect(result.reply).toContain("ALTA");
    expect(result.reply).toBe(WELCOME_MESSAGE);
    expect(env.sent.every((message) => message.kind === "text")).toBe(true);
    expect(env.logs.join("\n")).not.toContain(PHONE);
  });

  it("asks an unknown number to register on the web", async () => {
    const env = harness();
    const result = await handleInboundMessage(env.deps, {
      from: "+51911111111",
      text: "Hola",
      messageId: "msg-x",
    });
    expect(result.matched).toBe(false);
    expect(result.reply).toContain("https://klaimate.example");
    expect(env.sent[0]?.kind).toBe("text");
  });

  it("answers a travel question from tools and does not claim it is safe", async () => {
    const env = await registered();
    await handleInboundMessage(env.deps, { from: PHONE, text: "Hola", messageId: "msg-1" });
    const result = await handleInboundMessage(env.deps, {
      from: PHONE,
      text: "Planeo viajar a Piura el martes, ¿todo bien?",
      messageId: "msg-2",
    });
    expect(result.toolNames).toEqual(
      expect.arrayContaining([
        "resolver_lugar",
        "semaforo_y_alertas",
        "historico_zona",
        "pronostico",
        "reportes_comunidad",
      ]),
    );
    expect(
      replyContractViolations({ kind: "clear", source: "Open-Meteo", text: result.reply ?? "" }),
    ).toEqual([]);
    expect(result.reply?.toLowerCase()).not.toContain("sutran");
    expect(result.reply).not.toMatch(/todo bien|es seguro|no hay riesgo|puedes viajar/i);
  });

  it("opts out immediately, confirms in free text, skips follow-up, and erases after the retention window", async () => {
    const env = await registered();
    await handleInboundMessage(env.deps, { from: PHONE, text: "Hola", messageId: "msg-1" });
    const baja = await handleInboundMessage(env.deps, {
      from: PHONE,
      text: "Bajá",
      messageId: "msg-2",
    });
    const stored = await env.store.findSubscriberById(env.subscriber.id);
    expect(stored?.notificationsEnabled).toBe(false);
    expect(stored?.erasureDueAt?.getTime()).toBe(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(baja.reply).toContain("ya no recibirás");
    expect(baja.reply).toContain("Piura");
    expect(baja.reply).toContain("ALTA");
    expect(env.sent.every((message) => message.kind === "text")).toBe(true);

    env.notices.set("200101", [{ notice: notice("n-1", "naranja"), partialOverlap: false }]);
    expect(await planFollowUps(env.deps)).toEqual({ queued: 0 });

    env.setNow(new Date(NOW.getTime() + 31 * 24 * 60 * 60 * 1000));
    expect(await purgeDueSubscribers(env.deps)).toBe(1);
    const erased = await env.store.findSubscriberById(env.subscriber.id);
    expect(await env.deps.cipher.decrypt(erased?.phoneCiphertext ?? "")).toBe(
      `erased:${env.subscriber.id}`,
    );
    expect(await env.store.listMessages(env.subscriber.id)).toEqual([]);
    expect(env.logs.join("\n")).not.toContain(PHONE);
  });
});

describe("follow-ups", () => {
  it("sends once when the level rises, skips when nothing changed, and dedupes the same change", async () => {
    const env = await registered(harness({ templatesEnabled: true }));
    await env.store.updateSubscriber(env.subscriber.id, {
      windowOpenedAt: NOW,
      lastHomeLevel: "amarillo",
      lastHomeNoticeId: "old",
    });
    env.notices.set("200101", [{ notice: notice("new-notice", "naranja"), partialOverlap: false }]);

    expect(await planFollowUps(env.deps)).toEqual({ queued: 1 });
    expect(await dispatchDue(env.deps)).toBe(1);
    expect(env.sent[0]?.kind).toBe("text");

    expect(await planFollowUps(env.deps)).toEqual({ queued: 0 });

    await env.store.updateSubscriber(env.subscriber.id, {
      lastHomeLevel: "amarillo",
      lastHomeNoticeId: "old",
    });
    expect(await planFollowUps(env.deps)).toEqual({ queued: 0 });
    expect(env.sent.filter((message) => message.kind === "text")).toHaveLength(1);
  });

  it("does not send when the stored level is already the current one", async () => {
    const env = await registered();
    await env.store.updateSubscriber(env.subscriber.id, {
      lastHomeLevel: "naranja",
      lastHomeNoticeId: "same",
      windowOpenedAt: NOW,
    });
    env.notices.set("200101", [{ notice: notice("same", "naranja"), partialOverlap: false }]);
    expect(await planFollowUps(env.deps)).toEqual({ queued: 0 });
    expect(env.sent).toEqual([]);
  });

  it("uses a template outside the 24h window and stops when templates cannot be sent", async () => {
    const env = await registered(harness({ templatesEnabled: false }));
    await env.store.updateSubscriber(env.subscriber.id, {
      windowOpenedAt: new Date(NOW.getTime() - 25 * 60 * 60 * 1000),
      lastHomeLevel: "amarillo",
      lastHomeNoticeId: "old",
    });
    env.notices.set("200101", [{ notice: notice("new-notice", "rojo"), partialOverlap: false }]);
    expect(await planFollowUps(env.deps)).toEqual({ queued: 1 });
    expect(await dispatchDue(env.deps)).toBe(0);
    expect(env.sent).toEqual([]);
    expect(await dispatchDue(env.deps)).toBe(0);
    expect(env.logs.join(" ")).not.toContain(PHONE);
  });

  it("records a template payment failure as terminal and does not retry it", async () => {
    const env = await registered(
      harness({
        templatesEnabled: true,
        templateResult: {
          status: "failed",
          terminal: true,
          code: "payment_required",
          message: "canSendTemplates is false",
        },
      }),
    );
    await env.store.updateSubscriber(env.subscriber.id, {
      windowOpenedAt: null,
      lastHomeLevel: "amarillo",
      lastHomeNoticeId: "old",
    });
    env.notices.set("200101", [{ notice: notice("new-notice", "rojo"), partialOverlap: true }]);
    expect(await planFollowUps(env.deps)).toEqual({ queued: 1 });
    expect(await dispatchDue(env.deps)).toBe(0);
    expect(await dispatchDue(env.deps)).toBe(0);
    expect(env.sent).toEqual([]);
  });
});

describe("handleZavuWebhook", () => {
  it("rejects a bad signature, then dedupes a valid inbound event", async () => {
    const env = await registered();
    const body = JSON.stringify({
      id: "evt_1",
      type: "message.inbound",
      data: { messageId: "msg_1", from: PHONE, text: "Hola", messageType: "text" },
    });
    const secret = "whsec_test";
    const timestamp = Math.floor(NOW.getTime() / 1000);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${body}`),
    );
    const hex = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const header = `t=${timestamp},v2=${hex}`;

    expect(
      (await handleZavuWebhook(env.deps, { rawBody: body, signatureHeader: "t=1,v2=abcd", secret }))
        .status,
    ).toBe(401);

    const first = await handleZavuWebhook(env.deps, {
      rawBody: body,
      signatureHeader: header,
      secret,
    });
    const second = await handleZavuWebhook(env.deps, {
      rawBody: body,
      signatureHeader: header,
      secret,
    });
    expect(first).toMatchObject({ status: 200, body: { matched: true } });
    expect(second.body).toMatchObject({ duplicate: true });
    expect(env.sent).toHaveLength(1);
  });
});
