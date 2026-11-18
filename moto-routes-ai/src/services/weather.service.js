import { FORECAST_DAYS } from "../clients/weather.js";
import { pointKey } from "../utils/geo.js";
import { notFound } from "../utils/errors.js";
import { createCache } from "./cache.js";
import { describeWeather, warningsOf } from "./weatherCodes.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Cuántas salidas se miran (las más próximas) y cuántos días de cada una como mucho. */
export const WEATHER_LIMITS = Object.freeze({ departures: 4, daysPerDeparture: 7 });

// La fecha (YYYY-MM-DD) de un instante en la zona horaria del lugar
const localDate = (instant, timeZone) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));

// Los días entre dos fechas YYYY-MM-DD, las dos incluidas, como mucho max
function datesBetween(start, end, max) {
  const dates = [];
  for (let time = Date.parse(start); time <= Date.parse(end) && dates.length < max; time += DAY) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }
  return dates;
}

// La misma fecha un año antes (el 29 de febrero pasa a ser el 28)
function yearBefore(date) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year - 1, month - 1, day));
  if (shifted.getUTCMonth() !== month - 1) shifted.setUTCDate(0);
  return shifted.toISOString().slice(0, 10);
}

const presentDay = (day) => {
  const { label, icon } = describeWeather(day.code);
  return { ...day, label, icon, warnings: warningsOf(day) };
};

/**
 * El tiempo de las fechas de salida de una experiencia, en su punto de salida. No usa IA: son datos
 * de Open-Meteo.
 *
 * - Una salida dentro de los próximos 16 días: la previsión de cada uno de sus días (kind "forecast").
 * - Una más lejana: lo que hizo esos mismos días el año pasado, como referencia (kind "reference").
 *
 * La previsión se guarda 1 hora y el histórico 7 días, por punto (redondeado a ~1 km).
 */
export function createWeatherService({ catalog, places, weather, now = Date.now }) {
  const forecasts = createCache({ ttlMs: HOUR, max: 500, now });
  const archives = createCache({ ttlMs: 7 * DAY, max: 2000, now });

  async function departureWeather(point, forecast, departure) {
    const start = localDate(departure.startAt, forecast.timezone);
    const end = localDate(departure.endAt ?? departure.startAt, forecast.timezone);
    const dates = datesBetween(start, end, WEATHER_LIMITS.daysPerDeparture);
    const byDate = new Map(forecast.days.map((day) => [day.date, day]));
    const base = { slug: departure.slug ?? null, startAt: departure.startAt, endAt: departure.endAt ?? null };

    if (dates.every((date) => byDate.has(date))) {
      return { ...base, kind: "forecast", days: dates.map((date) => presentDay(byDate.get(date))) };
    }

    const from = yearBefore(dates[0]);
    const to = yearBefore(dates.at(-1));
    const archive = await archives.wrap(`${pointKey(point)}:${from}:${to}`, () => weather.archive(point, from, to));
    // El año pasado, con la fecha de este año para que la web lo enseñe en su día
    const days = archive.days.map((day, index) => presentDay({ ...day, date: dates[index] ?? day.date, rainChance: null }));
    return { ...base, kind: "reference", referenceYear: Number(from.slice(0, 4)), days };
  }

  return {
    async forExperience(slug) {
      const [experience, departures] = await Promise.all([catalog.experience(slug), catalog.departures(slug)]);
      const place = await places.resolve(experience.route?.startLocation);
      if (!place) throw notFound("Experience location");

      const forecast = await forecasts.wrap(pointKey(place), () => weather.forecast(place));
      const upcoming = departures
        .filter((departure) => Date.parse(departure.endAt ?? departure.startAt) >= now())
        .slice(0, WEATHER_LIMITS.departures);

      return {
        place,
        timezone: forecast.timezone,
        forecastDays: FORECAST_DAYS,
        departures: await Promise.all(upcoming.map((departure) => departureWeather(place, forecast, departure))),
        source: { name: "Open-Meteo", url: "https://open-meteo.com" },
      };
    },
  };
}
