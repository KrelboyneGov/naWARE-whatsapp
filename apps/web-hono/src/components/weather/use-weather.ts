import { useQuery } from "@tanstack/react-query";
import { DEMO_NOW } from "@emergency-map/domain/demo";
import { explainWeather, type WeatherReading } from "@emergency-map/domain/rules";
import type { GeoPoint } from "@emergency-map/domain/schemas";

export interface WeatherResult {
  reading: WeatherReading;
  explanation: ReturnType<typeof explainWeather>;
  /** "live" from Open-Meteo, or "demo" when the request failed or ran on the server. */
  source: "live" | "demo";
}

/** Illustrative Lima summer reading: mild air, very high UV. Used when the live call fails. */
const DEMO_READING: WeatherReading = {
  temperatureC: 25,
  apparentTemperatureC: 27,
  uvIndex: 10,
  observedAt: DEMO_NOW,
};

interface OpenMeteoCurrent {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    uv_index?: number;
  };
}

/**
 * Forecast-layer context straight from Open-Meteo (no key). The browser calls it directly so the
 * card works without our API; any failure falls back to the demo reading, labelled as such.
 */
async function fetchWeather(point: GeoPoint): Promise<WeatherResult> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${point.lat.toFixed(3)}` +
    `&longitude=${point.lng.toFixed(3)}` +
    "&current=temperature_2m,apparent_temperature,uv_index&timezone=America%2FLima";
  try {
    if (typeof window === "undefined") throw new Error("server render");
    const res = await fetch(url, { signal: AbortSignal.timeout(6_000) });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const body = (await res.json()) as OpenMeteoCurrent;
    const c = body.current;
    if (!c || typeof c.temperature_2m !== "number") throw new Error("no current block");
    const reading: WeatherReading = {
      temperatureC: c.temperature_2m,
      apparentTemperatureC: c.apparent_temperature,
      uvIndex: typeof c.uv_index === "number" ? c.uv_index : null,
      observedAt: new Date(`${c.time}:00-05:00`),
    };
    return { reading, explanation: explainWeather(reading), source: "live" };
  } catch {
    return { reading: DEMO_READING, explanation: explainWeather(DEMO_READING), source: "demo" };
  }
}

export function useWeather(point: GeoPoint | null) {
  return useQuery({
    queryKey: ["weather", point?.lat.toFixed(2), point?.lng.toFixed(2)],
    queryFn: () => fetchWeather(point!),
    enabled: !!point,
    staleTime: 15 * 60_000,
  });
}
