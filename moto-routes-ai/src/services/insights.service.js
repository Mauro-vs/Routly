import { insightsSchema } from "../schemas/insights.schema.js";
import { INSIGHTS_SYSTEM, insightsUserMessage } from "../prompts/insights.prompt.js";
import { aiUnavailable, createError } from "../utils/errors.js";
import { extractJson, shortHash } from "../utils/json.js";
import { createCache } from "./cache.js";
import { departureFacts, experienceFacts, stopsFacts, weatherFacts } from "./facts.js";

const DAY = 24 * 60 * 60 * 1000;

/** Las salidas que se le pasan a la IA (las más próximas). */
const DEPARTURES_FOR_AI = 4;

/**
 * Cuánto se espera al tiempo y a las paradas antes de escribir. OpenStreetMap puede tardar 20 s o
 * más: no se le espera. La petición sigue y se guarda en su caché, y la web los pide aparte.
 */
export const EXTRAS_BUDGET_MS = 3000;

// Lo que llegue antes del tiempo dado; si no, null (sin cortar la petición, que sigue y se cachea)
function within(promise, ms) {
  let timer;
  const late = new Promise((resolve) => {
    timer = setTimeout(resolve, ms, null);
    timer.unref?.();
  });
  return Promise.race([promise.catch(() => null), late]).finally(() => clearTimeout(timer));
}

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
    // Dos intentos: a veces un modelo se deja una clave. Sin response_format: muchos modelos
    // gratuitos no lo admiten y OpenRouter respondería 404; el prompt ya pide solo JSON
    for (let attempt = 1; attempt <= 2; attempt++) {
      const answer = await openRouter.complete({ messages, temperature: 0.5 });
      const parsed = insightsSchema.safeParse(extractJson(answer.content));
      if (parsed.success) return { ...parsed.data, model: answer.model };
      // Un trozo de lo que ha contestado, para ver qué ha fallado (nunca llega al cliente)
      const preview = String(answer.content ?? "").replace(/\s+/g, " ").slice(0, 160);
      console.warn(`[insights] ${answer.model} answered invalid JSON (attempt ${attempt}): ${preview || "(empty)"}`);
    }
    throw createError("The AI returned an invalid answer, please try again later", 502);
  }

  return {
    async forExperience(slug) {
      if (!openRouter.enabled) throw aiUnavailable();

      const [experience, departures] = await Promise.all([catalog.experience(slug), catalog.departures(slug)]);
      const base = {
        experiencia: experienceFacts(experience),
        salidas: departureFacts(departures.slice(0, DEPARTURES_FOR_AI)),
      };
      // La clave solo depende de la experiencia y sus salidas: que el tiempo o las paradas lleguen o no
      // a tiempo no obliga a volver a escribir. Si ya está escrito, ni se les espera
      const key = `${slug}:${shortHash(base)}`;
      const cached = cache.get(key);
      if (cached) return cached;

      return cache.wrap(key, async () => {
        // El tiempo y las paradas son un extra: si fallan o tardan, se escribe sin ellos
        const [weatherData, stopsData] = await Promise.all([
          within(weather.forExperience(slug), EXTRAS_BUDGET_MS),
          within(stops.forExperience(slug), EXTRAS_BUDGET_MS),
        ]);
        const facts = { ...base, tiempo: weatherFacts(weatherData), paradas: stopsFacts(stopsData) };
        return {
          ...(await generate(facts)),
          generatedAt: new Date(now()).toISOString(),
          basedOn: { weather: Boolean(weatherData), stops: Boolean(stopsData) },
        };
      });
    },
  };
}
