import type { ForecastSnapshot, IForecastPort } from "@emergency-map/domain/repositories";

/**
 * Open-Meteo geocoding + daily forecast. No API key. The result is a forecast,
 * never an official SENAMHI notice. Unit tests inject a fake fetch.
 */
export function createOpenMeteoForecast(fetchImpl: typeof fetch = fetch): IForecastPort {
  return {
    async forecast(query): Promise<ForecastSnapshot> {
      const fetchedAt = new Date().toISOString();
      try {
        let latitude = query.latitude;
        let longitude = query.longitude;
        if (latitude === null || longitude === null) {
          const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
          geoUrl.searchParams.set("name", query.placeName);
          geoUrl.searchParams.set("count", "1");
          geoUrl.searchParams.set("language", "es");
          geoUrl.searchParams.set("countryCode", "PE");
          const geoResponse = await fetchImpl(geoUrl);
          if (!geoResponse.ok) {
            return unavailable(fetchedAt, "Open-Meteo no respondió la geocodificación.");
          }
          const geo = (await geoResponse.json()) as {
            results?: { latitude: number; longitude: number }[];
          };
          const hit = geo.results?.[0];
          if (!hit) return unavailable(fetchedAt, `Open-Meteo no ubicó ${query.placeName}.`);
          latitude = hit.latitude;
          longitude = hit.longitude;
        }

        const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
        forecastUrl.searchParams.set("latitude", String(latitude));
        forecastUrl.searchParams.set("longitude", String(longitude));
        forecastUrl.searchParams.set("daily", "precipitation_probability_max,weather_code");
        forecastUrl.searchParams.set("timezone", "America/Lima");
        forecastUrl.searchParams.set("forecast_days", "7");
        const response = await fetchImpl(forecastUrl);
        if (!response.ok) return unavailable(fetchedAt, "Open-Meteo no respondió el pronóstico.");
        const payload = (await response.json()) as {
          daily?: { time?: string[]; precipitation_probability_max?: (number | null)[] };
        };
        const times = payload.daily?.time ?? [];
        const probs = payload.daily?.precipitation_probability_max ?? [];
        const index = times.findIndex((day) => query.date.includes(day));
        const probability = (index >= 0 ? probs[index] : probs[0]) ?? null;
        return {
          available: true,
          source: "Open-Meteo",
          fetchedAt,
          summary:
            probability === null
              ? "Pronóstico diario sin probabilidad de precipitación."
              : `Probabilidad máxima de precipitación ${probability} %.`,
          precipitationProbabilityMax: probability,
          reason: null,
        };
      } catch {
        return unavailable(fetchedAt, "Open-Meteo no estuvo disponible.");
      }
    },
  };
}

function unavailable(fetchedAt: string, reason: string): ForecastSnapshot {
  return {
    available: false,
    source: "Open-Meteo",
    fetchedAt,
    summary: null,
    precipitationProbabilityMax: null,
    reason,
  };
}
