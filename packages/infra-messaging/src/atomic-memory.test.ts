import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MemorySubject } from "@emergency-map/domain/repositories";
import { ATOMIC_MEMORY_SOURCE_SITE, createAtomicMemory } from "./atomic-memory";

/**
 * Local HTTP fixture shaped like the Atomic Memory `/v1/memories/*` routes in the official
 * OpenAPI spec. It is not the live service; it only proves our requests and response handling.
 */
interface Row {
  id: string;
  user_id: string;
  content: string;
  source_site: string;
  created_at: string;
}

const ALICE = "klaimate:subscriber:alice" as MemorySubject;
const BOB = "klaimate:subscriber:bob" as MemorySubject;
const KEY = "fixture-key";

let server: Server;
let baseUrl: string;
let rows: Row[];
let requests: { method: string; path: string; auth: string | undefined; body: unknown }[];
let override: ((req: IncomingMessage, res: ServerResponse) => boolean) | null;

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : null;
}

beforeEach(async () => {
  rows = [];
  requests = [];
  override = null;
  let seq = 0;
  server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://fixture");
    const body = await readBody(req);
    requests.push({
      method: req.method ?? "",
      path: url.pathname,
      auth: req.headers.authorization,
      body,
    });
    if (override?.(req, res)) return;
    if (req.headers.authorization !== `Bearer ${KEY}`)
      return json(res, 401, { error: "unauthorized" });
    const input = (body ?? {}) as Record<string, unknown>;

    if (req.method === "POST" && url.pathname === "/v1/memories/ingest/quick") {
      const existing = rows.find((row) => row.user_id === input.user_id);
      if (existing) {
        existing.content = String(input.conversation);
        return json(res, 201, { stored_memory_ids: [], updated_memory_ids: [existing.id] });
      }
      seq += 1;
      const row: Row = {
        id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
        user_id: String(input.user_id),
        content: String(input.conversation),
        source_site: String(input.source_site),
        created_at: "2026-10-20T12:00:00.000Z",
      };
      rows.push(row);
      return json(res, 200, {
        episode_id: "ep",
        memories_stored: 1,
        stored_memory_ids: [row.id],
        updated_memory_ids: [],
      });
    }
    if (req.method === "GET" && url.pathname === "/v1/memories/list") {
      const own = rows.filter(
        (row) =>
          row.user_id === url.searchParams.get("user_id") &&
          row.source_site === url.searchParams.get("source_site"),
      );
      return json(res, 200, { memories: own, count: own.length });
    }
    if (req.method === "POST" && url.pathname === "/v1/memories/search/fast") {
      const own = rows.filter((row) => row.user_id === input.user_id);
      return json(res, 200, { count: own.length, memories: own });
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/v1/memories/")) {
      const id = decodeURIComponent(url.pathname.slice("/v1/memories/".length));
      const index = rows.findIndex(
        (row) => row.id === id && row.user_id === url.searchParams.get("user_id"),
      );
      if (index < 0) return json(res, 404, { error: "Memory not found" });
      rows.splice(index, 1);
      return json(res, 200, { success: true });
    }
    return json(res, 404, { error: "no route" });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function memory(timeoutMs?: number) {
  return createAtomicMemory({ apiUrl: `${baseUrl}/`, apiKey: KEY, timeoutMs });
}

describe("Atomic Memory HTTP adapter (local fixture)", () => {
  it("saves verbatim under the subject, then lists and recalls it with the bearer key", async () => {
    const port = memory();
    expect(
      await port.remember({
        subject: ALICE,
        kind: "preference",
        text: "prefiero respuestas por puntos",
      }),
    ).toEqual({
      status: "saved",
    });
    const ingest = requests.find((request) => request.path === "/v1/memories/ingest/quick");
    expect(ingest?.auth).toBe(`Bearer ${KEY}`);
    expect(ingest?.body).toMatchObject({
      user_id: ALICE,
      source_site: ATOMIC_MEMORY_SOURCE_SITE,
      skip_extraction: true,
      conversation: "Preferencia de la persona: prefiero respuestas por puntos",
    });

    const listed = await port.list({ subject: ALICE });
    expect(listed).toMatchObject({
      status: "ok",
      items: [{ kind: "preference", text: "prefiero respuestas por puntos" }],
    });
    const recalled = await port.recall({ subject: ALICE, query: "lluvia en Piura", limit: 5 });
    expect(recalled).toMatchObject({
      status: "ok",
      items: [{ text: "prefiero respuestas por puntos" }],
    });
  });

  it("never returns or deletes another subscriber's memory", async () => {
    const port = memory();
    await port.remember({
      subject: ALICE,
      kind: "preference",
      text: "prefiero respuestas por puntos",
    });
    expect(await port.list({ subject: BOB })).toEqual({ status: "ok", items: [] });
    const aliceId = rows[0]?.id ?? "";
    expect(await port.forget({ subject: BOB, id: aliceId })).toEqual({ status: "not_found" });
    expect(await port.forgetAll({ subject: BOB })).toEqual({ status: "deleted", count: 0 });
    expect(rows).toHaveLength(1);

    // A provider row for another user_id is dropped even if it comes back.
    override = (req, res) => {
      if (!req.url?.startsWith("/v1/memories/search/fast")) return false;
      json(res, 200, {
        memories: [{ id: "x", user_id: BOB, content: "Preferencia de la persona: ajeno" }],
      });
      return true;
    };
    expect(await port.recall({ subject: ALICE, query: "hola", limit: 5 })).toEqual({
      status: "ok",
      items: [],
    });
  });

  it("erases everything and reports the count only after the list is empty", async () => {
    const port = memory();
    await port.remember({ subject: ALICE, kind: "preference", text: "uno" });
    await port.remember({ subject: ALICE, kind: "preference", text: "dos" });
    expect(await port.forgetAll({ subject: ALICE })).toEqual({ status: "deleted", count: 1 });
    expect(rows).toEqual([]);
  });

  it("treats an ambiguous 2xx save or delete as not done", async () => {
    const port = memory();
    override = (req, res) => {
      if (req.url === "/v1/memories/ingest/quick") {
        json(res, 200, { memories_stored: 0, stored_memory_ids: [], updated_memory_ids: [] });
        return true;
      }
      if (req.method === "DELETE") {
        json(res, 200, { success: false });
        return true;
      }
      return false;
    };
    expect(await port.remember({ subject: ALICE, kind: "preference", text: "uno" })).toEqual({
      status: "unavailable",
      reason: "not_stored",
    });
    rows.push({
      id: "r1",
      user_id: ALICE,
      content: "Preferencia de la persona: uno",
      source_site: ATOMIC_MEMORY_SOURCE_SITE,
      created_at: "",
    });
    expect(await port.forget({ subject: ALICE, id: "r1" })).toEqual({
      status: "unavailable",
      reason: "delete_unconfirmed",
    });
    expect(await port.forgetAll({ subject: ALICE })).toEqual({
      status: "unavailable",
      reason: "delete_unconfirmed",
    });
  });

  it("returns unavailable on provider errors and on timeout, without throwing", async () => {
    override = (req, res) => {
      if (req.url === "/v1/memories/ingest/quick") {
        json(res, 503, { error: "rate limited", retryable: true });
        return true;
      }
      if (req.url?.startsWith("/v1/memories/search/fast")) {
        setTimeout(() => json(res, 200, { memories: [] }), 1000);
        return true;
      }
      return false;
    };
    const port = memory(100);
    expect(await port.remember({ subject: ALICE, kind: "preference", text: "uno" })).toEqual({
      status: "unavailable",
      reason: "http_503",
    });
    const started = Date.now();
    expect(await port.recall({ subject: ALICE, query: "hola", limit: 5 })).toEqual({
      status: "unavailable",
      reason: "timeout",
    });
    expect(Date.now() - started).toBeLessThan(900);
  });
});

it("accepts 201 corrections and keeps the latest explicit preference", async () => {
  const port = memory();
  await port.remember({
    subject: ALICE,
    kind: "preference",
    text: "prefiero respuestas por puntos",
  });
  expect(
    await port.remember({
      subject: ALICE,
      kind: "preference",
      text: "prefiero respuestas en párrafos",
    }),
  ).toEqual({ status: "saved" });
  const listed = await port.list({ subject: ALICE });
  expect(listed).toMatchObject({
    status: "ok",
    items: [{ text: "prefiero respuestas en párrafos" }],
  });
  expect(rows).toHaveLength(1);
});

it.each(["http://memory.example", "https://key@memory.example", "https://memory.example?token=x"])(
  "rejects unsafe provider URL %s",
  (apiUrl) => {
    expect(() => createAtomicMemory({ apiUrl, apiKey: KEY })).toThrow();
  },
);
