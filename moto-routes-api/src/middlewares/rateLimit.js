import { rateLimit } from "express-rate-limit";
import { createError } from "../utils/errors.js";

/**
 * Límite de intentos por IP para el login y el registro: frena los ataques de
 * fuerza bruta. Al pasarse, 429 con el formato de error de siempre.
 *
 * Detrás de un proxy (Nginx, un PaaS) hay que activar app.set("trust proxy", 1) para que
 * req.ip sea la IP del cliente y no la del proxy.
 */
export function createAuthLimiter({ limit = 10, windowMs = 15 * 60 * 1000, skip } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Los tests de integración hacen muchos logins seguidos desde la misma IP
    skip: skip ?? (() => process.env.NODE_ENV === "test"),
    handler: (req, res, next) => {
      next(createError("Too many attempts, please try again later", 429));
    },
  });
}

export const authLimiter = createAuthLimiter();
