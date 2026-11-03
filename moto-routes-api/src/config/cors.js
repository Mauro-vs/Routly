import cors from "cors";

const isProduction = process.env.NODE_ENV === "production";

// En producción solo se aceptan los orígenes de CORS_ORIGIN (separados por comas).
// Si no se define, no se acepta ningún origen externo.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// En desarrollo el panel llama a /api a través del proxy de Angular (mismo origen), así
// que no hacen falta credenciales cruzadas. En producción, si el panel está en otro
// origen, credentials: true deja que el navegador mande la cookie de sesión.
export const corsMiddleware = cors({
  origin: isProduction ? allowedOrigins : "*",
  methods: ["GET", "POST", "PATCH"],
  credentials: isProduction,
});

// http://localhost:4200, http://127.0.0.1:3000...
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Para la comprobación CSRF de authenticate: si una petición que cambia datos trae
 * cabecera Origin, tiene que ser la propia API, uno de CORS_ORIGIN o, fuera de
 * producción, cualquier localhost. Sin Origin (Postman, curl, tests) no se puede saber
 * de dónde viene y se deja pasar: SameSite=Strict ya impide que otra web mande la cookie.
 */
export function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  // Con TRUST_PROXY, protocolo y host son los que vio el proxy (X-Forwarded-Proto y -Host)
  if (origin === `${req.protocol}://${req.host}`) return true;
  if (allowedOrigins.includes(origin)) return true;
  return !isProduction && LOCAL_ORIGIN.test(origin);
}
