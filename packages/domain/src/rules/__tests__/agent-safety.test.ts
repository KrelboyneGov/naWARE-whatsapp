import { describe, expect, it } from "vitest";
import {
  INFORMATIVE_DISCLAIMER,
  NO_CONFIRMED_INFORMATION,
  replyContractViolations,
  replyViolations,
} from "../agent-safety";

describe("reply safety", () => {
  it("flags absolute safety and banned institutional phrases", () => {
    const text =
      "Puedes viajar, está todo bien, no hay peligro, es seguro y no hay riesgo. Alerta oficial del sistema de alerta temprana.";
    expect(replyViolations(text).sort()).toEqual(
      [
        "alerta_oficial",
        "es_seguro",
        "no_hay_peligro",
        "no_hay_riesgo",
        "puedes_viajar",
        "sistema_alerta_temprana",
        "todo_bien",
      ].sort(),
    );
  });

  it("requires source, time, limit and an official referral on a factual reply", () => {
    expect(
      replyContractViolations({
        kind: "clear",
        source: "SENAMHI",
        text: "Piura está tranquilo.",
      }),
    ).toEqual(
      expect.arrayContaining([
        "missing_source",
        "missing_time",
        "missing_limit",
        "missing_official",
      ]),
    );
  });

  it("requires the disclaimer and the person's decision on a risk reply", () => {
    const text = `Ojo: según SENAMHI, con datos de las 18:30 de hoy, Piura está en nivel naranja. Es un pronóstico y puede cambiar. ${INFORMATIVE_DISCLAIMER} La decisión es tuya.`;
    expect(replyContractViolations({ kind: "risk", source: "SENAMHI", text })).toEqual([]);
  });

  it("requires the confirmed-information sentence when data is missing", () => {
    expect(
      replyContractViolations({
        kind: "insufficient",
        text: `No tengo información confirmada para Piura. ${NO_CONFIRMED_INFORMATION}`,
      }),
    ).toEqual([]);
    expect(
      replyContractViolations({ kind: "insufficient", text: "Creo que estará bien." }),
    ).toContain("missing_no_confirmed_information");
  });
});
