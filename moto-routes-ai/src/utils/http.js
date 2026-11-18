import { upstreamError } from "./errors.js";

/**
 * Una petición a otro servicio que responde JSON, con tiempo máximo de espera. fetch se recibe
 * de fuera para que los tests lo sustituyan por uno falso (sin red).
 *
 * Devuelve { status, body }. Un fallo de red o un tiempo agotado lanza upstreamError (502 o 504);
 * una respuesta 4xx o 5xx se devuelve tal cual y decide quien llama (un 404 de la API es "no
 * existe", no un fallo).
 */
export async function requestJson(fetchImpl, url, { service, timeoutMs, signal, ...init } = {}) {
  const timeout = AbortSignal.timeout(timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, {
      ...init,
      headers: { accept: "application/json", ...init.headers },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    // El cliente se ha ido (signal): no es un fallo del servicio
    if (signal?.aborted) throw error;
    throw upstreamError(service, { timeout: timeout.aborted, cause: error });
  }

  let body = null;
  try {
    body = await response.json();
  } catch (error) {
    if (response.ok) throw upstreamError(service, { status: response.status, cause: error });
  }
  return { status: response.status, body };
}
