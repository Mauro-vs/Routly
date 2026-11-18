import { insightsSchema } from "../schemas/insights.schema.js";
import { INSIGHTS_SYSTEM, insightsUserMessage } from "../prompts/insights.prompt.js";
import { aiUnavailable, createError } from "../utils/errors.js";
import { extractJson, shortHash } from "../utils/json.js";
import { createCache } from "./cache.js";
import { departureFacts, experienceFacts, stopsFacts, weatherFacts } from "./facts.js";

const DAY = 24 * 60 * 60 * 1000;

/** Las salidas que se le pasan a la IA (las más próximas). */
const DEPARTURES_FOR_AI = 4;

// Si el tiempo cambia un poco no hace falta volver a escribir los textos: solo si cambian los avisos
// o la temperatura en saltos de 5 grados (para lo que hay que llevar)
const weatherSignature = (weather) =>
  weather?.map((departure) => [departure.avisos, Math.round((departure.minima ?? 0) / 5), Math.round((departure.maxima ?? 0) / 5)]);

/**
 * Los textos IA del detalle: resumen, puntos fuertes, para quién es, qué llevar y preguntas
 * frecuentes. Una sola llamada a la IA, que responde JSON (comprobado con Zod).
 *
 * Se le pasan los datos de la API y, si se pueden conseguir, el tiempo y las paradas (sin ellos
 * escribe igual: el tiempo o OpenStreetMap caídos no dejan la ficha sin textos).
 *
 * Se guardan 24 h por experiencia. La clave lleva un hash de los datos: si alguien cambia la
 * descripción en el panel, la próxima visita los vuelve a escribir. Mil visitas = una llamada a la IA.
 */
export function createInsightsService({ catalog, weather, stops, openRouter, now = Date.now }) {
  const cache = createCache({ ttlMs: DAY, max: 500, now });

  async function generate(facts) {
    const messages = [
      { role: "system", content: INSIGHTS_SYSTEM },
      { role: "user", content: insightsUserMessage(facts) },
    ];
    // Dos intentos: a veces un modelo se deja una clave o se pasa de largo
    for (let attempt = 1; attempt <= 2; attempt++) {
      const answer = await openRouter.complete({ messages, responseFormat: { type: "json_object" }, temperature: 0.5 });
      const parsed = insightsSchema.safeParse(extractJson(answer.content));
      if (parsed.success) return { ...parsed.data, model: answer.model };
      console.warn(`[insights] ${answer.model} answered invalid JSON (attempt ${attempt})`);
    }
    throw createError("The AI returned an invalid answer, please try again later", 502);
  }

  return {
    async forExperience(slug) {
      if (!openRouter.enabled) throw aiUnavailable();

      const [experience, departures] = await Promise.all([catalog.experience(slug), catalog.departures(slug)]);
      // El tiempo y las paradas son un extra: si fallan, se escribe sin ellos
      const [weatherData, stopsData] = await Promise.all([
        weather.forExperience(slug).catch(() => null),
        stops.forExperience(slug).catch(() => null),
      ]);

      const facts = {
        experiencia: experienceFacts(experience),
        salidas: departureFacts(departures.slice(0, DEPARTURES_FOR_AI)),
        tiempo: weatherFacts(weatherData),
        paradas: stopsFacts(stopsData),
      };
      const { tiempo, ...stable } = facts;
      const key = `${slug}:${shortHash({ ...stable, tiempo: weatherSignature(tiempo) })}`;

      return cache.wrap(key, async () => ({
        ...(await generate(facts)),
        generatedAt: new Date(now()).toISOString(),
        basedOn: { weather: Boolean(weatherData), stops: Boolean(stopsData) },
      }));
    },
  };
}
