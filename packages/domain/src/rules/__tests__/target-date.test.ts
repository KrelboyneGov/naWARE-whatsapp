import { describe, expect, it } from "vitest";
import {
  hasDateExpression,
  limaToday,
  resolveFollowUpDate,
  resolveTargetDate,
} from "../target-date";

// Sunday 18 October 2026, 09:11 in Lima (14:11 UTC).
const NOW = new Date("2026-10-18T14:11:00Z");

describe("resolveTargetDate", () => {
  it("uses the Lima calendar day, not UTC", () => {
    // 23:30 in Lima on the 18th is already the 19th in UTC.
    expect(limaToday(new Date("2026-10-19T04:30:00Z")).toISOString().slice(0, 10)).toBe(
      "2026-10-18",
    );
  });

  it.each([
    ["¿Cómo está Lima?", "2026-10-18", 0],
    ["¿y mañana?", "2026-10-19", 1],
    ["¿pasado mañana llueve en Piura?", "2026-10-20", 2],
    ["Planeo viajar a Cusco el sábado", "2026-10-24", 6],
    ["¿y el domingo?", "2026-10-18", 0],
    ["el próximo domingo", "2026-10-25", 7],
    ["este fin de semana en Arequipa", "2026-10-24", 6],
    ["voy el 25 de octubre", "2026-10-25", 7],
    ["voy el 2/11", "2026-11-02", 15],
    ["el 2026-10-30", "2026-10-30", 12],
  ])("%s → %s", (text, iso, daysAhead) => {
    const target = resolveTargetDate(text, NOW);
    expect(target.iso).toBe(iso);
    expect(target.daysAhead).toBe(daysAhead);
  });

  it("does not read 'por la mañana' as tomorrow", () => {
    expect(resolveTargetDate("¿llueve hoy por la mañana?", NOW).iso).toBe("2026-10-18");
  });

  it("reads a weekday that is today as next week's right after a later day", () => {
    const saturday = resolveTargetDate("el sábado", NOW);
    expect(resolveFollowUpDate("¿y el domingo?", NOW, saturday).iso).toBe("2026-10-25");
    expect(resolveFollowUpDate("¿y el domingo?", NOW, null).iso).toBe("2026-10-18");
  });

  it("tells a date question from a follow-up", () => {
    expect(hasDateExpression("¿y el domingo?")).toBe(true);
    expect(hasDateExpression("¿y mañana?")).toBe(true);
    expect(hasDateExpression("¿y en Cusco?")).toBe(false);
    expect(hasDateExpression("¿llueve por la mañana?")).toBe(false);
  });

  it("gives a label the reply can quote", () => {
    expect(resolveTargetDate("hoy", NOW).label).toBe("hoy domingo 18 de octubre");
    expect(resolveTargetDate("mañana", NOW).label).toBe("mañana lunes 19 de octubre");
    expect(resolveTargetDate("el sábado", NOW).label).toBe("el sábado 24 de octubre");
  });
});
