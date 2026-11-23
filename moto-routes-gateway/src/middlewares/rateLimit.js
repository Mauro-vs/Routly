import { rateLimit } from "express-rate-limit";
import { sendError } from "./errorHandler.js";

/**
 * Un límite de peticiones por IP (la de la conexión: la gateway es el borde). Al pasarse, 429 con
 * el formato común y Retry-After en segundos. En memoria: vale para una sola gateway.
 */
export function createLimiter({ name, limit, windowMs }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Cada límite cuenta aparte, aunque compartan IP
    identifier: name,
    handler(req, res) {
      req.blockedBy = `rate limit (${name})`;
      const seconds = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
      res.setHeader("retry-after", String(seconds));
      sendError(res, 429, "Too many requests, please try again later");
    },
  });
}

// Lo que cuesta cuota de la IA: escribir los textos y el chat. El resto de /ai (tiempo, paradas,
// mapa) va con el límite general
export const isCostlyAi = (req) =>
  (req.method === "POST" && /^\/ai\/chat\/?$/.test(req.path)) ||
  (req.method === "GET" && /^\/ai\/experiences\/[^/]+\/insights\/?$/.test(req.path));
