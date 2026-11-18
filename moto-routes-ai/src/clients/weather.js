import { upstreamError } from "../utils/errors.js";
import { requestJson } from "../utils/http.js";

/*
 * Open-Meteo (https://open-meteo.com): previsión, histórico y geocodificador. Gratis y sin clave
 * para uso no comercial, como este proyecto. Todas las fechas, en la hora local del lugar
 * (timezone=auto).
 */
const SERVICE = "Open-Meteo";
export const OPEN_METEO = Object.freeze({
  forecast: "https://api.open-meteo.com/v1/forecast",
  archive: "https://archive-api.open-meteo.com/v1/archive",
  geocoding: "https://geocoding-api.open-meteo.com/v1/search",
});

/** Cuántos días de previsión da Open-Meteo como mucho. */
export const FORECAST_DAYS = 16;

const DAILY = ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum", "wind_speed_10m_max"];

export function createWeatherClient({ fetch: fetchImpl, timeoutMs, urls = OPEN_METEO }) {
  async function get(base, params) {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const { status, body } = await requestJson(fetchImpl, url, { service: SERVICE, timeoutMs });
    if (status !== 200 || !body) throw upstreamError(SERVICE, { status });
    return body;
  }

  // Los arrays de daily ({ time: [...], weather_code: [...] }) como un objeto por día
  const toDays = ({ daily = {} }) =>
    (daily.time ?? []).map((date, index) => ({
      date,
      code: daily.weather_code?.[index] ?? null,
      max: daily.temperature_2m_max?.[index] ?? null,
      min: daily.temperature_2m_min?.[index] ?? null,
      precipitation: daily.precipitation_sum?.[index] ?? null,
      rainChance: daily.precipitation_probability_max?.[index] ?? null,
      wind: daily.wind_speed_10m_max?.[index] ?? null,
    }));

  return {
    /** La previsión de los próximos 16 días: { timezone, days }. */
    async forecast({ latitude, longitude }) {
      const body = await get(urls.forecast, {
        latitude,
        longitude,
        daily: [...DAILY, "precipitation_probability_max"].join(","),
        timezone: "auto",
        forecast_days: FORECAST_DAYS,
      });
      return { timezone: body.timezone ?? "UTC", days: toDays(body) };
    },

    /** Lo que hizo entre dos fechas (YYYY-MM-DD) ya pasadas: { timezone, days }. */
    async archive({ latitude, longitude }, startDate, endDate) {
      const body = await get(urls.archive, {
        latitude,
        longitude,
        start_date: startDate,
        end_date: endDate,
        daily: DAILY.join(","),
        timezone: "auto",
      });
      return { timezone: body.timezone ?? "UTC", days: toDays(body) };
    },

    /** Las coordenadas de una ciudad, o null. Prefiere la del país y la región que se le dan. */
    async geocode({ city, region, country }) {
      const body = await get(urls.geocoding, { name: city, count: 10, language: "es", format: "json" });
      const results = body.results ?? [];
      const same = (a, b) => Boolean(a && b) && a.localeCompare(b, "es", { sensitivity: "base" }) === 0;
      const best =
        results.find((result) => same(result.country, country) && same(result.admin1, region)) ??
        results.find((result) => same(result.country, country)) ??
        results[0];
      return best ? { latitude: best.latitude, longitude: best.longitude } : null;
    },
  };
}
