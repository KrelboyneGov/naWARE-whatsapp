import { describe, expect, it } from "vitest";
import { classifyInboundKeyword } from "../opt-out";

describe("classifyInboundKeyword", () => {
  it("treats opt-out words as the same command regardless of case or accents", () => {
    for (const word of ["BAJA", "baja", "Bajá", "STOP", "stop", "PARAR", "parar.", "CANCELAR"]) {
      expect(classifyInboundKeyword(word)).toBe("opt_out");
    }
    expect(classifyInboundKeyword("BAJA por favor")).toBe("opt_out");
  });

  it("recognizes ALTA and ignores ordinary text", () => {
    expect(classifyInboundKeyword("ALTA")).toBe("opt_in");
    expect(classifyInboundKeyword("Alta")).toBe("opt_in");
    expect(classifyInboundKeyword("Hola, ¿cómo está Piura?")).toBeNull();
  });
});
