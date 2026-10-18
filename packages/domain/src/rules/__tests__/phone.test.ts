import { describe, expect, it } from "vitest";
import { normalizePhone } from "../phone";

describe("normalizePhone", () => {
  it("normalizes Peru mobiles written in different shapes to one E.164", () => {
    const variants = ["987654321", "51 987 654 321", "+51 987-654-321", "(+51) 987.654.321"];
    const normalized = variants.map((value) => normalizePhone(value));
    expect(normalized.every((result) => result.ok)).toBe(true);
    const values = normalized.map((result) => (result.ok ? result.phone.e164 : ""));
    expect(new Set(values)).toEqual(new Set(["+51987654321"]));
  });

  it("accepts an international E.164 number that is not Peru", () => {
    const result = normalizePhone("+1 980 705 5482");
    expect(result).toEqual({
      ok: true,
      phone: { e164: "+19807055482", countryCallingCode: "1" },
    });
  });

  it("rejects short, empty and alphabetic input", () => {
    expect(normalizePhone("").ok).toBe(false);
    expect(normalizePhone("12345").ok).toBe(false);
    expect(normalizePhone("+519876").ok).toBe(false);
    expect(normalizePhone("98765abcd").ok).toBe(false);
    expect(normalizePhone("+012345678").ok).toBe(false);
  });
});
