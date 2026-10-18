import type {
  ForecastQuery,
  ForecastSnapshot,
  IForecastPort,
} from "@emergency-map/domain/repositories";

/** Open-Meteo forecasts at most 16 days ahead. */
export const FORECAST_HORIZON_DAYS = 16;

/**
 * Open-Meteo geocoding + daily forecast. No API key. The result is a forecast, never an
 * official SENAMHI notice. It is for `query.date` exactly, or unavailable: a missing day is
 * never answered with today's numbers. Unit tests inject a fake fetch.
 */
export function createOpenMeteoForecast(fetchImpl: typeof fetch = fetch): IForecastPort {
  return {
    async forecast(query: ForecastQuery): Promise<ForecastSnapshot> {
      const fetchedAt = new Date().toISOString();
      try {
        let latitude = query.latitude;
        let longitude = query.longitude;
        let region: string | null = null;
        let elevationM: number | null = null;
        if (latitude === null || longitude === null) {
          const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
          geoUrl.searchParams.set("name", query.placeName);
          geoUrl.searchParams.set("count", "1");
          geoUrl.searchParams.set("language", "es");
          geoUrl.searchParams.set("countryCode", "PE");
          const geoResponse = await fetchImpl(geoUrl);
          if (!geoResponse.ok) {
            return unavailable(
              fetchedAt,
              query.date,
              "Open-Meteo no respondió la geocodificación.",
            );
          }
          const geo = (await geoResponse.json()) as {
            results?: {
              latitude: number;
              longitude: number;
              admin1?: string;
              elevation?: number;
            }[];
          };
          const hit = geo.results?.[0];
          if (!hit) {
            return unavailable(fetchedAt, query.date, `Open-Meteo no ubicó ${query.placeName}.`);
          }
          latitude = hit.latitude;
          longitude = hit.longitude;
          region = hit.admin1 ?? null;
          elevationM = hit.elevation ?? null;
        }

        const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
        forecastUrl.searchParams.set("latitude", String(latitude));
        forecastUrl.searchParams.set("longitude", String(longitude));
        forecastUrl.searchParams.set(
          "daily",
          "precipitation_probability_max,precipitation_sum,temperature_2m_max,temperature_2m_min",
        );
        forecastUrl.searchParams.set("timezone", "America/Lima");
        forecastUrl.searchParams.set("forecast_days", String(FORECAST_HORIZON_DAYS));
        const response = await fetchImpl(forecastUrl);
        if (!response.ok) {
          return unavailable(fetchedAt, query.date, "Open-Meteo no respondió el pronóstico.");
        }
        const payload = (await response.json()) as {
          elevation?: number;
          daily?: {
            time?: string[];
            precipitation_probability_max?: (number | null)[];
            precipitation_sum?: (number | null)[];
            temperature_2m_max?: (number | null)[];
            temperature_2m_min?: (number | null)[];
          };
        };
        const daily = payload.daily ?? {};
        const index = (daily.time ?? []).indexOf(query.date);
        if (index < 0) {
          return unavailable(
            fetchedAt,
            query.date,
            `Open-Meteo no tiene pronóstico para ${query.date}: solo cubre los próximos ${FORECAST_HORIZON_DAYS} días.`,
          );
        }
        const probability = daily.precipitation_probability_max?.[index] ?? null;
        const sum = daily.precipitation_sum?.[index] ?? null;
        const max = daily.temperature_2m_max?.[index] ?? null;
        const min = daily.temperature_2m_min?.[index] ?? null;
        const parts = [
          probability === null ? null : `probabilidad máxima de lluvia ${probability} %`,
          sum === null ? null : `lluvia acumulada estimada ${sum} mm`,
          max === null || min === null ? null : `temperatura entre ${min} y ${max} °C`,
        ].filter(Boolean);
        return {
          available: true,
          source: "Open-Meteo",
          fetchedAt,
          summary: parts.length > 0 ? `${parts.join(", ")}.` : "Pronóstico sin datos de lluvia.",
          precipitationProbabilityMax: probability,
          forDate: query.date,
          precipitationSumMm: sum,
          temperatureMaxC: max,
          temperatureMinC: min,
          region,
          elevationM: elevationM ?? payload.elevation ?? null,
          reason: null,
        };
      } catch {
        return unavailable(fetchedAt, query.date, "Open-Meteo no estuvo disponible.");
      }
    },
  };
}

function unavailable(fetchedAt: string, forDate: string, reason: string): ForecastSnapshot {
  return {
    available: false,
    source: "Open-Meteo",
    fetchedAt,
    summary: null,
    precipitationProbabilityMax: null,
    forDate,
    precipitationSumMm: null,
    temperatureMaxC: null,
    temperatureMinC: null,
    region: null,
    reason,
  };
}
