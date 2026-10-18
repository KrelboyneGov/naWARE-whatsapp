/**
 * Zavu webhook signatures (https://docs.zavu.dev/guides/receiving-messages/security).
 * Header `X-Zavu-Signature: t=<unix seconds>,v2=<hex>` (v1 may also be present).
 * v2 signs `${t}.${rawBody}`; v1 signs the raw body alone. Prefer v2.
 */

const MAX_AGE_SECONDS = 300;
const MAX_FUTURE_SECONDS = 60;

export interface SignatureCheck {
  ok: boolean;
  reason?: string;
}

function parseHeader(header: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const index = piece.indexOf("=");
    if (index > 0) parts[piece.slice(0, index).trim()] = piece.slice(index + 1).trim();
  }
  return parts;
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyZavuSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowSeconds: number,
): Promise<SignatureCheck> {
  if (!header) return { ok: false, reason: "missing_signature" };
  if (secret === "") return { ok: false, reason: "missing_secret" };

  const parts = parseHeader(header);
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: "bad_timestamp" };

  const age = nowSeconds - timestamp;
  if (age > MAX_AGE_SECONDS || age < -MAX_FUTURE_SECONDS) {
    return { ok: false, reason: "stale_timestamp" };
  }

  const received = parts.v2 ?? parts.v1;
  if (!received) return { ok: false, reason: "missing_mac" };

  const signed = parts.v2 ? `${timestamp}.${rawBody}` : rawBody;
  const expected = await hmacHex(secret, signed);
  if (!timingSafeEqual(expected, received)) return { ok: false, reason: "mismatch" };
  return { ok: true };
}
