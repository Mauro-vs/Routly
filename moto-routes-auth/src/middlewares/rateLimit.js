import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { createError } from "../utils/errors.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const limiter = (options) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next) => next(createError("Too many attempts, please try again later", 429)),
    ...options,
  });

/**
 * Los límites de intentos, cada uno con su contador (por app: los tests montan varias).
 *
 * - login por IP: 10 fallos cada 15 min (quien entra bien no gasta intentos).
 * - login por correo: 5 fallos cada 15 min, venga de la IP que venga: frena a quien prueba
 *   contraseñas contra una cuenta desde muchas IP.
 * - register: 10 altas por IP cada 15 min (altas masivas).
 * - refresh: 60 por IP cada 15 min (de sobra para un panel abierto todo el día).
 *
 * Detrás de un proxy hace falta TRUST_PROXY para que la IP sea la del cliente.
 */
export function createLimiters({ enabled }) {
  const skip = () => !enabled;
  return {
    loginByIp: limiter({ limit: 10, skipSuccessfulRequests: true, skip }),
    loginByEmail: limiter({
      limit: 5,
      skipSuccessfulRequests: true,
      skip,
      // Después de validate: el correo ya llega limpio (trim y minúsculas). Sin correo, la IP
      keyGenerator: (req) => (typeof req.body?.email === "string" ? `email:${req.body.email}` : ipKeyGenerator(req.ip)),
    }),
    register: limiter({ limit: 10, skip }),
    refresh: limiter({ limit: 60, skip }),
  };
}
