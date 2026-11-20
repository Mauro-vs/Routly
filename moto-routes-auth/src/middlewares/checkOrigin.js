import { forbidden } from "../utils/errors.js";

// Lo que solo lee no cambia nada: no hace falta comprobar de dónde viene
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// http://localhost:4200, http://127.0.0.1:3002...
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * CSRF: una petición que cambia algo (login, refresh, logout...) desde otra web es un 403. Las
 * cookies son SameSite=strict, y esto es la segunda barrera (como authenticate en la API).
 *
 * Si trae Origin tiene que ser el propio servicio, uno de CORS_ORIGIN o, fuera de producción,
 * cualquier localhost. Sin Origin (Postman, curl, tests) se deja pasar: sin navegador no hay CSRF,
 * y un navegador siempre manda Origin en un POST.
 */
export function createCheckOrigin({ allowedOrigins, isProduction }) {
  const isAllowed = (req) => {
    const origin = req.headers.origin;
    if (!origin) return true;
    // Con TRUST_PROXY, protocolo y host son los que vio el proxy (X-Forwarded-Proto y -Host)
    if (origin === `${req.protocol}://${req.host}`) return true;
    if (allowedOrigins.includes(origin)) return true;
    return !isProduction && LOCAL_ORIGIN.test(origin);
  };

  return function checkOrigin(req, res, next) {
    if (SAFE_METHODS.has(req.method) || isAllowed(req)) return next();
    next(forbidden("Request origin not allowed"));
  };
}
