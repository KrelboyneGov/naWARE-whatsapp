import { describe, expect, it, vi } from "vitest";
import { createOpenMeteoForecast } from "./forecast";

const DAILY = {
  daily: {
    time: ["2026-10-18", "2026-10-19", "2026-10-24"],
    precipitation_probability_max: [5, 20, 80],
    precipitation_sum: [0, 0.4, 12.5],
    temperature_2m_max: [21, 22, 19],
    temperature_2m_min: [15, 15, 14],
  },
};

function fakeFetch() {
  return vi.fn(async (url: URL | string) => {
    const href = String(url);
    if (href.includes("geocoding")) {
      return Response.json({
        results: [{ latitude: -12.04, longitude: -77.03, admin1: "Lima" }],
      });
    }
    return Response.json(DAILY);
  });
}

describe("Open-Meteo forecast", () => {
  it("returns the requested day, not today", async () => {
    const forecast = createOpenMeteoForecast(fakeFetch() as unknown as typeof fetch);

    const snapshot = await forecast.forecast({
      placeName: "Lima",
      latitude: null,
      longitude: null,
      date: "2026-10-24",
    });

    expect(snapshot).toMatchObject({
      available: true,
      forDate: "2026-10-24",
      precipitationProbabilityMax: 80,
      precipitationSumMm: 12.5,
      region: "Lima",
    });
    expect(snapshot.summary).toContain("80 %");
  });

  it("says the day is out of range instead of falling back to today", async () => {
    const forecast = createOpenMeteoForecast(fakeFetch() as unknown as typeof fetch);

    const snapshot = await forecast.forecast({
      placeName: "Lima",
      latitude: null,
      longitude: null,
      date: "2026-12-25",
    });

    expect(snapshot.available).toBe(false);
    expect(snapshot.precipitationProbabilityMax).toBeNull();
    expect(snapshot.reason).toContain("16 días");
  });

  it("asks Open-Meteo for 16 days in Lima time", async () => {
    const fetchImpl = fakeFetch();
    await createOpenMeteoForecast(fetchImpl as unknown as typeof fetch).forecast({
      placeName: "Lima",
      latitude: -12,
      longitude: -77,
      date: "2026-10-19",
    });

    const url = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(url.searchParams.get("forecast_days")).toBe("16");
    expect(url.searchParams.get("timezone")).toBe("America/Lima");
  });
});
