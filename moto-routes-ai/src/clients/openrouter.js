import { aiUnavailable, createError, upstreamError } from "../utils/errors.js";
import { requestJson } from "../utils/http.js";

/*
 * OpenRouter (https://openrouter.ai/docs): una API compatible con la de OpenAI que da acceso a los
 * modelos de muchos proveedores con una sola clave. Se le manda la lista de modelos (AI_MODELS):
 * si el primero falla o no está disponible, OpenRouter prueba el siguiente él solo.
 *
 * Sin SDK: fetch nativo, para no añadir dependencias.
 */
const SERVICE = "OpenRouter";

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

export function createOpenRouterClient({ apiKey, baseUrl, models: wanted, timeoutMs, maxTokens, siteUrl, checkModels = false, fetch: fetchImpl }) {
  // Los modelos de verdad, cuando se ha mirado el catálogo: { models, until }
  let resolved = null;
  let resolving = null;

  async function lookUp() {
    try {
      const { status, body } = await requestJson(fetchImpl, `${baseUrl}/models`, { service: SERVICE, timeoutMs });
      if (status !== 200 || !Array.isArray(body?.data)) throw new Error(`HTTP ${status}`);
      const picked = pickModels(wanted, body.data);
      const gone = wanted.filter((id) => !picked.includes(id));
      if (gone.length > 0) console.warn(`[OpenRouter] not in the catalog anymore: ${gone.join(", ")}`);
      if (picked.length === 0) {
        console.error("[OpenRouter] none of AI_MODELS exists: choose others in https://openrouter.ai/models");
        return { models: wanted, until: Date.now() + CATALOG_RETRY_MS };
      }
      if (gone.length > 0 || picked.length !== wanted.length) console.warn(`[OpenRouter] using: ${picked.join(", ")}`);
      return { models: picked, until: Date.now() + CATALOG_TTL_MS };
    } catch (error) {
      console.warn(`[OpenRouter] could not check the models (${error.message}): using AI_MODELS as they are`);
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
    "http-referer": siteUrl,
    "x-title": "Routly",
  });

  function body(models, { messages, tools, responseFormat, temperature = 0.4, stream = false }) {
    return {
      model: models[0],
      // La lista entera: los de reserva (https://openrouter.ai/docs/features/model-routing)
      ...(models.length > 1 && { models }),
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
    if (status === 429) {
      console.warn("[OpenRouter] HTTP 429: too many requests (free models have a daily limit, it resets every day)");
      return createError("The AI is busy right now, please try again in a moment", 503);
    }
    // Un modelo que ya no existe, o los gratuitos sin activar en https://openrouter.ai/settings/privacy
    if (status === 404) {
      console.error(`[OpenRouter] HTTP 404: check AI_MODELS and, for ":free" models, your privacy settings${detail ? ` (${detail})` : ""}`);
    }
    if (status === 401 || status === 402 || status === 403) {
      console.error(`[OpenRouter] HTTP ${status}: check OPENROUTER_API_KEY and your credits${detail ? ` (${detail})` : ""}`);
    }
    return upstreamError(SERVICE, { status });
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
      const models = await currentModels();
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
      if (response?.error) throw failure(response.error.code ?? 502, response.error.message);

      const message = response?.choices?.[0]?.message;
      if (!message) throw upstreamError(SERVICE, { status });
      return {
        content: message.content ?? null,
        toolCalls: message.tool_calls ?? [],
        model: response.model ?? models[0],
        usage: response.usage ?? null,
      };
    },

    /** Para el chat (fase 4): la petición con streaming, ya lanzada. */
    async openStream(options) {
      if (!apiKey) throw aiUnavailable();
      const models = await currentModels();
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
    },
  };
}
