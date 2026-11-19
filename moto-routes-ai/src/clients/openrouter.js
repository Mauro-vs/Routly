import { aiUnavailable, createError, upstreamError } from "../utils/errors.js";
import { requestJson } from "../utils/http.js";

/*
 * El cliente de la IA. Vale para cualquier API compatible con la de OpenAI (/chat/completions):
 * Groq, Gemini (Google AI Studio) u OpenRouter (AI_PROVIDER en el .env).
 *
 * Los modelos de reserva (AI_MODELS): a OpenRouter se le manda la lista entera y prueba el siguiente
 * él solo; con los demás lo hace este cliente, que pasa al siguiente si uno está saturado (429), ya
 * no existe (404) o falla (5xx o sin respuesta).
 *
 * Sin SDK: fetch nativo, para no añadir dependencias.
 */

/** Cuántos modelos se mandan como mucho (el principal y los de reserva) */
const MAX_MODELS = 3;
/** Cada cuánto se vuelve a mirar el catálogo; si falla, se reintenta antes */
const CATALOG_TTL_MS = 6 * 60 * 60 * 1000;
const CATALOG_RETRY_MS = 5 * 60 * 1000;

const isFree = (model) => model.id.endsWith(":free") || (model.pricing?.prompt === "0" && model.pricing?.completion === "0");
const hasTools = (model) => (model.supported_parameters ?? []).includes("tools");

/**
 * Los modelos que se van a usar, comprobados con el catálogo de OpenRouter (GET /models):
 * - los de AI_MODELS que existen, en su orden;
 * - si eran todos gratuitos y falta alguno, se completa con otros gratuitos con herramientas (los
 *   de más contexto primero): los gratuitos se retiran a menudo y así no hay que tocar el .env.
 * Exportada para los tests.
 */
export function pickModels(wanted, catalog) {
  const byId = new Map(catalog.map((model) => [model.id, model]));
  const kept = wanted.filter((id) => byId.has(id));
  const allFree = wanted.every((id) => id.endsWith(":free"));
  if (!allFree || kept.length >= Math.min(wanted.length, MAX_MODELS)) return kept.slice(0, MAX_MODELS);
  const extra = catalog
    .filter((model) => isFree(model) && hasTools(model) && !model.id.startsWith("openrouter/") && !kept.includes(model.id))
    .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
    .map((model) => model.id);
  return [...kept, ...extra].slice(0, MAX_MODELS);
}

// Los fallos en los que tiene sentido probar con el modelo de reserva
const tryNext = (status) => status === 404 || status === 408 || status === 429 || status >= 500;

