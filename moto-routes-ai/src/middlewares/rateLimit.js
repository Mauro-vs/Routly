import { rateLimit } from "express-rate-limit";
import { createError } from "../utils/errors.js";

/**
 * Límite de peticiones por IP. Aquí no protege contraseñas sino la factura de OpenRouter (y el uso
 * justo de Open-Meteo y OpenStreetMap). Al pasarse, 429 con el formato de error de siempre.
 * Detrás de un proxy hace falta TRUST_PROXY para que la IP sea la del cliente.
 */
export function createLimiter({ limit, windowMs, skip = () => process.env.NODE_ENV === "test" }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip,
    handler: (req, res, next) => next(createError("Too many requests, please try again later", 429)),
  });
}
