import { describe, expect, it } from "vitest";
import { createFieldCipher, TEST_ENCRYPTION_KEY, TEST_HASH_KEY } from "../field-cipher";
import { maskPhone, redactPhones } from "../redact";
import { verifyZavuSignature } from "../zavu-signature";

describe("field cipher", () => {
  const cipher = createFieldCipher({
    encryptionKey: TEST_ENCRYPTION_KEY,
    hashKey: TEST_HASH_KEY,
  });

  it("encrypts the phone so the stored value is not the number, and hashes it stably", async () => {
    const phone = "+51987654321";
    const first = await cipher.encrypt(phone);
    const second = await cipher.encrypt(phone);
    expect(first).not.toBe(phone);
    expect(first).not.toBe(second);
    expect(first.includes("987654321")).toBe(false);
    expect(await cipher.decrypt(first)).toBe(phone);
    expect(await cipher.hashPhone(phone)).toBe(await cipher.hashPhone(phone));
    expect(await cipher.hashPhone(phone)).not.toBe(await cipher.hashPhone("+51911111111"));
  });
});

describe("redactPhones", () => {
  it("masks an E.164 number down to the last four digits", () => {
    const phone = "+51987654321";
    const line = redactPhones(`failed for ${phone}`);
    expect(line).not.toContain(phone);
    expect(line).toContain(maskPhone(phone));
    expect(maskPhone(phone).endsWith("4321")).toBe(true);
  });
});

describe("verifyZavuSignature", () => {
  it("accepts a fresh v2 signature over timestamp and raw body, and rejects a tampered body", async () => {
    const secret = "whsec_test";
    const body = JSON.stringify({ id: "evt_1", type: "message.inbound" });
    const timestamp = 1_700_000_000;
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

    expect(await verifyZavuSignature(body, header, secret, timestamp + 10)).toEqual({ ok: true });
    expect((await verifyZavuSignature(`${body}x`, header, secret, timestamp + 10)).ok).toBe(false);
    expect((await verifyZavuSignature(body, header, secret, timestamp + 400)).reason).toBe(
      "stale_timestamp",
    );
  });
});