export function createOpenRouterClient({
  provider = "openrouter",
  label: SERVICE = "OpenRouter",
  apiKey,
  baseUrl,
  models: wanted,
  timeoutMs,
  maxTokens,
  siteUrl,
  checkModels = false,
  fetch: fetchImpl,
}) {
  const isOpenRouter = provider === "openrouter";
  // Los modelos de verdad, cuando se ha mirado el catálogo: { models, until }
  let resolved = null;
  let resolving = null;

  async function lookUp() {
    try {
      const { status, body } = await requestJson(fetchImpl, `${baseUrl}/models`, { service: SERVICE, timeoutMs });
      if (status !== 200 || !Array.isArray(body?.data)) throw new Error(`HTTP ${status}`);
      const picked = pickModels(wanted, body.data);
      const gone = wanted.filter((id) => !picked.includes(id));
      if (gone.length > 0) console.warn(`[${SERVICE}] not in the catalog anymore: ${gone.join(", ")}`);
      if (picked.length === 0) {
        console.error(`[${SERVICE}] none of AI_MODELS exists: choose others in https://openrouter.ai/models`);
        return { models: wanted, until: Date.now() + CATALOG_RETRY_MS };
      }
      if (gone.length > 0 || picked.length !== wanted.length) console.warn(`[${SERVICE}] using: ${picked.join(", ")}`);
      return { models: picked, until: Date.now() + CATALOG_TTL_MS };
    } catch (error) {
      console.warn(`[${SERVICE}] could not check the models (${error.message}): using AI_MODELS as they are`);
      return { models: wanted, until: Date.now() + CATALOG_RETRY_MS };
    }
  }

  async function currentModels() {
    if (!checkModels) return wanted;
    if (resolved && resolved.until > Date.now()) return resolved.models;
    resolving ??= lookUp().then((result) => {
      resolved = result;
      resolving = null;
      return result;
    });
    return (await resolving).models;
  }

  // Un 404 suele ser un modelo retirado: la próxima vez se vuelve a mirar el catálogo
  const forget = (status) => {
    if (status === 404) resolved = null;
  };

  const headers = () => ({
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
    // Atribución: OpenRouter enseña la app en sus estadísticas
    ...(isOpenRouter && { "http-referer": siteUrl, "x-title": "Routly" }),
  });

  // Los intentos de una petición: con OpenRouter, uno con toda la lista; con los demás, uno por modelo
  const attempts = (models) => (isOpenRouter ? [models] : models.map((model) => [model]));

  function body(models, { messages, tools, responseFormat, temperature = 0.4, stream = false }) {
    return {
      model: models[0],
      // La lista entera: los de reserva (https://openrouter.ai/docs/features/model-routing)
      ...(isOpenRouter && models.length > 1 && { models }),
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(tools?.length && { tools }),
      ...(responseFormat && { response_format: responseFormat }),
      ...(stream && { stream: true }),
    };
  }

  // Un fallo de OpenRouter: sin crédito o con la clave mal, es un error de configuración nuestro;
  // saturado (429), que se intente más tarde. Nunca se devuelve su mensaje tal cual al cliente
  function failure(status, detail) {
    const why = detail ? ` (${detail})` : "";
    if (status === 429) {
      console.warn(`[${SERVICE}] HTTP 429: too many requests (free plans have a limit per minute and per day)${why}`);
      return Object.assign(createError("The AI is busy right now, please try again in a moment", 503), { upstreamStatus: 429 });
    }
    // Un modelo que ya no existe, o (OpenRouter) los gratuitos sin activar en su privacidad
    if (status === 404) console.error(`[${SERVICE}] HTTP 404: check AI_MODELS${isOpenRouter ? ' and, for ":free" models, your privacy settings' : ""}${why}`);
    if (status === 401 || status === 402 || status === 403) console.error(`[${SERVICE}] HTTP ${status}: check AI_API_KEY${why}`);
    if (status >= 500) console.error(`[${SERVICE}] HTTP ${status}${why}`);
    return Object.assign(upstreamError(SERVICE, { status }), { upstreamStatus: status });
  }

  // Prueba los intentos en orden: si uno falla con algo que el siguiente modelo puede arreglar, sigue
  async function withFallback(models, run) {
    let lastError;
    for (const attempt of attempts(models)) {
      try {
        return await run(attempt);
      } catch (error) {
        const status = error.upstreamStatus ?? (error.status === 504 ? 408 : null);
        if (status === null || !tryNext(status)) throw error;
        lastError = error;
      }
    }
    throw lastError;
  }

  return {
    get enabled() {
      return Boolean(apiKey);
    },

    /**
     * Una respuesta entera (sin streaming). Devuelve { content, toolCalls, model, usage }:
     * content es el texto (o null si el modelo pide herramientas) y model, el que ha respondido.
     */
    async complete(options) {
      if (!apiKey) throw aiUnavailable();
      return withFallback(await currentModels(), async (models) => {
        const { status, body: response } = await requestJson(fetchImpl, `${baseUrl}/chat/completions`, {
          service: SERVICE,
          timeoutMs,
          method: "POST",
          headers: headers(),
          body: JSON.stringify(body(models, options)),
          signal: options.signal,
        });
        forget(status);
        if (status !== 200) throw failure(status, response?.error?.message);
        // OpenRouter puede responder 200 con un error dentro (el proveedor falló a mitad)
        if (response?.error) throw failure(Number(response.error.code) || 502, response.error.message);

        const message = response?.choices?.[0]?.message;
        // Un 200 sin respuesta dentro: como un fallo del proveedor (se prueba el siguiente)
        if (!message) throw failure(502, "empty answer");
        // Se ha quedado sin tokens (los modelos que "piensan" se los gastan en razonar): la respuesta
        // llega cortada o vacía. Se avisa para saber que hay que subir AI_MAX_TOKENS o cambiar de modelo
        if (response.choices[0].finish_reason === "length") {
          console.warn(`[${SERVICE}] ${response.model ?? models[0]} ran out of tokens (AI_MAX_TOKENS=${maxTokens})`);
        }
        return {
          content: message.content ?? null,
          toolCalls: message.tool_calls ?? [],
          model: response.model ?? models[0],
          usage: response.usage ?? null,
        };
      });
    },

    /** Para el chat (fase 4): la petición con streaming, ya lanzada. */
    async openStream(options) {
      if (!apiKey) throw aiUnavailable();
      return withFallback(await currentModels(), async (models) => {
        const timeout = AbortSignal.timeout(timeoutMs);
        let response;
        try {
          response = await fetchImpl(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: { ...headers(), accept: "text/event-stream" },
            body: JSON.stringify(body(models, { ...options, stream: true })),
            signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
          });
        } catch (error) {
          if (options.signal?.aborted) throw error;
          throw upstreamError(SERVICE, { timeout: timeout.aborted, cause: error });
        }
        if (!response.ok) {
          forget(response.status);
          let detail;
          try {
            detail = (await response.json())?.error?.message;
          } catch {
            // Sin cuerpo JSON
          }
          throw failure(response.status, detail);
        }
        return response;
      });
    },
  };
}
