import { describe, expect, it } from "vitest";
import { DEMO_EVENTS, DEMO_NOW, DEMO_QUICK_REPORTS, DEMO_SIGNALS } from "../../demo";
import { publicEventSchema } from "../../schemas/event";
import { eventSignalSchema, quickReportSchema, type QuickReport } from "../../schemas/signal";
import { isQuickReportVisible } from "../anonymous-reports";
import { summarizeSignals } from "../signals";
import { explainWeather } from "../weather";

const stateOf = (eventId: string) =>
  summarizeSignals(
    DEMO_SIGNALS.filter((s) => s.eventId === eventId),
    DEMO_NOW,
  ).state;

describe("summarizeSignals", () => {
  it("derives every community state from the demo scenario", () => {
    expect(stateOf("DEMO-10")).toBe("confirmed_by_neighbours");
    expect(stateOf("DEMO-11")).toBe("possibly_resolved");
    expect(stateOf("DEMO-13")).toBe("getting_worse");
    expect(stateOf("DEMO-12")).toBe("no_recent_signals");
    expect(stateOf("DEMO-14")).toBe("mixed");
  });

  it("counts a person once, by their latest answer", () => {
    const base = { eventId: "E", isAnonymous: false, isDemo: true };
    const summary = summarizeSignals(
      [
        {
          ...base,
          id: "1",
          reporterKey: "u1",
          kind: "still_there",
          createdAt: new Date(DEMO_NOW.getTime() - 60_000 * 30),
        },
        {
          ...base,
          id: "2",
          reporterKey: "u1",
          kind: "not_there",
          createdAt: new Date(DEMO_NOW.getTime() - 60_000 * 5),
        },
      ],
      DEMO_NOW,
    );
    expect(summary.stillThere).toBe(0);
    expect(summary.notThere).toBe(1);
  });
});

describe("isQuickReportVisible", () => {
  it("needs three distinct anonymous people nearby", () => {
    const [first] = DEMO_QUICK_REPORTS;
    expect(isQuickReportVisible(first!, DEMO_QUICK_REPORTS)).toBe(false);
    const third: QuickReport = {
      ...first!,
      id: "QR-3",
      reporterKey: "anon-c3",
      createdAt: DEMO_NOW,
    };
    expect(isQuickReportVisible(third, [...DEMO_QUICK_REPORTS, third])).toBe(true);
  });

  it("does not count the same anonymous person twice", () => {
    const [first] = DEMO_QUICK_REPORTS;
    const again: QuickReport = { ...first!, id: "QR-4", createdAt: DEMO_NOW };
    expect(isQuickReportVisible(again, [...DEMO_QUICK_REPORTS, again])).toBe(false);
  });

  it("shows signed-in reports at once", () => {
    const signedIn: QuickReport = {
      ...DEMO_QUICK_REPORTS[0]!,
      reporterKey: "user-x",
      isAnonymous: false,
    };
    expect(isQuickReportVisible(signedIn, [signedIn])).toBe(true);
  });
});

describe("explainWeather", () => {
  it("leads with UV on a mild, very sunny Lima day", () => {
    const e = explainWeather({
      temperatureC: 24,
      apparentTemperatureC: 25,
      uvIndex: 10,
      observedAt: DEMO_NOW,
    });
    expect(e.uvBand).toBe("very_high");
    expect(e.headline).toContain("muy alta");
    expect(e.actions.length).toBeGreaterThan(0);
  });

  it("explains heat in words, not only the number", () => {
    const e = explainWeather({
      temperatureC: 31,
      apparentTemperatureC: 34,
      uvIndex: 5,
      observedAt: DEMO_NOW,
    });
    expect(e.headline).toBe("Hace mucho calor en tu zona");
    expect(e.meaning).toContain("se siente como 34");
  });
});

describe("demo fixtures follow the contract", () => {
  it("parses with the domain schemas", () => {
    for (const e of DEMO_EVENTS) publicEventSchema.parse(e);
    for (const s of DEMO_SIGNALS) eventSignalSchema.parse(s);
    for (const q of DEMO_QUICK_REPORTS) quickReportSchema.parse(q);
  });
});
