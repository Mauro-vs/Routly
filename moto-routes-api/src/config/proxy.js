/*
 * Cuántos proxies hay delante de la API (Nginx, Caddy, el de un PaaS). Con HTTPS casi
 * siempre hay uno: termina el HTTPS y le pasa a Express la petición por HTTP, con la IP, el
 * protocolo y el host originales en las cabeceras X-Forwarded-*.
 *
 * Sin confiar en él, Express ve la IP del proxy (el límite de intentos del login contaría a
 * todos los clientes como uno solo) y "http" (la comprobación del Origin compararía mal).
 * Confiar sin que haya proxy es peor: cualquiera podría inventarse X-Forwarded-For y
 * saltarse ese límite. Por eso el valor por defecto es 0, también en producción.
 */
const DEFAULT_TRUST_PROXY = 0;

/** Lee y comprueba TRUST_PROXY: un número entero de proxies, 0 o más. */
export function trustProxyFrom(env = process.env) {
  const raw = env.TRUST_PROXY?.trim();
  if (!raw) return DEFAULT_TRUST_PROXY;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`TRUST_PROXY has an invalid value: "${raw}" (use the number of proxies, e.g. 0 or 1)`);
  }
  return Number(raw);
}

/** Configura Express para que confíe en esos proxies. La usan server.js y los tests. */
export function applyTrustProxy(app, env = process.env) {
  const hops = trustProxyFrom(env);
  app.set("trust proxy", hops === 0 ? false : hops);
}
