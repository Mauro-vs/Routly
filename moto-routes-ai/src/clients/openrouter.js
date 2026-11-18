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

export function createOpenRouterClient({ apiKey, baseUrl, models, timeoutMs, maxTokens, siteUrl, fetch: fetchImpl }) {
  const headers = () => ({
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
    // Atribución: OpenRouter enseña la app en sus estadísticas
    "http-referer": siteUrl,
    "x-title": "Routly",
  });

  function body({ messages, tools, responseFormat, temperature = 0.4, stream = false }) {
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
      const { status, body: response } = await requestJson(fetchImpl, `${baseUrl}/chat/completions`, {
        service: SERVICE,
        timeoutMs,
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body(options)),
        signal: options.signal,
      });
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
      const timeout = AbortSignal.timeout(timeoutMs);
      let response;
      try {
        response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { ...headers(), accept: "text/event-stream" },
          body: JSON.stringify(body({ ...options, stream: true })),
          signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
        });
      } catch (error) {
        if (options.signal?.aborted) throw error;
        throw upstreamError(SERVICE, { timeout: timeout.aborted, cause: error });
      }
      if (!response.ok) {
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
