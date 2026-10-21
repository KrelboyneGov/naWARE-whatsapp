import type {
  IConversationMemoryPort,
  MemoryDeleteResult,
  MemoryReadResult,
  MemorySubject,
  RememberedItem,
} from "@emergency-map/domain/repositories";
import { memoryContent, parseMemoryContent } from "@emergency-map/domain/rules";

/**
 * Atomic Memory HTTP API (`/v1/memories/*`, see docs.atomicstrata.ai/api-reference/http).
 * Every memory is written and read with `user_id` = the server-built subject, so one subscriber
 * never reads another's. `source_site` keeps our rows apart from anything else in the project.
 */

export const ATOMIC_MEMORY_SOURCE_SITE = "klaimate-whatsapp";
const DEFAULT_TIMEOUT_MS = 1500;
const LIST_LIMIT = 50;
const MAX_ERASE_ROUNDS = 4;

export interface AtomicMemoryOptions {
  /** e.g. https://api.atomicstrata.ai (Cloud) or http://127.0.0.1:17350 (local Core). */
  apiUrl: string;
  apiKey: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

type Unavailable = { status: "unavailable"; reason: string };

type HttpOutcome = { ok: true; status: number; body: unknown } | Unavailable;

interface ApiMemory {
  id: string;
  content: string;
  user_id?: string;
  created_at?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function apiMemories(body: unknown): ApiMemory[] | null {
  if (!isRecord(body) || !Array.isArray(body.memories)) return null;
  const rows = body.memories;
  if (
    !rows.every(
      (row): row is ApiMemory =>
        isRecord(row) &&
        typeof row.id === "string" &&
        row.id.trim().length > 0 &&
        typeof row.content === "string" &&
        (row.user_id === undefined || typeof row.user_id === "string") &&
        (row.created_at === undefined || typeof row.created_at === "string"),
    )
  )
    return null;
  return rows;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];
}

export function createAtomicMemory(options: AtomicMemoryOptions): IConversationMemoryPort {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(options.apiUrl);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Atomic Memory requires HTTPS or loopback HTTP without URL credentials, query or fragment",
    );
  }
  const baseUrl = options.apiUrl.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function call(
    method: "GET" | "POST" | "DELETE",
    path: string,
    payload?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<HttpOutcome> {
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          ...(payload ? { "Content-Type": "application/json" } : {}),
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: signal ?? AbortSignal.timeout(timeoutMs),
        redirect: "error",
      });
      // The body is never logged or returned: it may echo what the person asked to remember.
      const body: unknown = await response.json().catch(() => null);
      if (response.status === 404) return { ok: true, status: 404, body };
      if (!response.ok) return { status: "unavailable", reason: `http_${response.status}` };
      return { ok: true, status: response.status, body };
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      return {
        status: "unavailable",
        reason: name === "TimeoutError" || name === "AbortError" ? "timeout" : "network",
      };
    }
  }

  function toItems(rows: ApiMemory[], subject: MemorySubject): RememberedItem[] {
    const items: RememberedItem[] = [];
    for (const row of rows) {
      // Defence in depth: a row for another user is dropped even if the provider returned it.
      if (row.user_id !== undefined && row.user_id !== subject) continue;
      const parsed = parseMemoryContent(row.content);
      if (parsed) items.push({ id: row.id, ...parsed, savedAt: row.created_at ?? null });
    }
    return items;
  }

  async function list(subject: MemorySubject): Promise<MemoryReadResult> {
    const query = new URLSearchParams({
      user_id: subject,
      source_site: ATOMIC_MEMORY_SOURCE_SITE,
      limit: String(LIST_LIMIT),
    });
    const result = await call("GET", `/v1/memories/list?${query.toString()}`);
    if (!("ok" in result)) return result;
    const rows = result.status === 200 ? apiMemories(result.body) : null;
    if (!rows) return { status: "unavailable", reason: "malformed_list" };
    return { status: "ok", items: toItems(rows, subject) };
  }

  async function forgetOne(
    subject: MemorySubject,
    id: string,
    signal?: AbortSignal,
  ): Promise<MemoryDeleteResult> {
    const query = new URLSearchParams({ user_id: subject });
    const result = await call(
      "DELETE",
      `/v1/memories/${encodeURIComponent(id)}?${query.toString()}`,
      undefined,
      signal,
    );
    if (!("ok" in result)) return result;
    if (result.status === 404) return { status: "not_found" };
    // A 2xx without `success: true` is not proof the row is gone.
    if (isRecord(result.body) && result.body.success === true) {
      return { status: "deleted", count: 1 };
    }
    return { status: "unavailable", reason: "delete_unconfirmed" };
  }

  return {
    async recall({ subject, query, limit }) {
      if (!query.trim()) return { status: "ok", items: [] };
      const result = await call("POST", "/v1/memories/search/fast", {
        user_id: subject,
        query,
        limit,
        source_site: ATOMIC_MEMORY_SOURCE_SITE,
      });
      if (!("ok" in result)) return result;
      const rows = result.status === 200 ? apiMemories(result.body) : null;
      if (!rows) return { status: "unavailable", reason: "malformed_search" };
      return { status: "ok", items: toItems(rows, subject) };
    },

    list: ({ subject }) => list(subject),

    async remember({ subject, kind, text }) {
      const result = await call("POST", "/v1/memories/ingest/quick", {
        user_id: subject,
        conversation: memoryContent(kind, text),
        source_site: ATOMIC_MEMORY_SOURCE_SITE,
        skip_extraction: true,
        content_class: "summary",
        metadata: { kind, externalId: "conversation-preference" },
      });
      if (!("ok" in result)) return result;
      // 200 alone is ambiguous: only a returned memory id proves the text was stored.
      const body = [200, 201].includes(result.status) && isRecord(result.body) ? result.body : null;
      const ids = body
        ? [...stringArray(body.stored_memory_ids), ...stringArray(body.updated_memory_ids)]
        : [];
      if (ids.length === 0) return { status: "unavailable", reason: "not_stored" };
      return { status: "saved" };
    },

    forget: ({ subject, id }) => forgetOne(subject, id),

    /** Deletes page by page and re-lists, so success means the list came back empty. */
    async forgetAll({ subject }) {
      const deadline = AbortSignal.timeout(timeoutMs);
      let count = 0;
      for (let round = 0; round < MAX_ERASE_ROUNDS; round += 1) {
        const query = new URLSearchParams({
          user_id: subject,
          source_site: ATOMIC_MEMORY_SOURCE_SITE,
          limit: String(LIST_LIMIT),
        });
        const page = await call(
          "GET",
          `/v1/memories/list?${query.toString()}`,
          undefined,
          deadline,
        );
        if (!("ok" in page)) return page;
        const rows = page.status === 200 ? apiMemories(page.body) : null;
        if (!rows) return { status: "unavailable", reason: "malformed_list" };
        const own = rows.filter((row) => row.user_id === undefined || row.user_id === subject);
        if (own.length === 0) return { status: "deleted", count };
        for (const row of own) {
          const removed = await forgetOne(subject, row.id, deadline);
          if (removed.status === "deleted") count += 1;
          else if (removed.status !== "not_found") return removed;
        }
      }
      return { status: "unavailable", reason: "items_remaining" };
    },
  };
}
