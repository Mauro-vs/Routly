// Los errores con código HTTP, con el mismo formato que los de la API (utils/errors.js de la API)

export function createError(message, status, extra = {}) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
}

export function notFound(resource) {
  return createError(`${resource} not found`, 404);
}

/** 503: falta la clave de OpenRouter, así que lo que usa IA no está disponible. */
export function aiUnavailable() {
  return createError("AI is not configured on this server", 503);
}

/**
 * 502 o 504: un servicio del que dependemos (la API de Routly, OpenRouter, Open-Meteo,
 * OpenStreetMap) ha fallado o no ha respondido a tiempo. service dice cuál, para los logs.
 */
export function upstreamError(service, { timeout = false, status, cause } = {}) {
  const message = timeout ? `${service} did not respond in time` : `${service} is not available right now`;
  return createError(message, timeout ? 504 : 502, { service, upstreamStatus: status, cause });
}
